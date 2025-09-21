// Uses a single database connection for simplicity. In production, consider using a connection pool.
package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"mime"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"regexp"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/time/rate"
)

// sanitizeCloudinaryURL takes a full SDK URL and converts it to the simple, direct format.
// This is the key insight you discovered.
func sanitizeCloudinaryURL(url string) string {
    // This regex finds the /<resource_type>/<delivery_type>/ segment
    // (e.g., /image/upload/, /raw/upload/, /video/private/)
    re := regexp.MustCompile(`/(image|video|raw)/(upload|private|authenticated)/`)
    // And replaces it with a single "/", effectively removing it.
    return re.ReplaceAllString(url, "/")
}

var pool *pgxpool.Pool
var cld *cloudinary.Cloudinary
var jwtSecret []byte

// NEW: AppConfig struct to hold all configurable values
type AppConfig struct {
	DatabaseURL     string
	RateRPS         float64
	RateBurst       int
	MaxStorageBytes int64
}

var appConfig AppConfig

var (
	mu           sync.Mutex
	userLimiters = make(map[int]*rate.Limiter)
)

type contextKey string

const userContextKey = contextKey("user")

type AuthenticatedUser struct {
	ID   int
	Role string
}

type Claims struct {
	UserID int    `json:"userId"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// UPDATED: initConfig now loads all settings from .env
func initConfig() {
	_ = godotenv.Load()

	// JWT Secret
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Fatal("FATAL: JWT_SECRET environment variable not set")
	}
	jwtSecret = []byte(secret)

	// Database URL
	appConfig.DatabaseURL = os.Getenv("DATABASE_URL")
	if appConfig.DatabaseURL == "" {
		log.Fatal("FATAL: DATABASE_URL environment variable not set")
	}

	// Rate Limiter Config
	rps, err := strconv.ParseFloat(os.Getenv("RATE_RPS"), 64)
	if err != nil {
		rps = 2 // default
	}
	appConfig.RateRPS = rps

	burst, err := strconv.Atoi(os.Getenv("RATE_BURST"))
	if err != nil {
		burst = 4 // default
	}
	appConfig.RateBurst = burst

	// Storage Quota Config
	quota, err := strconv.ParseInt(os.Getenv("MAX_STORAGE_BYTES"), 10, 64)
	if err != nil {
		quota = 10 * 1024 * 1024 // default 10MB
	}
	appConfig.MaxStorageBytes = quota

	fmt.Println("Configuration loaded successfully.")
}

func initMimeTypes() {
    // --- Documents ---
    // Modern Microsoft Office
    mime.AddExtensionType(".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    mime.AddExtensionType(".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    mime.AddExtensionType(".pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation")
    // Older Microsoft Office
    mime.AddExtensionType(".doc", "application/msword")
    mime.AddExtensionType(".xls", "application/vnd.ms-excel")
    mime.AddExtensionType(".ppt", "application/vnd.ms-powerpoint")
    // Other Common Documents
    mime.AddExtensionType(".pdf", "application/pdf")
    mime.AddExtensionType(".rtf", "application/rtf")
    mime.AddExtensionType(".txt", "text/plain; charset=utf-8")

    // --- Archives ---
    mime.AddExtensionType(".zip", "application/zip")
    mime.AddExtensionType(".rar", "application/vnd.rar")
    mime.AddExtensionType(".7z", "application/x-7z-compressed")
    mime.AddExtensionType(".tar", "application/x-tar")
    mime.AddExtensionType(".gz", "application/gzip")
    
    // --- Common Media Types ---
    // Audio
    mime.AddExtensionType(".mp3", "audio/mpeg")
    mime.AddExtensionType(".wav", "audio/wav")
    mime.AddExtensionType(".ogg", "audio/ogg")
    // Video
    mime.AddExtensionType(".mp4", "video/mp4")
    mime.AddExtensionType(".webm", "video/webm")
    mime.AddExtensionType(".mov", "video/quicktime")
    mime.AddExtensionType(".mkv", "video/x-matroska")
    // Images
    mime.AddExtensionType(".svg", "image/svg+xml")
    mime.AddExtensionType(".webp", "image/webp")

    // --- Data Formats ---
    mime.AddExtensionType(".json", "application/json")
    mime.AddExtensionType(".csv", "text/csv")
    mime.AddExtensionType(".xml", "application/xml")

    fmt.Println("Custom MIME types registered successfully.")
}

// func initDB() {
//     var err error

//     // --- START OF CHANGE ---

//     // 1. Parse the original database URL from the environment variable.
//     config, err := pgxpool.ParseConfig(appConfig.DatabaseURL)
//     if err != nil {
//         log.Fatalf("Unable to parse database URL: %v", err)
//     }

//     // 2. This is the crucial fix. It tells pgx not to use its own prepared statement cache
//     //    and to rely on the server's, which is compatible with pgBouncer.
//     config.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeDescribeExec

//     // 3. Create the connection pool using the modified configuration.
//     pool, err = pgxpool.NewWithConfig(context.Background(), config)
//     if err != nil {
//         log.Fatalf("Unable to create connection pool: %v", err)
//     }

//     fmt.Println("Database connection pool created successfully!")
// }


func initDB() {
    var err error

    config, err := pgxpool.ParseConfig(appConfig.DatabaseURL)
    if err != nil {
        log.Fatalf("Unable to parse database URL: %v", err)
    }

    // THIS IS THE FIX:
    // Switch to the simple protocol which is more robust with pgBouncer.
    // It avoids server-side prepared statements, preventing the "unnamed prepared statement" error.
    config.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

    pool, err = pgxpool.NewWithConfig(context.Background(), config)
    if err != nil {
        log.Fatalf("Unable to create connection pool: %v", err)
    }

    fmt.Println("Database connection pool created successfully!")
}

// initCloudinary is unchanged
func initCloudinary() {
	cldName := os.Getenv("CLOUDINARY_CLOUD_NAME")
	apiKey := os.Getenv("CLOUDINARY_API_KEY")
	apiSecret := os.Getenv("CLOUDINARY_API_SECRET")

	if cldName == "" || apiKey == "" || apiSecret == "" {
		log.Fatal("FATAL: Cloudinary environment variables not set")
	}
	var err error
	cld, err = cloudinary.NewFromParams(cldName, apiKey, apiSecret)
	if err != nil {
		log.Fatalf("Failed to initialize Cloudinary: %v", err)
	}
	fmt.Println("Cloudinary client initialized successfully!")
}

func ensureFilesSchema() error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, password_hash TEXT NOT NULL, name VARCHAR(100) NOT NULL, role VARCHAR(20) DEFAULT 'user' NOT NULL, last_login TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW())`,
		`CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users (username)`,
		`CREATE TABLE IF NOT EXISTS physical_files (id SERIAL PRIMARY KEY, hash CHAR(64) UNIQUE NOT NULL, storage_url TEXT NOT NULL, public_id TEXT NOT NULL, size BIGINT NOT NULL, mime_type VARCHAR(100) NOT NULL, ref_count INT DEFAULT 1 NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())`,
		`CREATE TABLE IF NOT EXISTS user_files (id SERIAL PRIMARY KEY, owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, physical_file_id INT NOT NULL REFERENCES physical_files(id) ON DELETE RESTRICT, filename VARCHAR(255) NOT NULL, is_public BOOLEAN DEFAULT FALSE NOT NULL, download_count INT DEFAULT 0 NOT NULL, uploaded_at TIMESTAMPTZ DEFAULT NOW())`,
		`CREATE TABLE IF NOT EXISTS file_shares (id SERIAL PRIMARY KEY, user_file_id INT NOT NULL REFERENCES user_files(id) ON DELETE CASCADE, recipient_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, shared_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_file_id, recipient_id))`,
		`CREATE TABLE IF NOT EXISTS audit_logs (id BIGSERIAL PRIMARY KEY, user_id INT REFERENCES users(id) ON DELETE SET NULL, action VARCHAR(50) NOT NULL, details JSONB, created_at TIMESTAMPTZ DEFAULT NOW())`,
		
        // THE FIX: This command safely adds the column if it's missing and does nothing otherwise.
		
		`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_id INT`,
		`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB`,

		`CREATE INDEX IF NOT EXISTS user_files_owner_id_idx ON user_files(owner_id)`,
		`CREATE INDEX IF NOT EXISTS physical_files_hash_idx ON physical_files(hash)`,
		`CREATE INDEX IF NOT EXISTS file_shares_recipient_id_idx ON file_shares(recipient_id)`,
		`CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs(user_id)`,
		`CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action)`,
	}

	for _, s := range stmts {
		if _, err := pool.Exec(context.Background(), s); err != nil {
			return fmt.Errorf("failed to execute schema statement: %w", err)
		}
	}
	return nil
}

