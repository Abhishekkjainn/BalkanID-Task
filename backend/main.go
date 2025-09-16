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
	"mime/multipart"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

var conn *pgx.Conn
var cld *cloudinary.Cloudinary

// initDB connects to PostgreSQL
func initDB() {
	var err error
	conn, err = pgx.Connect(context.Background(),
		"postgres://postgres:Abhishekaarya%401902@localhost:5432/mydb?sslmode=disable",
	)
	if err != nil {
		log.Fatal("Unable to connect to database: ", err)
	}
	fmt.Println("Connected to PostgreSQL!")
}

// initCloudinary initializes the Cloudinary client
func initCloudinary() {
	_ = godotenv.Load()
	var err error
	cld, err = cloudinary.NewFromParams(
		os.Getenv("CLOUDINARY_CLOUD_NAME"),
		os.Getenv("CLOUDINARY_API_KEY"),
		os.Getenv("CLOUDINARY_API_SECRET"),
	)
	if err != nil {
		log.Fatalf("Failed to initialize Cloudinary: %v", err)
	}
	fmt.Println("Cloudinary client initialized successfully!")
}

// UPDATED: Schema now includes file_shares table
func ensureFilesSchema() error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name VARCHAR(100) NOT NULL,
            role VARCHAR(20) DEFAULT 'user' NOT NULL,
            last_login TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`,
		`CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users (username)`,
		`CREATE TABLE IF NOT EXISTS physical_files (
            id SERIAL PRIMARY KEY,
            hash CHAR(64) UNIQUE NOT NULL,
            storage_url TEXT NOT NULL,
            public_id TEXT NOT NULL,
            size BIGINT NOT NULL,
            mime_type VARCHAR(100) NOT NULL,
            ref_count INT DEFAULT 1 NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`,
		`CREATE TABLE IF NOT EXISTS user_files (
            id SERIAL PRIMARY KEY,
            owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            physical_file_id INT NOT NULL REFERENCES physical_files(id) ON DELETE RESTRICT,
            filename VARCHAR(255) NOT NULL,
            is_public BOOLEAN DEFAULT FALSE NOT NULL,
            download_count INT DEFAULT 0 NOT NULL,
            uploaded_at TIMESTAMPTZ DEFAULT NOW()
        )`,
		// NEW TABLE for sharing files with specific users
		`CREATE TABLE IF NOT EXISTS file_shares (
			id SERIAL PRIMARY KEY,
			user_file_id INT NOT NULL REFERENCES user_files(id) ON DELETE CASCADE,
			recipient_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			shared_at TIMESTAMPTZ DEFAULT NOW(),
			UNIQUE(user_file_id, recipient_id) -- Prevents sharing the same file with the same user multiple times
		)`,
		`CREATE INDEX IF NOT EXISTS user_files_owner_id_idx ON user_files(owner_id)`,
		`CREATE INDEX IF NOT EXISTS physical_files_hash_idx ON physical_files(hash)`,
		`CREATE INDEX IF NOT EXISTS file_shares_recipient_id_idx ON file_shares(recipient_id)`,
	}

	for _, s := range stmts {
		if _, err := conn.Exec(context.Background(), s); err != nil {
			return fmt.Errorf("failed to execute schema statement: %w", err)
		}
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, body interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

// --- AUTHENTICATION HELPERS ---
func authenticateUserFromForm(r *http.Request) (int, error) {
	username := r.FormValue("username")
	password := r.FormValue("password")
	if username == "" || password == "" { return 0, errors.New("username and password form values are required") }
	return verifyCredentials(username, password)
}

// NEW: Auth helper for JSON bodies to reduce code duplication
type AuthRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}
func authenticateUserFromJSON(r *http.Request) (int, *AuthRequest, error) {
	var req AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return 0, nil, errors.New("invalid JSON body for authentication")
	}
	req.Username = strings.TrimSpace(req.Username)
	if req.Username == "" || req.Password == "" {
		return 0, nil, errors.New("username and password are required in JSON body")
	}
	userID, err := verifyCredentials(req.Username, req.Password)
	if err != nil {
		return 0, nil, err
	}
	return userID, &req, nil
}

func verifyCredentials(username, password string) (int, error) {
	var id int
	var storedHash string
	err := conn.QueryRow(context.Background(), `SELECT id, password_hash FROM users WHERE username = $1`, username).Scan(&id, &storedHash)
	if err != nil { return 0, errors.New("invalid credentials") }
	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(password)); err != nil { return 0, errors.New("invalid credentials") }
	return id, nil
}


// --- USER HANDLERS (Unchanged) ---
func signupHandler(w http.ResponseWriter, r *http.Request) {
	var req struct { Username string `json:"username"`; Password string `json:"password"`; Name string `json:"name"` }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { writeError(w, http.StatusBadRequest, "Invalid JSON"); return }
	req.Username = strings.TrimSpace(req.Username); req.Name = strings.TrimSpace(req.Name)
	if req.Username == "" || req.Password == "" || req.Name == "" { writeError(w, http.StatusBadRequest, "Username, password, and name are required"); return }
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil { writeError(w, http.StatusInternalServerError, "Failed to hash password"); return }
	_, err = conn.Exec(context.Background(), `INSERT INTO users (username, password_hash, name) VALUES ($1, $2, $3)`, req.Username, string(hash), req.Name)
	if err != nil {
		if strings.Contains(err.Error(), "23505") { writeError(w, http.StatusConflict, "Username already exists"); return }
		writeError(w, http.StatusInternalServerError, "Failed to create user"); return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"message": "Signup successful"})
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	var req struct { Username string `json:"username"`; Password string `json:"password"`}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { writeError(w, http.StatusBadRequest, "Invalid JSON"); return }
	username := strings.TrimSpace(req.Username)
	userID, err := verifyCredentials(username, req.Password)
	if err != nil { writeError(w, http.StatusUnauthorized, "Invalid username or password"); return }

	var name string
	_ = conn.QueryRow(context.Background(), `SELECT name FROM users WHERE id = $1`, userID).Scan(&name)
	_, _ = conn.Exec(context.Background(), `UPDATE users SET last_login = NOW() WHERE id = $1`, userID)
	writeJSON(w, http.StatusOK, map[string]interface{}{ "message": "Login successful", "user": map[string]interface{}{"id": userID, "username": username, "name": name}, })
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second); defer cancel()
	if err := conn.Ping(ctx); err != nil { writeJSON(w, http.StatusServiceUnavailable, map[string]string{ "status": "unhealthy", "error": err.Error(),}); return }
	writeJSON(w, http.StatusOK, map[string]string{ "status": "healthy", "time": time.Now().Format(time.RFC3339),})
}

// --- FILE HANDLERS ---


// UPGRADED: Now includes a 10MB per-user storage quota check
func uploadHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := authenticateUserFromForm(r)
	if err != nil { writeError(w, http.StatusUnauthorized, err.Error()); return }

	if err := r.ParseMultipartForm(50 << 20); err != nil { writeError(w, http.StatusBadRequest, "Error parsing form"); return }
	
	files := r.MultipartForm.File["files"]
	if len(files) == 0 { writeError(w, http.StatusBadRequest, "No files provided"); return }

	// --- NEW: STORAGE QUOTA LOGIC ---
	const maxStorageBytes = 10 * 1024 * 1024 // 10 MB

	ctx := context.Background()
	var newFilesSize int64 = 0
	var newHashes []string

	// 1. Calculate the total size of ONLY the new files that need to be uploaded.
	for _, fileHeader := range files {
		file, err := fileHeader.Open(); if err != nil { writeError(w, http.StatusInternalServerError, "Could not read file for quota check"); return };
		
		hash := sha256.New(); if _, err := io.Copy(hash, file); err != nil { writeError(w, http.StatusInternalServerError, "Could not hash file for quota check"); return };
		file.Close() // Close the file handle immediately after reading
		hashStr := hex.EncodeToString(hash.Sum(nil))

		var exists bool
		err = conn.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM physical_files WHERE hash = $1)", hashStr).Scan(&exists)
		if err != nil { writeError(w, http.StatusInternalServerError, "Database error during quota check"); return }
		
		if !exists {
			// This is a new file, check if we've already seen this hash in the current batch
			isDuplicateInBatch := false
			for _, h := range newHashes {
				if h == hashStr {
					isDuplicateInBatch = true
					break
				}
			}
			if !isDuplicateInBatch {
				newFilesSize += fileHeader.Size
				newHashes = append(newHashes, hashStr)
			}
		}
	}

	// 2. Get the user's current deduplicated storage usage.
	var currentUsageBytes int64
	err = conn.QueryRow(ctx, `
		SELECT COALESCE(SUM(pf.size), 0) FROM physical_files pf 
		WHERE pf.id IN (SELECT DISTINCT physical_file_id FROM user_files WHERE owner_id = $1)`, userID).Scan(&currentUsageBytes)
	if err != nil { writeError(w, http.StatusInternalServerError, "Could not retrieve user storage usage"); return }

	// 3. Enforce the quota.
	if currentUsageBytes+newFilesSize > maxStorageBytes {
		errorMessage := fmt.Sprintf(
			"Storage quota exceeded. Your current usage is %.2f MB. This upload would add %.2f MB, exceeding the %.2f MB limit.",
			float64(currentUsageBytes)/1024/1024,
			float64(newFilesSize)/1024/1024,
			float64(maxStorageBytes)/1024/1024,
		)
		writeError(w, http.StatusForbidden, errorMessage)
		return
	}
	// --- END OF STORAGE QUOTA LOGIC ---


	// If quota check passes, proceed with the original upload logic
	var uploadedFiles []map[string]interface{}
	for _, fileHeader := range files {
		processedFile, err := processAndUploadFile(userID, fileHeader)
		if err != nil { writeError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to process file %s: %v", fileHeader.Filename, err)); return }
		uploadedFiles = append(uploadedFiles, processedFile)
	}
	writeJSON(w, http.StatusCreated, map[string]interface{}{ "message": "Files uploaded successfully", "uploadedCount": len(uploadedFiles), "files": uploadedFiles, })
}

func processAndUploadFile(userID int, header *multipart.FileHeader) (map[string]interface{}, error) {
	file, err := header.Open(); if err != nil { return nil, err }; defer file.Close()
	hash := sha256.New(); if _, err := io.Copy(hash, file); err != nil { return nil, err }
	hashStr := hex.EncodeToString(hash.Sum(nil))
	if _, err := file.Seek(0, 0); err != nil { return nil, err }
	ctx := context.Background(); tx, err := conn.Begin(ctx); if err != nil { return nil, err }; defer tx.Rollback(ctx)
	var physicalFileID int; var wasDeduplicated bool
	err = tx.QueryRow(ctx, "SELECT id FROM physical_files WHERE hash = $1", hashStr).Scan(&physicalFileID)
	if err == pgx.ErrNoRows {
		wasDeduplicated = false
		uploadResult, uploadErr := cld.Upload.Upload(ctx, file, uploader.UploadParams{ResourceType: "auto"})
		if uploadErr != nil { return nil, fmt.Errorf("step 1: cloudinary upload failed: %w", uploadErr) }
		insertErr := tx.QueryRow(ctx, `INSERT INTO physical_files (hash, storage_url, public_id, size, mime_type) VALUES ($1, $2, $3, $4, $5) RETURNING id`, hashStr, uploadResult.SecureURL, uploadResult.PublicID, header.Size, header.Header.Get("Content-Type")).Scan(&physicalFileID)
		if insertErr != nil { return nil, fmt.Errorf("step 2: failed to insert new physical file record: %w", insertErr) }
	} else if err != nil {
		return nil, fmt.Errorf("step 3: failed to check for existing file hash: %w", err)
	} else {
		wasDeduplicated = true
		_, updateErr := tx.Exec(ctx, "UPDATE physical_files SET ref_count = ref_count + 1 WHERE id = $1", physicalFileID)
		if updateErr != nil { return nil, fmt.Errorf("step 4: failed to update reference count for duplicate file: %w", updateErr) }
	}
	var userFileID int; var uploadedAt time.Time
	err = tx.QueryRow(ctx, `INSERT INTO user_files (owner_id, physical_file_id, filename) VALUES ($1, $2, $3) RETURNING id, uploaded_at`, userID, physicalFileID, header.Filename).Scan(&userFileID, &uploadedAt)
	if err != nil { return nil, fmt.Errorf("step 5: failed to create user file reference: %w", err) }
	if err := tx.Commit(ctx); err != nil { return nil, fmt.Errorf("step 6: failed to commit transaction: %w", err) }
	return map[string]interface{}{ "userFileId": userFileID, "filename": header.Filename, "size": header.Size, "uploadedAt": uploadedAt, "wasDeduplicated": wasDeduplicated }, nil
}

// UPDATED: Now shows owned files AND files shared with the user
// POST /files/search - Replaces the old listFilesHandler
func searchFilesHandler(w http.ResponseWriter, r *http.Request) {
	// Define a struct that holds all possible filters.
	// Pointers are used so we can distinguish between a filter not being present and a filter being an empty string.
	var req struct {
		AuthRequest
		Filters struct {
			Filename      *string    `json:"filename"`
			MimeType      *string    `json:"mimeType"`
			MinSize       *int64     `json:"minSize"`
			MaxSize       *int64     `json:"maxSize"`
			StartDate     *time.Time `json:"startDate"`
			EndDate       *time.Time `json:"endDate"`
		} `json:"filters"`
	}

	// Authenticate the user and decode the request body in one go.
	// Note: We need a custom decoder here because the 'filters' key might be absent.
	// For simplicity in this example, we assume the client will always send the 'filters' object, even if empty.
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON body for searching/filtering"); return
	}

	userID, err := verifyCredentials(req.Username, req.Password)
	if err != nil { writeError(w, http.StatusUnauthorized, err.Error()); return }


	// --- DYNAMIC & SECURE QUERY BUILDING ---
	// Base query fetches all data for owned files and files shared with the user.
	baseQuery := `
		SELECT
			uf.id, uf.filename, pf.size, pf.mime_type, uf.is_public,
			uf.download_count, uf.uploaded_at, pf.storage_url,
			u_owner.name AS owner_name,
			CASE WHEN uf.owner_id = $1 THEN NULL ELSE u_owner.name END AS shared_by
		FROM user_files uf
		JOIN physical_files pf ON uf.physical_file_id = pf.id
		JOIN users u_owner ON uf.owner_id = u_owner.id
		LEFT JOIN file_shares fs ON uf.id = fs.user_file_id
		WHERE (uf.owner_id = $1 OR fs.recipient_id = $1)
	`
	
	// Use a slice for arguments to prevent SQL injection.
	args := []interface{}{userID}
	conditions := []string{}
	argID := 2 // Start argument placeholders at $2

	if req.Filters.Filename != nil && *req.Filters.Filename != "" {
		conditions = append(conditions, fmt.Sprintf("uf.filename ILIKE $%d", argID))
		args = append(args, "%"+*req.Filters.Filename+"%")
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

	// Combine all parts of the query
	finalQuery := baseQuery
	if len(conditions) > 0 {
		finalQuery += " AND " + strings.Join(conditions, " AND ")
	}
	finalQuery += ` ORDER BY uf.uploaded_at DESC`

	// Execute the dynamically built query
	rows, err := conn.Query(context.Background(), finalQuery, args...); if err != nil { writeError(w, http.StatusInternalServerError, "Failed to query files: "+err.Error()); return }; defer rows.Close()

	type FileInfo struct { ID int `json:"id"`; Filename string `json:"filename"`; Size int64 `json:"size"`; MimeType string `json:"mimeType"`; IsPublic bool `json:"isPublic"`; DownloadCount int `json:"downloadCount"`; UploadedAt time.Time `json:"uploadedAt"`; URL string `json:"url"`; OwnerName string `json:"ownerName"`; SharedBy *string `json:"sharedBy,omitempty"`}
	var files []FileInfo
	for rows.Next() {
		var f FileInfo
		if err := rows.Scan(&f.ID, &f.Filename, &f.Size, &f.MimeType, &f.IsPublic, &f.DownloadCount, &f.UploadedAt, &f.URL, &f.OwnerName, &f.SharedBy); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to scan file data: "+err.Error()); return
		}
		files = append(files, f)
	}
	writeJSON(w, http.StatusOK, files)
}

func deleteFileHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r); userFileID, err := strconv.Atoi(vars["id"]); if err != nil { writeError(w, http.StatusBadRequest, "Invalid file ID"); return }
	userID, _, err := authenticateUserFromJSON(r); if err != nil { writeError(w, http.StatusUnauthorized, err.Error()); return }
	ctx := context.Background(); tx, err := conn.Begin(ctx); if err != nil { writeError(w, http.StatusInternalServerError, "Could not start transaction"); return }; defer tx.Rollback(ctx)
	var ownerID, physicalFileID int
	err = tx.QueryRow(ctx, "SELECT owner_id, physical_file_id FROM user_files WHERE id = $1", userFileID).Scan(&ownerID, &physicalFileID)
	if err != nil { writeError(w, http.StatusNotFound, "File not found"); return }
	if ownerID != userID { writeError(w, http.StatusForbidden, "You are not the owner of this file"); return }
	_, err = tx.Exec(ctx, "DELETE FROM user_files WHERE id = $1", userFileID)
	if err != nil { writeError(w, http.StatusInternalServerError, "Failed to delete file reference"); return }
	var refCount int; var publicID string
	err = tx.QueryRow(ctx, "UPDATE physical_files SET ref_count = ref_count - 1 WHERE id = $1 RETURNING ref_count, public_id", physicalFileID).Scan(&refCount, &publicID)
	if err != nil { writeError(w, http.StatusInternalServerError, "Failed to update file reference count"); return }
	if refCount == 0 {
		_, err := cld.Upload.Destroy(ctx, uploader.DestroyParams{PublicID: publicID})
		if err != nil { log.Printf("Orphaned file warning: Could not delete file %s from Cloudinary: %v", publicID, err) }
		_, err = tx.Exec(ctx, "DELETE FROM physical_files WHERE id = $1", physicalFileID)
		if err != nil { writeError(w, http.StatusInternalServerError, "Failed to delete physical file record"); return }
	}
	if err := tx.Commit(ctx); err != nil { writeError(w, http.StatusInternalServerError, "Failed to commit transaction"); return }
	writeJSON(w, http.StatusOK, map[string]string{"message": "File deleted successfully"})
}

func shareFileHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r); userFileID, err := strconv.Atoi(vars["id"]); if err != nil { writeError(w, http.StatusBadRequest, "Invalid file ID"); return }
	userID, _, err := authenticateUserFromJSON(r); if err != nil { writeError(w, http.StatusUnauthorized, err.Error()); return }
	var ownerID int
	err = conn.QueryRow(context.Background(), "SELECT owner_id FROM user_files WHERE id = $1", userFileID).Scan(&ownerID)
	if err != nil { writeError(w, http.StatusNotFound, "File not found"); return }
	if ownerID != userID { writeError(w, http.StatusForbidden, "You are not the owner of this file"); return }
	_, err = conn.Exec(context.Background(), "UPDATE user_files SET is_public = true WHERE id = $1", userFileID)
	if err != nil { writeError(w, http.StatusInternalServerError, "Failed to make file public"); return }
	publicLink := fmt.Sprintf("%s://%s/files/public/%d", "http", r.Host, userFileID)
	writeJSON(w, http.StatusOK, map[string]string{ "message": "File is now public", "publicLink": publicLink })
}

func publicDownloadHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r); userFileID, err := strconv.Atoi(vars["id"]); if err != nil { writeError(w, http.StatusBadRequest, "Invalid file ID"); return }
	ctx := context.Background(); tx, err := conn.Begin(ctx); if err != nil { writeError(w, http.StatusInternalServerError, "Database error"); return }; defer tx.Rollback(ctx)
	var isPublic bool; var storageURL string
	query := `SELECT uf.is_public, pf.storage_url FROM user_files uf JOIN physical_files pf ON uf.physical_file_id = pf.id WHERE uf.id = $1`
	err = tx.QueryRow(ctx, query, userFileID).Scan(&isPublic, &storageURL)
	if err != nil { writeError(w, http.StatusNotFound, "File not found"); return }
	if !isPublic { writeError(w, http.StatusForbidden, "This file is not public"); return }
	_, err = tx.Exec(ctx, "UPDATE user_files SET download_count = download_count + 1 WHERE id = $1", userFileID)
	if err != nil { log.Printf("Failed to increment download count for file %d: %v", userFileID, err) }
	if err := tx.Commit(ctx); err != nil { writeError(w, http.StatusInternalServerError, "Database error"); return }
	http.Redirect(w, r, storageURL, http.StatusFound)
}

// --- NEW HANDLERS FOR ANALYTICS AND SPECIFIC SHARING ---

// POST /files/{id}/share-with
func shareWithUserHandler(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r); userFileID, err := strconv.Atoi(vars["id"]); if err != nil { writeError(w, http.StatusBadRequest, "Invalid file ID"); return }

    var req struct {
        AuthRequest
        ShareWithUsername string `json:"shareWithUsername"`
    }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { writeError(w, http.StatusBadRequest, "Invalid JSON body"); return }
	
	userID, err := verifyCredentials(req.Username, req.Password)
	if err != nil { writeError(w, http.StatusUnauthorized, err.Error()); return }

    // Find the recipient's user ID
    var recipientID int
    err = conn.QueryRow(context.Background(), "SELECT id FROM users WHERE username = $1", req.ShareWithUsername).Scan(&recipientID)
    if err != nil {
        if err == pgx.ErrNoRows { writeError(w, http.StatusNotFound, "User to share with not found"); return }
        writeError(w, http.StatusInternalServerError, "Database error"); return
    }

	if userID == recipientID {
		writeError(w, http.StatusBadRequest, "You cannot share a file with yourself")
		return
	}

    // Verify ownership of the file being shared
    var ownerID int
    err = conn.QueryRow(context.Background(), "SELECT owner_id FROM user_files WHERE id = $1", userFileID).Scan(&ownerID)
    if err != nil { writeError(w, http.StatusNotFound, "File not found"); return }
    if ownerID != userID { writeError(w, http.StatusForbidden, "You are not the owner of this file"); return }

    // Insert the share record
    _, err = conn.Exec(context.Background(), `
        INSERT INTO file_shares (user_file_id, recipient_id) VALUES ($1, $2)
    `, userFileID, recipientID)
    if err != nil {
		if strings.Contains(err.Error(), "23505") { // Unique constraint violation
			writeJSON(w, http.StatusConflict, map[string]string{"message": "File already shared with this user"})
			return
		}
        writeError(w, http.StatusInternalServerError, "Failed to share file")
		return
    }

    writeJSON(w, http.StatusCreated, map[string]string{"message": fmt.Sprintf("File successfully shared with %s", req.ShareWithUsername)})
}


// POST /files/analytics
func analyticsHandler(w http.ResponseWriter, r *http.Request) {
	userID, _, err := authenticateUserFromJSON(r)
	if err != nil { writeError(w, http.StatusUnauthorized, err.Error()); return }

	ctx := context.Background()
	
	// --- 1. Storage Statistics ---
	var originalSize, deduplicatedSize int64
	// Original size is the sum of sizes of all user_files
	err = conn.QueryRow(ctx, `
		SELECT COALESCE(SUM(pf.size), 0) FROM user_files uf 
		JOIN physical_files pf ON uf.physical_file_id = pf.id 
		WHERE uf.owner_id = $1`, userID).Scan(&originalSize)
	if err != nil { writeError(w, http.StatusInternalServerError, "Error calculating original size"); return }

	// Deduplicated size is the sum of sizes of unique physical_files referenced by the user
	err = conn.QueryRow(ctx, `
		SELECT COALESCE(SUM(pf.size), 0) FROM physical_files pf 
		WHERE pf.id IN (SELECT DISTINCT physical_file_id FROM user_files WHERE owner_id = $1)`, userID).Scan(&deduplicatedSize)
	if err != nil { writeError(w, http.StatusInternalServerError, "Error calculating deduplicated size"); return }

	storageSavings := originalSize - deduplicatedSize
	var savingsPercentage float64
	if originalSize > 0 {
		savingsPercentage = (float64(storageSavings) / float64(originalSize)) * 100
	}

	storageStats := map[string]interface{}{
		"originalUsageBytes":      originalSize,
		"deduplicatedUsageBytes":  deduplicatedSize,
		"savingsBytes":            storageSavings,
		"savingsPercentage":       savingsPercentage,
	}

	// --- 2. Uploads Over Time (Graph Data) ---
	type UploadsByDay struct { Day time.Time `json:"day"`; Count int `json:"count"` }
	var uploadsTimeline []UploadsByDay
	rows, err := conn.Query(ctx, `
		SELECT DATE_TRUNC('day', uploaded_at)::DATE AS day, COUNT(*)
		FROM user_files WHERE owner_id = $1 GROUP BY day ORDER BY day`, userID)
	if err == nil {
		for rows.Next() {
			var u UploadsByDay
			rows.Scan(&u.Day, &u.Count)
			uploadsTimeline = append(uploadsTimeline, u)
		}
		rows.Close()
	}

	// --- 3. File Type Breakdown (Graph Data) ---
	type MimeTypeCount struct { MimeType string `json:"mimeType"`; Count int `json:"count"` }
	var mimeTypeCounts []MimeTypeCount
	rows, err = conn.Query(ctx, `
		SELECT pf.mime_type, COUNT(uf.id)
		FROM user_files uf JOIN physical_files pf ON uf.physical_file_id = pf.id
		WHERE uf.owner_id = $1 GROUP BY pf.mime_type`, userID)
	if err == nil {
		for rows.Next() {
			var m MimeTypeCount
			rows.Scan(&m.MimeType, &m.Count)
			mimeTypeCounts = append(mimeTypeCounts, m)
		}
		rows.Close()
	}

	// --- 4. Top 5 Most Downloaded Files ---
	type TopFile struct { Filename string `json:"filename"`; DownloadCount int `json:"downloadCount"` }
	var topDownloaded []TopFile
	rows, err = conn.Query(ctx, `
		SELECT filename, download_count FROM user_files WHERE owner_id = $1 
		ORDER BY download_count DESC LIMIT 5`, userID)
	if err == nil {
		for rows.Next() {
			var t TopFile
			rows.Scan(&t.Filename, &t.DownloadCount)
			topDownloaded = append(topDownloaded, t)
		}
		rows.Close()
	}
	
	// Assemble final response
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"storageStatistics": storageStats,
		"uploadsByDay":      uploadsTimeline,
		"fileTypeBreakdown": mimeTypeCounts,
		"topDownloadedFiles": topDownloaded,
	})
}


func main() {
	initDB()
	initCloudinary()
	defer conn.Close(context.Background())

	if err := ensureFilesSchema(); err != nil {
		log.Fatal("Failed to ensure schemas: ", err)
	}

	r := mux.NewRouter()
	
	r.HandleFunc("/auth/signup", signupHandler).Methods("POST")
	r.HandleFunc("/auth/login", loginHandler).Methods("POST")
	r.HandleFunc("/health", healthHandler).Methods("GET")
	
	// File Management Endpoints
	r.HandleFunc("/files/upload", uploadHandler).Methods("POST")
	r.HandleFunc("/files/search", searchFilesHandler).Methods("POST")
	r.HandleFunc("/files/{id:[0-9]+}", deleteFileHandler).Methods("DELETE")
	r.HandleFunc("/files/public/{id:[0-9]+}", publicDownloadHandler).Methods("GET")

	// Sharing Endpoints
	r.HandleFunc("/files/{id:[0-9]+}/share-public", shareFileHandler).Methods("POST") // Renamed for clarity
	r.HandleFunc("/files/{id:[0-9]+}/share-with", shareWithUserHandler).Methods("POST") // NEW

	// Analytics Endpoint
	r.HandleFunc("/files/analytics", analyticsHandler).Methods("POST") // NEW

	fmt.Println("Server running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", r))
}