// logAuditEvent helper is unchanged
// func logAuditEvent(userID, targetID int, action string, details map[string]interface{}) {
// 	// ... (implementation is unchanged and correct)
// 	go func() {
// 		detailsJSON, err := json.Marshal(details)
// 		if err != nil {
// 			log.Printf("ERROR: Failed to marshal audit log details: %v", err)
// 			return
// 		}
// 		var userIDArg interface{}
// 		if userID != 0 {
// 			userIDArg = userID
// 		} else {
// 			userIDArg = nil
// 		}
// 		_, err = pool.Exec(context.Background(), `INSERT INTO audit_logs (user_id, action, target_id, details) VALUES ($1, $2, $3, $4)`, userIDArg, action, targetID, detailsJSON)
// 		if err != nil {
// 			log.Printf("ERROR: Failed to write audit log event: %v", err)
// 		}
// 	}()
// }

// in main.go

// in main.go

func logAuditEvent(userID, targetID int, action string, details map[string]interface{}) {
	go func() {
		var detailsArg interface{}
		var err error

		// 1. Check if the details map is actually provided.
		if details != nil {
			var detailsJSON []byte
			detailsJSON, err = json.Marshal(details)
			if err != nil {
				log.Printf("ERROR: Failed to marshal audit log details: %v", err)
				return
			}
			// --- THIS IS THE FINAL FIX ---
			// 2. Convert the byte slice to a string before sending it.
			//    This ensures it's correctly interpreted by PostgreSQL as a JSON literal.
			detailsArg = string(detailsJSON)
		} else {
			// 3. If details are nil, pass a proper SQL NULL.
			detailsArg = nil
		}

		var userIDArg interface{}
		if userID != 0 {
			userIDArg = userID
		} else {
			userIDArg = nil
		}

		// The query remains the same.
		_, err = pool.Exec(context.Background(), `INSERT INTO audit_logs (user_id, action, target_id, details) VALUES ($1, $2, $3, $4)`, userIDArg, action, targetID, detailsArg)
		if err != nil {
			log.Printf("ERROR: Failed to write audit log event: %v", err)
		}
	}()
}

// writeJSON and writeError helpers are unchanged
func writeJSON(w http.ResponseWriter, status int, body interface{}) {
	// ... (implementation is unchanged and correct)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func getResourceTypeFromMIME(mimeType string) string {
    if strings.HasPrefix(mimeType, "image/") {
        return "image"
    }
    if strings.HasPrefix(mimeType, "video/") {
        return "video"
    }
    return "raw" // Default for PDFs, ZIPs, etc.
}

func writeError(w http.ResponseWriter, status int, message string) {
	// ... (implementation is unchanged and correct)
	writeJSON(w, status, map[string]string{"error": message})
}

// --- AUTHENTICATION & AUTHORIZATION ---

type AuthRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// verifyCredentialsAndGetUser is unchanged
func verifyCredentialsAndGetUser(username, password string) (*AuthenticatedUser, error) {
	// ... (implementation is unchanged and correct)
	user := &AuthenticatedUser{}
	var storedHash string
	err := pool.QueryRow(context.Background(), `SELECT id, password_hash, role FROM users WHERE username = $1`, username).Scan(&user.ID, &storedHash, &user.Role)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(password)); err != nil {
		return nil, errors.New("invalid credentials")
	}
	return user, nil
}


func authMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // --- START OF CHANGE ---
        
        // 1. First, try to get the token from the Authorization header.
        tokenString := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")

        // 2. If the header is empty, try to get it from a URL query parameter.
        if tokenString == "" {
            tokenString = r.URL.Query().Get("token")
        }
        
        // --- END OF CHANGE ---

        if tokenString == "" {
            writeError(w, http.StatusUnauthorized, "Authorization token required")
            return
        }

        claims := &Claims{}
        token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
            return jwtSecret, nil
        })

        if err != nil || !token.Valid {
            writeError(w, http.StatusUnauthorized, "Invalid or expired token")
            return
        }

        user := &AuthenticatedUser{
            ID:   claims.UserID,
            Role: claims.Role,
        }

        ctx := context.WithValue(r.Context(), userContextKey, user)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// UPDATED: Rate Limiting Middleware now uses configured values
func rateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, ok := r.Context().Value(userContextKey).(*AuthenticatedUser)
		if !ok {
			writeError(w, http.StatusInternalServerError, "User not found in context for rate limiting")
			return
		}

		mu.Lock()
		limiter, exists := userLimiters[user.ID]
		if !exists {
			limiter = rate.NewLimiter(rate.Limit(appConfig.RateRPS), appConfig.RateBurst)
			userLimiters[user.ID] = limiter
		}
		mu.Unlock()

		if !limiter.Allow() {
			writeError(w, http.StatusTooManyRequests, "API rate limit exceeded")
			return
		}

		next.ServeHTTP(w, r)
	})
}

// adminOnlyMiddleware is unchanged
func adminOnlyMiddleware(next http.Handler) http.Handler {
	// ... (implementation is unchanged and correct)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, ok := r.Context().Value(userContextKey).(*AuthenticatedUser)
		if !ok || user == nil {
			writeError(w, http.StatusUnauthorized, "Not authenticated")
			return
		}
		if user.Role != "admin" {
			writeError(w, http.StatusForbidden, "Admin access required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// --- USER & AUTH HANDLERS ---
// signupHandler, loginHandler, healthHandler are unchanged
func signupHandler(w http.ResponseWriter, r *http.Request) {
	// ... (implementation is unchanged and correct)
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
		Name     string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}
	req.Username = strings.TrimSpace(req.Username)
	req.Name = strings.TrimSpace(req.Name)
	if req.Username == "" || req.Password == "" || req.Name == "" {
		writeError(w, http.StatusBadRequest, "Username, password, and name are required")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to hash password")
		return
	}
	_, err = pool.Exec(context.Background(), `INSERT INTO users (username, password_hash, name) VALUES ($1, $2, $3)`, req.Username, string(hash), req.Name)
	if err != nil {
		if strings.Contains(err.Error(), "23505") {
			writeError(w, http.StatusConflict, "Username already exists")
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to create user")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"message": "Signup successful"})
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	// ... (implementation is unchanged and correct)
	var req AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}
	username := strings.TrimSpace(req.Username)
	user, err := verifyCredentialsAndGetUser(username, req.Password)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Invalid username or password")
		return
	}

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		UserID: user.ID,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	var name string
	_ = pool.QueryRow(context.Background(), `SELECT name FROM users WHERE id = $1`, user.ID).Scan(&name)
	_, _ = pool.Exec(context.Background(), `UPDATE users SET last_login = NOW() WHERE id = $1`, user.ID)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Login successful",
		"token":   tokenString,
		"user":    map[string]interface{}{"id": user.ID, "username": username, "name": name, "role": user.Role},
	})
}
func healthHandler(w http.ResponseWriter, r *http.Request) {
	// ... (implementation is unchanged and correct)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := pool.Ping(ctx); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "unhealthy", "error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "healthy", "time": time.Now().Format(time.RFC3339)})
}

// --- FILE HANDLERS ---
// UPDATED: uploadHandler now uses configured quota value
// func uploadHandler(w http.ResponseWriter, r *http.Request) {
// 	user := r.Context().Value(userContextKey).(*AuthenticatedUser)

// 	if err := r.ParseMultipartForm(50 << 20); err != nil {
// 		writeError(w, http.StatusBadRequest, "Error parsing form")
// 		return
// 	}

// 	files := r.MultipartForm.File["files"]
// 	if len(files) == 0 {
// 		writeError(w, http.StatusBadRequest, "No files provided in 'files' field")
// 		return
// 	}

// 	// --- STORAGE QUOTA LOGIC ---
// 	ctx := context.Background()
// 	var newFilesSize int64 = 0
// 	var newHashes []string

// 	for _, fileHeader := range files {
// 		// ... (inner loop logic is unchanged and correct)
// 		file, err := fileHeader.Open()
// 		if err != nil {
// 			writeError(w, http.StatusInternalServerError, "Could not read file for quota check")
// 			return
// 		}

// 		hash := sha256.New()
// 		if _, err := io.Copy(hash, file); err != nil {
// 			writeError(w, http.StatusInternalServerError, "Could not hash file for quota check")
// 			return
// 		}
// 		file.Close()
// 		hashStr := hex.EncodeToString(hash.Sum(nil))

// 		var exists bool
// 		err = pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM physical_files WHERE hash = $1)", hashStr).Scan(&exists)
// 		if err != nil {
// 			writeError(w, http.StatusInternalServerError, "Database error during quota check")
// 			return
// 		}

// 		if !exists {
// 			isDuplicateInBatch := false
// 			for _, h := range newHashes {
// 				if h == hashStr {
// 					isDuplicateInBatch = true
// 					break
// 				}
// 			}
// 			if !isDuplicateInBatch {
// 				newFilesSize += fileHeader.Size
// 				newHashes = append(newHashes, hashStr)
// 			}
// 		}
// 	}

// 	var currentUsageBytes int64
// 	err := pool.QueryRow(ctx, `
//         SELECT COALESCE(SUM(pf.size), 0) FROM physical_files pf 
//         WHERE pf.id IN (SELECT DISTINCT physical_file_id FROM user_files WHERE owner_id = $1)`, user.ID).Scan(&currentUsageBytes)
// 	if err != nil {
// 		writeError(w, http.StatusInternalServerError, "Could not retrieve user storage usage")
// 		return
// 	}

// 	if currentUsageBytes+newFilesSize > appConfig.MaxStorageBytes { // Use configured value
// 		errorMessage := fmt.Sprintf(
// 			"Storage quota exceeded. Your current usage is %.2f MB. This upload would add %.2f MB, exceeding the %.2f MB limit.",
// 			float64(currentUsageBytes)/1024/1024, float64(newFilesSize)/1024/1024, float64(appConfig.MaxStorageBytes)/1024/1024,
// 		)
// 		writeError(w, http.StatusForbidden, errorMessage)
// 		return
// 	}
// 	// --- END OF QUOTA LOGIC ---

// 	var uploadedFiles []map[string]interface{}
// 	for _, fileHeader := range files {
// 		processedFile, err := processAndUploadFile(user.ID, fileHeader)
// 		if err != nil {
// 			writeError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to process file %s: %v", fileHeader.Filename, err))
// 			return
// 		}
// 		uploadedFiles = append(uploadedFiles, processedFile)
// 	}
// 	writeJSON(w, http.StatusCreated, map[string]interface{}{"message": "Files uploaded successfully", "uploadedCount": len(uploadedFiles), "files": uploadedFiles})
// }

// A completely rewritten upload handler that processes files in a single, efficient loop.
func uploadHandler(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(userContextKey).(*AuthenticatedUser)

	if err := r.ParseMultipartForm(50 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "Error parsing form")
		return
	}

	files := r.MultipartForm.File["files"]
	if len(files) == 0 {
		writeError(w, http.StatusBadRequest, "No files provided in 'files' field")
		return
	}

	ctx := context.Background()
	var uploadedFiles []map[string]interface{}
	var newFilesSize int64 = 0
	var newHashes = make(map[string]bool)

	// Get current storage usage ONCE before the loop.
	var currentUsageBytes int64
	err := pool.QueryRow(ctx, `
        SELECT COALESCE(SUM(pf.size), 0) FROM physical_files pf 
        WHERE pf.id IN (SELECT DISTINCT physical_file_id FROM user_files WHERE owner_id = $1)`, user.ID).Scan(&currentUsageBytes)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not retrieve user storage usage")
		return
	}

	// --- SINGLE PROCESSING LOOP ---
	for _, fileHeader := range files {
		// 1. Open and hash the file (this is the only time we read it before upload)
		file, err := fileHeader.Open()
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Could not open file for processing")
			return
		}

		hash := sha256.New()
		if _, err := io.Copy(hash, file); err != nil {
			file.Close()
			writeError(w, http.StatusInternalServerError, "Could not hash file")
			return
		}
		file.Close() // Close immediately after hashing
		hashStr := hex.EncodeToString(hash.Sum(nil))

		// 2. Check if this exact file content already exists in the DB or this batch
		var existsInDB bool
		err = pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM physical_files WHERE hash = $1)", hashStr).Scan(&existsInDB)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Database error during duplicate check")
			return
		}

		_, existsInBatch := newHashes[hashStr]

		// 3. If it's a new, unique file, check the quota
		if !existsInDB && !existsInBatch {
			if currentUsageBytes+newFilesSize+fileHeader.Size > appConfig.MaxStorageBytes {
				errorMessage := fmt.Sprintf(
					"Storage quota exceeded. Your current usage is %.2f MB. This upload would exceed the %.2f MB limit.",
					float64(currentUsageBytes+newFilesSize)/1024/1024, float64(appConfig.MaxStorageBytes)/1024/1024,
				)
				writeError(w, http.StatusForbidden, errorMessage)
				return
			}
			newFilesSize += fileHeader.Size
			newHashes[hashStr] = true
		}

		// 4. Process and upload the file within a transaction
		tx, err := pool.Begin(ctx)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Could not start transaction")
			return
		}

		processedFile, err := processAndUploadFile(tx, user.ID, fileHeader, hashStr)
		if err != nil {
			tx.Rollback(ctx)
			writeError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to process file %s: %v", fileHeader.Filename, err))
			return
		}

		if err := tx.Commit(ctx); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to commit transaction")
			return
		}
		uploadedFiles = append(uploadedFiles, processedFile)
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{"message": "Files uploaded successfully", "uploadedCount": len(uploadedFiles), "files": uploadedFiles})
}

// The final, perfected upload function with accurate MIME type detection.
// func processAndUploadFile(userID int, header *multipart.FileHeader) (map[string]interface{}, error) {
//     file, err := header.Open()
//     if err != nil {
//         return nil, fmt.Errorf("could not open file header: %w", err)
//     }
//     defer file.Close()

//     // --- Accurate MIME Type Detection ---
//     var finalMimeType string

//     // 1. Prioritize the file extension for specific types (.docx, .xlsx, .txt).
//     // This is the most reliable method for user-friendly types.
//     ext := filepath.Ext(header.Filename)
//     finalMimeType = mime.TypeByExtension(ext)

//     // 2. If the extension is unknown (or untrusted), fall back to content sniffing.
//     if finalMimeType == "" {
//         buffer := make([]byte, 512)
//         _, err = file.Read(buffer)
//         if err != nil && err != io.EOF {
//             return nil, fmt.Errorf("could not read file header for MIME detection: %w", err)
//         }
//         finalMimeType = http.DetectContentType(buffer)
//     }
//     // --- End of MIME Logic ---


//     // 3. Determine the Cloudinary resource_type using our accurate MIME type.
//     resourceType := getResourceTypeFromMIME(finalMimeType)

//     // 4. CRITICAL: Rewind the file stream before any further reading.
//     if _, err := file.Seek(0, 0); err != nil {
//         return nil, fmt.Errorf("could not seek file after MIME check: %w", err)
//     }

//     // 5. Calculate the file's hash for deduplication.
//     hash := sha256.New()
//     if _, err := io.Copy(hash, file); err != nil {
//         return nil, fmt.Errorf("could not hash file: %w", err)
//     }
//     hashStr := hex.EncodeToString(hash.Sum(nil))

//     // 6. CRITICAL: Rewind the file stream again before the final upload.
//     if _, err := file.Seek(0, 0); err != nil {
//         return nil, fmt.Errorf("could not seek file before upload: %w", err)
//     }

//     ctx := context.Background()
//     tx, err := pool.Begin(ctx)
//     if err != nil {
//         return nil, err
//     }
//     defer tx.Rollback(ctx)

//     var physicalFileID int
//     var wasDeduplicated bool
//     err = tx.QueryRow(ctx, "SELECT id FROM physical_files WHERE hash = $1", hashStr).Scan(&physicalFileID)

//     if err == pgx.ErrNoRows {
//         wasDeduplicated = false
        
//         // 7. PERFECTED PARAMS: Set all necessary options for a successful public upload.
//         uploadParams := uploader.UploadParams{
//             ResourceType: resourceType, // Use the correct type (image, video, or raw)
//             Type:         "upload",     // Ensure the file is public
//             Moderation:   "manual",     // Prevent automatic moderation from blocking it
//         }

//         uploadResult, uploadErr := cld.Upload.Upload(ctx, file, uploadParams)
//         if uploadErr != nil {
//             return nil, fmt.Errorf("cloudinary upload failed: %w", uploadErr)
//         }

//         // 8. Store the ACCURATE finalMimeType in the database.
//         insertErr := tx.QueryRow(ctx, `INSERT INTO physical_files (hash, storage_url, public_id, size, mime_type) VALUES ($1, $2, $3, $4, $5) RETURNING id`, hashStr, uploadResult.SecureURL, uploadResult.PublicID, header.Size, finalMimeType).Scan(&physicalFileID)
//         if insertErr != nil {
//             return nil, fmt.Errorf("failed to insert new physical file record: %w", insertErr)
//         }
//     } else if err != nil {
//         return nil, fmt.Errorf("failed to check for existing file hash: %w", err)
//     } else {
//         wasDeduplicated = true
//         _, updateErr := tx.Exec(ctx, "UPDATE physical_files SET ref_count = ref_count + 1 WHERE id = $1", physicalFileID)
//         if updateErr != nil {
//             return nil, fmt.Errorf("failed to update reference count for duplicate file: %w", updateErr)
//         }
//     }
    
//     // --- This final part remains unchanged as it's already correct ---
//     var userFileID int
//     var uploadedAt time.Time
//     err = tx.QueryRow(ctx, `INSERT INTO user_files (owner_id, physical_file_id, filename) VALUES ($1, $2, $3) RETURNING id, uploaded_at`, userID, physicalFileID, header.Filename).Scan(&userFileID, &uploadedAt)
//     if err != nil {
//         return nil, fmt.Errorf("failed to create user file reference: %w", err)
//     }

//     if err := tx.Commit(ctx); err != nil {
//         return nil, fmt.Errorf("failed to commit transaction: %w", err)
//     }

//     logAuditEvent(userID, userFileID, "FILE_UPLOAD", map[string]interface{}{"filename": header.Filename, "size": header.Size, "deduplicated": wasDeduplicated})

//     return map[string]interface{}{"userFileId": userFileID, "filename": header.Filename, "size": header.Size, "uploadedAt": uploadedAt, "wasDeduplicated": wasDeduplicated}, nil
// }


// processAndUploadFile now accepts a transaction and hash, making it part of a larger workflow.
func processAndUploadFile(tx pgx.Tx, userID int, header *multipart.FileHeader, hashStr string) (map[string]interface{}, error) {
	file, err := header.Open()
	if err != nil {
		return nil, fmt.Errorf("could not open file header: %w", err)
	}
	defer file.Close()

	// --- Accurate MIME Type Detection (rewind is critical) ---
	var finalMimeType string
	ext := filepath.Ext(header.Filename)
	finalMimeType = mime.TypeByExtension(ext)
	if finalMimeType == "" {
		buffer := make([]byte, 512)
		_, err = file.Read(buffer)
		if err != nil && err != io.EOF {
			return nil, fmt.Errorf("could not read file header for MIME detection: %w", err)
		}
		finalMimeType = http.DetectContentType(buffer)
	}
	if _, err := file.Seek(0, 0); err != nil {
		return nil, fmt.Errorf("could not seek file after MIME check: %w", err)
	}

	// --- Database and Cloudinary Logic ---
	ctx := context.Background()
	var physicalFileID int
	var wasDeduplicated bool
	err = tx.QueryRow(ctx, "SELECT id FROM physical_files WHERE hash = $1", hashStr).Scan(&physicalFileID)

	if err == pgx.ErrNoRows {
		wasDeduplicated = false
		resourceType := getResourceTypeFromMIME(finalMimeType)
		uploadParams := uploader.UploadParams{
			ResourceType: resourceType,
			Type:         "upload",
			Moderation:   "manual",
		}

		uploadResult, uploadErr := cld.Upload.Upload(ctx, file, uploadParams)
		if uploadErr != nil {
			return nil, fmt.Errorf("cloudinary upload failed: %w", uploadErr)
		}

		insertErr := tx.QueryRow(ctx, `INSERT INTO physical_files (hash, storage_url, public_id, size, mime_type) VALUES ($1, $2, $3, $4, $5) RETURNING id`, hashStr, uploadResult.SecureURL, uploadResult.PublicID, header.Size, finalMimeType).Scan(&physicalFileID)
		if insertErr != nil {
			return nil, fmt.Errorf("failed to insert new physical file record: %w", insertErr)
		}
	} else if err != nil {
		return nil, fmt.Errorf("failed to check for existing file hash: %w", err)
	} else {
		wasDeduplicated = true
		_, updateErr := tx.Exec(ctx, "UPDATE physical_files SET ref_count = ref_count + 1 WHERE id = $1", physicalFileID)
		if updateErr != nil {
			return nil, fmt.Errorf("failed to update reference count for duplicate file: %w", updateErr)
		}
	}

	var userFileID int
	var uploadedAt time.Time
	err = tx.QueryRow(ctx, `INSERT INTO user_files (owner_id, physical_file_id, filename) VALUES ($1, $2, $3) RETURNING id, uploaded_at`, userID, physicalFileID, header.Filename).Scan(&userFileID, &uploadedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create user file reference: %w", err)
	}

	logAuditEvent(userID, userFileID, "FILE_UPLOAD", map[string]interface{}{"filename": header.Filename, "size": header.Size, "deduplicated": wasDeduplicated})
	return map[string]interface{}{"userFileId": userFileID, "filename": header.Filename, "size": header.Size, "uploadedAt": uploadedAt, "wasDeduplicated": wasDeduplicated}, nil
}


// UPDATED: searchFilesHandler now includes ref_count for deduplication status
func searchFilesHandler(w http.ResponseWriter, r *http.Request) {
    user := r.Context().Value(userContextKey).(*AuthenticatedUser)
    var req struct {
        Filters struct {
            Filename  *string    `json:"filename"`
            OwnerName *string    `json:"ownerName"`
            MimeType  *string    `json:"mimeType"`
            MinSize   *int64     `json:"minSize"`
            MaxSize   *int64     `json:"maxSize"`
            StartDate *time.Time `json:"startDate"`
            EndDate   *time.Time `json:"endDate"`
        } `json:"filters"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeError(w, http.StatusBadRequest, "Invalid JSON body for searching/filtering")
        return
    }

    baseQuery := `
        SELECT
            uf.id, uf.filename, pf.size, pf.mime_type, uf.is_public,
            uf.download_count, uf.uploaded_at, pf.storage_url,
            u_owner.name AS owner_name,
            -- THIS IS THE FIX: Select the reference count from the physical file
            pf.ref_count,
            CASE WHEN uf.owner_id = $1 THEN NULL ELSE u_owner.name END AS shared_by
        FROM user_files uf
        JOIN physical_files pf ON uf.physical_file_id = pf.id
        JOIN users u_owner ON uf.owner_id = u_owner.id
        LEFT JOIN file_shares fs ON uf.id = fs.user_file_id
        WHERE (uf.owner_id = $1 OR fs.recipient_id = $1)
    `
    args := []interface{}{user.ID}
    conditions := []string{}
    argID := 2

    // ... (rest of the filtering logic is unchanged)
    if req.Filters.Filename != nil && *req.Filters.Filename != "" {
		conditions = append(conditions, fmt.Sprintf("uf.filename ILIKE $%d", argID))
		args = append(args, "%"+*req.Filters.Filename+"%")
		argID++
	}
	if req.Filters.OwnerName != nil && *req.Filters.OwnerName != "" {
		conditions = append(conditions, fmt.Sprintf("u_owner.name ILIKE $%d", argID))
		args = append(args, "%"+*req.Filters.OwnerName+"%")
		argID++
	}
	if req.Filters.MimeType != nil && *req.Filters.MimeType != "" {
		conditions = append(conditions, fmt.Sprintf("pf.mime_type = $%d", argID))
		args = append(args, *req.Filters.MimeType)
		argID++
	}
	if req.Filters.MinSize != nil {
		conditions = append(conditions, fmt.Sprintf("pf.size >= $%d", argID))
		args = append(args, *req.Filters.MinSize)
		argID++
	}
	if req.Filters.MaxSize != nil {
		conditions = append(conditions, fmt.Sprintf("pf.size <= $%d", argID))
		args = append(args, *req.Filters.MaxSize)
		argID++
	}
	if req.Filters.StartDate != nil {
		conditions = append(conditions, fmt.Sprintf("uf.uploaded_at >= $%d", argID))
		args = append(args, *req.Filters.StartDate)
		argID++
	}
	if req.Filters.EndDate != nil {
		conditions = append(conditions, fmt.Sprintf("uf.uploaded_at <= $%d", argID))
		args = append(args, *req.Filters.EndDate)
		argID++
	}

    finalQuery := baseQuery
    if len(conditions) > 0 {
        finalQuery += " AND " + strings.Join(conditions, " AND ")
    }
    finalQuery += ` ORDER BY uf.uploaded_at DESC`

    rows, err := pool.Query(context.Background(), finalQuery, args...)
    if err != nil {
        writeError(w, http.StatusInternalServerError, "Failed to query files: "+err.Error())
        return
    }
    defer rows.Close()

    type FileInfo struct {
        ID            int       `json:"id"`
        Filename      string    `json:"filename"`
        Size          int64     `json:"size"`
        MimeType      string    `json:"mimeType"`
        IsPublic      bool      `json:"isPublic"`
        DownloadCount int       `json:"downloadCount"`
        UploadedAt    time.Time `json:"uploadedAt"`
        URL           string    `json:"url"`
        OwnerName     string    `json:"ownerName"`
        RefCount      int       `json:"refCount"`
        SharedBy      *string   `json:"sharedBy,omitempty"`
    }
	var files []FileInfo
    for rows.Next() {
        var f FileInfo
        if err := rows.Scan(&f.ID, &f.Filename, &f.Size, &f.MimeType, &f.IsPublic, &f.DownloadCount, &f.UploadedAt, &f.URL, &f.OwnerName, &f.RefCount, &f.SharedBy); err != nil {
            writeError(w, http.StatusInternalServerError, "Failed to scan file data: "+err.Error())
            return
        }

        // THE FIX: Sanitize the URL before adding it to the list.
        f.URL = sanitizeCloudinaryURL(f.URL)

        files = append(files, f)
    }
    writeJSON(w, http.StatusOK, files)
}

// listMySharedFilesHandler retrieves all files owned by the current user that are either public or shared with other users.
func listMySharedFilesHandler(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(userContextKey).(*AuthenticatedUser)
	ctx := context.Background()

	// This powerful query does all the work:
	// 1. It only selects files owned by the current user (uf.owner_id = $1).
	// 2. It filters for files that are either public OR have at least one entry in the file_shares table.
	// 3. It uses jsonb_agg to collect all the usernames of users the file is shared with into a single JSON array.
	query := `
		SELECT
			uf.id,
			uf.filename,
			pf.size,
			pf.mime_type,
			uf.is_public,
			uf.download_count,
			uf.uploaded_at,
			pf.storage_url,
			u_owner.name AS owner_name,
			COALESCE(
				(SELECT jsonb_agg(jsonb_build_object('id', u_recipient.id, 'username', u_recipient.username, 'name', u_recipient.name))
				 FROM file_shares fs
				 JOIN users u_recipient ON fs.recipient_id = u_recipient.id
				 WHERE fs.user_file_id = uf.id),
				'[]'::jsonb
			) AS shared_with
		FROM user_files uf
		JOIN physical_files pf ON uf.physical_file_id = pf.id
		JOIN users u_owner ON uf.owner_id = u_owner.id
		WHERE
			uf.owner_id = $1
			AND (
				uf.is_public = TRUE
				OR EXISTS (SELECT 1 FROM file_shares fs WHERE fs.user_file_id = uf.id)
			)
		ORDER BY uf.uploaded_at DESC;
	`

	rows, err := pool.Query(ctx, query, user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to query shared files: "+err.Error())
		return
	}
	defer rows.Close()

	type SharedFileInfo struct {
		ID            int             `json:"id"`
		Filename      string          `json:"filename"`
		Size          int64           `json:"size"`
		MimeType      string          `json:"mimeType"`
		IsPublic      bool            `json:"isPublic"`
		DownloadCount int             `json:"downloadCount"`
		UploadedAt    time.Time       `json:"uploadedAt"`
		URL           string          `json:"url"`
		OwnerName     string          `json:"ownerName"`
		SharedWith    json.RawMessage `json:"sharedWith"` // Use json.RawMessage to hold the JSON array from the DB
	}

	var files []SharedFileInfo
	for rows.Next() {
		var f SharedFileInfo
		if err := rows.Scan(
			&f.ID, &f.Filename, &f.Size, &f.MimeType, &f.IsPublic,
			&f.DownloadCount, &f.UploadedAt, &f.URL, &f.OwnerName, &f.SharedWith,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to scan shared file data: "+err.Error())
			return
		}
		// Sanitize the URL just like in the search handler
		f.URL = sanitizeCloudinaryURL(f.URL)
		files = append(files, f)
	}

	writeJSON(w, http.StatusOK, files)
}

// Other handlers (delete, share, public download, etc.) are unchanged and correct
func deleteFileHandler(w http.ResponseWriter, r *http.Request) {
	// ... (implementation is unchanged and correct)
	user := r.Context().Value(userContextKey).(*AuthenticatedUser)
	vars := mux.Vars(r)
	userFileID, err := strconv.Atoi(vars["id"])
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid file ID")
		return
	}

	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not start transaction")
		return
	}
	defer tx.Rollback(ctx)
	var ownerID, physicalFileID int
	var filename string
	err = tx.QueryRow(ctx, "SELECT owner_id, physical_file_id, filename FROM user_files WHERE id = $1", userFileID).Scan(&ownerID, &physicalFileID, &filename)
	if err != nil {
		writeError(w, http.StatusNotFound, "File not found")
		return
	}
	if ownerID != user.ID && user.Role != "admin" {
		writeError(w, http.StatusForbidden, "You do not have permission to delete this file")
		return
	}
	_, err = tx.Exec(ctx, "DELETE FROM user_files WHERE id = $1", userFileID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to delete file reference")
		return
	}
	var refCount int
	var publicID string
	err = tx.QueryRow(ctx, "UPDATE physical_files SET ref_count = ref_count - 1 WHERE id = $1 RETURNING ref_count, public_id", physicalFileID).Scan(&refCount, &publicID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update file reference count")
		return
	}
	if refCount == 0 {
		_, err := cld.Upload.Destroy(ctx, uploader.DestroyParams{PublicID: publicID})
		if err != nil {
			log.Printf("Orphaned file warning: Could not delete file %s from Cloudinary: %v", publicID, err)
		}
		_, err = tx.Exec(ctx, "DELETE FROM physical_files WHERE id = $1", physicalFileID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to delete physical file record")
			return
		}
	}
	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to commit transaction")
		return
	}
	logAuditEvent(user.ID, userFileID, "FILE_DELETE", map[string]interface{}{"filename": filename})
	writeJSON(w, http.StatusOK, map[string]string{"message": "File deleted successfully"})
}

func unshareFileHandler(w http.ResponseWriter, r *http.Request) {
    conn, err := pool.Acquire(r.Context())
    if err != nil {
        writeError(w, http.StatusInternalServerError, "Could not acquire database connection")
        return
    }
    defer conn.Release()

    user := r.Context().Value(userContextKey).(*AuthenticatedUser)
    vars := mux.Vars(r)
    userFileID, err := strconv.Atoi(vars["id"])
    if err != nil {
        writeError(w, http.StatusBadRequest, "Invalid file ID")
        return
    }

    // This is the core logic: Delete the share link for the current user.
    // It doesn't touch the original file, only the share record.
    _, err = conn.Exec(r.Context(), "DELETE FROM file_shares WHERE user_file_id = $1 AND recipient_id = $2", userFileID, user.ID)
    if err != nil {
        writeError(w, http.StatusInternalServerError, "Failed to remove share")
        return
    }

    // Log this important action
    logAuditEvent(user.ID, userFileID, "FILE_UNSHARE_SELF", nil)
    writeJSON(w, http.StatusOK, map[string]string{"message": "File removed from your view"})
}

func shareFileHandler(w http.ResponseWriter, r *http.Request) {
	// ... (implementation is unchanged and correct)
	user := r.Context().Value(userContextKey).(*AuthenticatedUser)
	vars := mux.Vars(r)
	userFileID, err := strconv.Atoi(vars["id"])
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid file ID")
		return
	}
	var ownerID int
	var filename string
	err = pool.QueryRow(context.Background(), "SELECT owner_id, filename FROM user_files WHERE id = $1", userFileID).Scan(&ownerID, &filename)
	if err != nil {
		writeError(w, http.StatusNotFound, "File not found")
		return
	}
	if ownerID != user.ID {
		writeError(w, http.StatusForbidden, "You are not the owner of this file")
		return
	}
	_, err = pool.Exec(context.Background(), "UPDATE user_files SET is_public = true WHERE id = $1", userFileID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to make file public")
		return
	}
	logAuditEvent(user.ID, userFileID, "FILE_SHARE_PUBLIC", map[string]interface{}{"filename": filename})
	publicLink := fmt.Sprintf("%s://%s/files/public/%d", "http", r.Host, userFileID)
	writeJSON(w, http.StatusOK, map[string]string{"message": "File is now public", "publicLink": publicLink})
}

func publicDownloadHandler(w http.ResponseWriter, r *http.Request) {
	// ... (implementation is unchanged and correct)
	vars := mux.Vars(r)
	userFileID, err := strconv.Atoi(vars["id"])
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid file ID")
		return
	}
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Database error")
		return
	}
	defer tx.Rollback(ctx)
	var isPublic bool
	var storageURL, filename string
	query := `SELECT uf.is_public, pf.storage_url, uf.filename FROM user_files uf JOIN physical_files pf ON uf.physical_file_id = pf.id WHERE uf.id = $1`
	err = tx.QueryRow(ctx, query, userFileID).Scan(&isPublic, &storageURL, &filename)
	if err != nil {
		writeError(w, http.StatusNotFound, "File not found")
		return
	}
	if !isPublic {
		writeError(w, http.StatusForbidden, "This file is not public")
		return
	}
	_, err = tx.Exec(ctx, "UPDATE user_files SET download_count = download_count + 1 WHERE id = $1", userFileID)
	if err != nil {
		log.Printf("Failed to increment download count for file %d: %v", userFileID, err)
	}
	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "Database error")
		return
	}
	logAuditEvent(0, userFileID, "FILE_DOWNLOAD_PUBLIC", map[string]interface{}{"ip": r.RemoteAddr, "filename": filename})
	http.Redirect(w, r, storageURL, http.StatusFound)
}

func authenticatedDownloadHandler(w http.ResponseWriter, r *http.Request) {
    user := r.Context().Value(userContextKey).(*AuthenticatedUser)
    vars := mux.Vars(r)
    userFileID, err := strconv.Atoi(vars["id"])
    if err != nil {
        writeError(w, http.StatusBadRequest, "Invalid file ID")
        return
    }

    ctx := context.Background()
    tx, err := pool.Begin(ctx)
    if err != nil {
        writeError(w, http.StatusInternalServerError, "Database error")
        return
    }
    defer tx.Rollback(ctx)

    var ownerID int
    var isShared bool
    var storageURL, filename string // We no longer need mimeType here

    query := `
        SELECT
            uf.owner_id,
            pf.storage_url,
            uf.filename,
            EXISTS (SELECT 1 FROM file_shares WHERE user_file_id = $1 AND recipient_id = $2)
        FROM user_files uf
        JOIN physical_files pf ON uf.physical_file_id = pf.id
        WHERE uf.id = $1
    `
    err = tx.QueryRow(ctx, query, userFileID, user.ID).Scan(&ownerID, &storageURL, &filename, &isShared)

    if err != nil {
        if err == pgx.ErrNoRows {
            writeError(w, http.StatusNotFound, "File not found")
            return
        }
        writeError(w, http.StatusInternalServerError, "Database error on scan")
        return
    }

    if ownerID != user.ID && !isShared && user.Role != "admin" {
        writeError(w, http.StatusForbidden, "You do not have permission to download this file")
        return
    }

    // THE FIX: Use the sanitizer to create the simple, direct URL.
    // This single line replaces all the previous complex logic.
    correctDownloadURL := sanitizeCloudinaryURL(storageURL)

    // Increment download count.
    _, err = tx.Exec(ctx, "UPDATE user_files SET download_count = download_count + 1 WHERE id = $1", userFileID)
    if err != nil {
        log.Printf("Failed to increment download count for file %d: %v", userFileID, err)
    }

    if err := tx.Commit(ctx); err != nil {
        writeError(w, http.StatusInternalServerError, "Database error on commit")
        return
    }

    logAuditEvent(user.ID, userFileID, "FILE_DOWNLOAD_AUTH", map[string]interface{}{"filename": filename})

    // Redirect the user's browser to the final, correct URL for the download.
    http.Redirect(w, r, correctDownloadURL, http.StatusFound)
}

func shareWithUserHandler(w http.ResponseWriter, r *http.Request) {
	// ... (implementation is unchanged and correct)
	user := r.Context().Value(userContextKey).(*AuthenticatedUser)
	vars := mux.Vars(r)
	userFileID, err := strconv.Atoi(vars["id"])
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid file ID")
		return
	}
	var req struct {
		ShareWithUsername string `json:"shareWithUsername"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON body")
		return
	}
	var recipientID int
	err = pool.QueryRow(context.Background(), "SELECT id FROM users WHERE username = $1", req.ShareWithUsername).Scan(&recipientID)
	if err != nil {
		if err == pgx.ErrNoRows {
			writeError(w, http.StatusNotFound, "User to share with not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "Database error")
		return
	}
	if user.ID == recipientID {
		writeError(w, http.StatusBadRequest, "You cannot share a file with yourself")
		return
	}
	var ownerID int
	var filename string
	err = pool.QueryRow(context.Background(), "SELECT owner_id, filename FROM user_files WHERE id = $1", userFileID).Scan(&ownerID, &filename)
	if err != nil {
		writeError(w, http.StatusNotFound, "File not found")
		return
	}
	if ownerID != user.ID {
		writeError(w, http.StatusForbidden, "You are not the owner of this file")
		return
	}
	_, err = pool.Exec(context.Background(), `INSERT INTO file_shares (user_file_id, recipient_id) VALUES ($1, $2)`, userFileID, recipientID)
	if err != nil {
		if strings.Contains(err.Error(), "23505") {
			writeJSON(w, http.StatusConflict, map[string]string{"message": "File already shared with this user"})
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to share file")
		return
	}
	logAuditEvent(user.ID, userFileID, "FILE_SHARE_USER", map[string]interface{}{"filename": filename, "recipientUsername": req.ShareWithUsername})
	writeJSON(w, http.StatusCreated, map[string]string{"message": fmt.Sprintf("File successfully shared with %s", req.ShareWithUsername)})
}

func analyticsHandler(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(userContextKey).(*AuthenticatedUser)
	ctx := context.Background()
	var wg sync.WaitGroup
	var mu sync.Mutex

	// This map will hold all our analytics results.
	results := make(map[string]interface{})

	// --- 1. Storage Statistics ---
	wg.Add(1)
	go func() {
		defer wg.Done()
		var originalSize, deduplicatedSize int64
		_ = pool.QueryRow(ctx, `SELECT COALESCE(SUM(pf.size), 0) FROM user_files uf JOIN physical_files pf ON uf.physical_file_id = pf.id WHERE uf.owner_id = $1`, user.ID).Scan(&originalSize)
		_ = pool.QueryRow(ctx, `SELECT COALESCE(SUM(pf.size), 0) FROM physical_files pf WHERE pf.id IN (SELECT DISTINCT physical_file_id FROM user_files WHERE owner_id = $1)`, user.ID).Scan(&deduplicatedSize)
		
		storageSavings := originalSize - deduplicatedSize
		var savingsPercentage float64
		if originalSize > 0 {
			savingsPercentage = (float64(storageSavings) / float64(originalSize)) * 100
		}
		
		mu.Lock()
		results["storageStatistics"] = map[string]interface{}{
			"originalUsageBytes": originalSize, 
			"deduplicatedUsageBytes": deduplicatedSize, 
			"savingsBytes": storageSavings, 
			"savingsPercentage": savingsPercentage,
		}
		mu.Unlock()
	}()

	// --- 2. Uploads By Day ---
	wg.Add(1)
	go func() {
		defer wg.Done()
		type UploadsByDay struct {
			Day   time.Time `json:"day"`
			Count int       `json:"count"`
		}
		var uploadsTimeline []UploadsByDay
		rows, err := pool.Query(ctx, `SELECT DATE_TRUNC('day', uploaded_at)::DATE AS day, COUNT(*) FROM user_files WHERE owner_id = $1 GROUP BY day ORDER BY day`, user.ID)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var u UploadsByDay
				_ = rows.Scan(&u.Day, &u.Count)
				uploadsTimeline = append(uploadsTimeline, u)
			}
		}
		mu.Lock()
		results["uploadsByDay"] = uploadsTimeline
		mu.Unlock()
	}()

	// --- 3. File Type Breakdown ---
	wg.Add(1)
	go func() {
		defer wg.Done()
		type MimeTypeCount struct {
			MimeType string `json:"mimeType"`
			Count    int    `json:"count"`
		}
		var mimeTypeCounts []MimeTypeCount
		rows, err := pool.Query(ctx, `SELECT pf.mime_type, COUNT(uf.id) FROM user_files uf JOIN physical_files pf ON uf.physical_file_id = pf.id WHERE uf.owner_id = $1 GROUP BY pf.mime_type`, user.ID)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var m MimeTypeCount
				_ = rows.Scan(&m.MimeType, &m.Count)
				mimeTypeCounts = append(mimeTypeCounts, m)
			}
		}
		mu.Lock()
		results["fileTypeBreakdown"] = mimeTypeCounts
		mu.Unlock()
	}()

	// --- 4. Top Downloaded Files ---
	wg.Add(1)
	go func() {
		defer wg.Done()
		type TopFile struct {
			Filename      string `json:"filename"`
			DownloadCount int    `json:"downloadCount"`
		}
		var topDownloaded []TopFile
		rows, err := pool.Query(ctx, `SELECT filename, download_count FROM user_files WHERE owner_id = $1 AND download_count > 0 ORDER BY download_count DESC LIMIT 5`, user.ID)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var t TopFile
				_ = rows.Scan(&t.Filename, &t.DownloadCount)
				topDownloaded = append(topDownloaded, t)
			}
		}
		mu.Lock()
		results["topDownloadedFiles"] = topDownloaded
		mu.Unlock()
	}()

	// --- 5. Sharing Analytics ---
	wg.Add(1)
	go func() {
		defer wg.Done()
		// Most Shared Files
		type MostSharedFile struct {
			Filename   string `json:"filename"`
			ShareCount int    `json:"share_count"`
		}
		var mostSharedFiles []MostSharedFile
		rows, err := pool.Query(ctx, `SELECT uf.filename, COUNT(fs.recipient_id) AS share_count FROM user_files uf JOIN file_shares fs ON uf.id = fs.user_file_id WHERE uf.owner_id = $1 GROUP BY uf.id, uf.filename ORDER BY share_count DESC LIMIT 5`, user.ID)
		if err == nil {
			for rows.Next() {
				var f MostSharedFile
				_ = rows.Scan(&f.Filename, &f.ShareCount)
				mostSharedFiles = append(mostSharedFiles, f)
			}
			rows.Close()
		}
		
		// Top Collaborators
		type TopCollaborator struct {
			RecipientName       string `json:"recipientName"`
			FilesSharedWithCount int    `json:"files_shared_with_count"`
		}
		var topCollaborators []TopCollaborator
		rows, err = pool.Query(ctx, `SELECT u.name AS recipient_name, COUNT(fs.user_file_id) AS files_shared_with_count FROM file_shares fs JOIN user_files uf ON fs.user_file_id = uf.id JOIN users u ON fs.recipient_id = u.id WHERE uf.owner_id = $1 GROUP BY u.id, u.name ORDER BY files_shared_with_count DESC LIMIT 5`, user.ID)
		if err == nil {
			for rows.Next() {
				var c TopCollaborator
				_ = rows.Scan(&c.RecipientName, &c.FilesSharedWithCount)
				topCollaborators = append(topCollaborators, c)
			}
			rows.Close()
		}
		
		mu.Lock()
		results["sharingAnalytics"] = map[string]interface{}{
			"mostSharedFiles":  mostSharedFiles,
			"topCollaborators": topCollaborators,
		}
		mu.Unlock()
	}()

	// --- 6. File Size Analytics ---
	wg.Add(1)
	go func() {
		defer wg.Done()
		type LargestFile struct {
			Filename string `json:"filename"`
			Size     int64  `json:"size"`
		}
		var largestFiles []LargestFile
		rows, err := pool.Query(ctx, `SELECT uf.filename, pf.size FROM user_files uf JOIN physical_files pf ON uf.physical_file_id = pf.id WHERE uf.owner_id = $1 ORDER BY pf.size DESC LIMIT 5`, user.ID)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var f LargestFile
				_ = rows.Scan(&f.Filename, &f.Size)
				largestFiles = append(largestFiles, f)
			}
		}
		mu.Lock()
		results["fileSizeAnalytics"] = map[string]interface{}{
			"largestFiles": largestFiles,
		}
		mu.Unlock()
	}()
	
	// Wait for all goroutines to finish.
	wg.Wait()
	
	// Send the complete analytics object as a single JSON response.
	writeJSON(w, http.StatusOK, results)
}


func adminListAllFilesHandler(w http.ResponseWriter, r *http.Request) {
	// ... (implementation is unchanged and correct)
	baseQuery := `SELECT uf.id, uf.filename, pf.size, pf.mime_type, uf.is_public, uf.download_count, uf.uploaded_at, pf.storage_url, u_owner.name AS owner_name FROM user_files uf JOIN physical_files pf ON uf.physical_file_id = pf.id JOIN users u_owner ON uf.owner_id = u_owner.id`
	finalQuery := baseQuery + ` ORDER BY uf.uploaded_at DESC`
	rows, err := pool.Query(context.Background(), finalQuery)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to query all files: "+err.Error())
		return
	}
	defer rows.Close()
	type AdminFileInfo struct {
		ID            int       `json:"id"`
		Filename      string    `json:"filename"`
		Size          int64     `json:"size"`
		MimeType      string    `json:"mimeType"`
		IsPublic      bool      `json:"isPublic"`
		DownloadCount int       `json:"downloadCount"`
		UploadedAt    time.Time `json:"uploadedAt"`
		URL           string    `json:"url"`
		OwnerName     string    `json:"ownerName"`
	}
	var files []AdminFileInfo
	for rows.Next() {
		var f AdminFileInfo
		if err := rows.Scan(&f.ID, &f.Filename, &f.Size, &f.MimeType, &f.IsPublic, &f.DownloadCount, &f.UploadedAt, &f.URL, &f.OwnerName); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to scan file data: "+err.Error())
			return
		}
		files = append(files, f)
	}
	writeJSON(w, http.StatusOK, files)
}

type AuditLogEntry struct {
	ID        int64           `json:"id"`
	Action    string          `json:"action"`
	TargetID  *int            `json:"targetId,omitempty"` // Use a pointer to handle potential NULL values
	Details   json.RawMessage `json:"details"`          // Keep as raw JSON for frontend flexibility
	CreatedAt time.Time       `json:"createdAt"`
}

// getUserAuditLogsHandler retrieves the audit log history for the authenticated user.
func getUserAuditLogsHandler(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(userContextKey).(*AuthenticatedUser)
	ctx := context.Background()

	query := `
		SELECT id, action, target_id, details, created_at
		FROM audit_logs
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	rows, err := pool.Query(ctx, query, user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to query audit logs: "+err.Error())
		return
	}
	defer rows.Close()

	var logs []AuditLogEntry
	for rows.Next() {
		var logEntry AuditLogEntry
		if err := rows.Scan(&logEntry.ID, &logEntry.Action, &logEntry.TargetID, &logEntry.Details, &logEntry.CreatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to scan audit log data: "+err.Error())
			return
		}
		logs = append(logs, logEntry)
	}

	writeJSON(w, http.StatusOK, logs)
}

// src/main.go

func makeFilePrivateHandler(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(userContextKey).(*AuthenticatedUser)
	vars := mux.Vars(r)
	userFileID, err := strconv.Atoi(vars["id"])
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid file ID")
		return
	}

	var ownerID int
	var filename string
	// First, verify that the user making the request is the owner of the file.
	err = pool.QueryRow(context.Background(), "SELECT owner_id, filename FROM user_files WHERE id = $1", userFileID).Scan(&ownerID, &filename)
	if err != nil {
		if err == pgx.ErrNoRows {
			writeError(w, http.StatusNotFound, "File not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "Database error")
		return
	}

	if ownerID != user.ID {
		writeError(w, http.StatusForbidden, "You are not the owner of this file")
		return
	}

	// If they are the owner, update the file to be private.
	_, err = pool.Exec(context.Background(), "UPDATE user_files SET is_public = false WHERE id = $1", userFileID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to make file private")
		return
	}

	logAuditEvent(user.ID, userFileID, "FILE_UNSHARE_PUBLIC", map[string]interface{}{"filename": filename})
	writeJSON(w, http.StatusOK, map[string]string{"message": "File is now private"})
}

func main() {
	initConfig()
	initDB()
	initCloudinary()
	initMimeTypes()
	defer pool.Close()

	if err := ensureFilesSchema(); err != nil {
		log.Fatal("Failed to ensure schemas: ", err)
	}

	r := mux.NewRouter()

	// Public routes
	authRouter := r.PathPrefix("/auth").Subrouter()
	authRouter.HandleFunc("/signup", signupHandler).Methods("POST")
	authRouter.HandleFunc("/login", loginHandler).Methods("POST")
	r.HandleFunc("/health", healthHandler).Methods("GET")
	r.HandleFunc("/files/public/{id:[0-9]+}", publicDownloadHandler).Methods("GET")

	// API routes protected by authentication and rate limiting
	api := r.PathPrefix("/api").Subrouter()
	api.Use(authMiddleware)
	api.Use(rateLimitMiddleware)

	// User-specific file routes
	api.HandleFunc("/files/upload", uploadHandler).Methods("POST")
	api.HandleFunc("/files/search", searchFilesHandler).Methods("POST")
	api.HandleFunc("/files/analytics", analyticsHandler).Methods("POST")
	api.HandleFunc("/files/{id:[0-9]+}", deleteFileHandler).Methods("DELETE")
	api.HandleFunc("/files/{id:[0-9]+}/share-public", shareFileHandler).Methods("POST")
	api.HandleFunc("/files/{id:[0-9]+}/share-with", shareWithUserHandler).Methods("POST")
	api.HandleFunc("/files/{id:[0-9]+}/share-public", makeFilePrivateHandler).Methods("DELETE")
	api.HandleFunc("/files/{id:[0-9]+}/share", unshareFileHandler).Methods("DELETE") // to delete only from one
	api.HandleFunc("/files/{id:[0-9]+}/download", authenticatedDownloadHandler).Methods("GET")
	api.HandleFunc("/files/shared-by-me", listMySharedFilesHandler).Methods("GET")
	api.HandleFunc("/logs", getUserAuditLogsHandler).Methods("GET")

	// Admin-only routes
	adminAPI := api.PathPrefix("/admin").Subrouter()
	adminAPI.Use(adminOnlyMiddleware)
	adminAPI.HandleFunc("/files/all", adminListAllFilesHandler).Methods("POST")

	// NEW: CORS configuration
	// This must wrap the main router `r`. It allows requests from your frontend.
	corsHandler := handlers.CORS(
		handlers.AllowedOrigins([]string{"http://localhost:5173","https://keyvia.vercel.app","https://keyvia-backend.onrender.com"}), // Your React app's origin
		handlers.AllowedMethods([]string{"GET", "POST", "DELETE", "OPTIONS"}),
		handlers.AllowedHeaders([]string{"Content-Type", "Authorization"}),
	)(r)

	fmt.Println("Server running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", corsHandler)) // Use the corsHandler
}

