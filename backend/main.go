package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

var conn *pgx.Conn

// Connect to PostgreSQL
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

// Ensure users table with required auth fields
func ensureUsersSchema() error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			username VARCHAR(50) NOT NULL,
			password_hash TEXT NOT NULL,
			name VARCHAR(100) NOT NULL,
			last_login TIMESTAMPTZ
		)`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ALTER COLUMN password_hash DROP DEFAULT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100) NOT NULL DEFAULT ''`,
		`ALTER TABLE users ALTER COLUMN name DROP DEFAULT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ`,
		`ALTER TABLE users DROP COLUMN IF EXISTS email`,
		`CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users (username)`,
	}
	for _, s := range stmts {
		if _, err := conn.Exec(context.Background(), s); err != nil {
			return err
		}
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, body interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

// POST /auth/signup {username, password, name}
func signupHandler(w http.ResponseWriter, r *http.Request) {
	if err := ensureUsersSchema(); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "schema error: " + err.Error()})
		return
	}

	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
		Name     string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}

	req.Username = strings.TrimSpace(req.Username)
	req.Name = strings.TrimSpace(req.Name)
	if req.Username == "" || req.Password == "" || req.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "username, password, and name are required"})
		return
	}

	if len(req.Username) > 50 || len(req.Name) > 100 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "username or name too long"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to hash password"})
		return
	}

	_, err = conn.Exec(context.Background(),
		`INSERT INTO users (username, password_hash, name) VALUES ($1, $2, $3)`,
		req.Username, string(hash), req.Name,
	)
	if err != nil {
		if strings.Contains(err.Error(), "23505") {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "username already exists"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create user"})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"message":  "signup successful",
		"username": req.Username,
		"name":     req.Name,
	})
}

// POST /auth/login {username, password}
func loginHandler(w http.ResponseWriter, r *http.Request) {
	if err := ensureUsersSchema(); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "schema error: " + err.Error()})
		return
	}

	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}

	req.Username = strings.TrimSpace(req.Username)
	if req.Username == "" || req.Password == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "username and password are required"})
		return
	}

	var storedHash, name string
	var id int
	err := conn.QueryRow(context.Background(),
		`SELECT id, password_hash, name FROM users WHERE username = $1`, req.Username,
	).Scan(&id, &storedHash, &name)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid username or password"})
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(req.Password)) != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid username or password"})
		return
	}

	_, _ = conn.Exec(context.Background(), `UPDATE users SET last_login = NOW() WHERE id = $1`, id)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"message": "login successful",
		"user": map[string]interface{}{
			"id":       id,
			"username": req.Username,
			"name":     name,
		},
	})
}

// API handler to list users
func getUsersHandler(w http.ResponseWriter, r *http.Request) {
	if err := ensureUsersSchema(); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "schema error: " + err.Error()})
		return
	}

	rows, err := conn.Query(context.Background(), "SELECT id, username, name, last_login FROM users ORDER BY id ASC")
	if err != nil {
		http.Error(w, "Error querying users: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type user struct {
		ID        int        `json:"id"`
		Username  string     `json:"username"`
		Name      string     `json:"name"`
		LastLogin *time.Time `json:"last_login"`
	}

	users := make([]user, 0)
	for rows.Next() {
		var u user
		if err := rows.Scan(&u.ID, &u.Username, &u.Name, &u.LastLogin); err != nil {
			http.Error(w, "Error scanning row: "+err.Error(), http.StatusInternalServerError)
			return
		}
		users = append(users, u)
	}
	if rows.Err() != nil {
		http.Error(w, "Row iteration error: "+rows.Err().Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, users)
}

// POST /auth/forgot-password {username, new_password}
func forgotPasswordHandler(w http.ResponseWriter, r *http.Request) {
	if err := ensureUsersSchema(); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "schema error: " + err.Error()})
		return
	}

	var req struct {
		Username    string `json:"username"`
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}

	req.Username = strings.TrimSpace(req.Username)
	if req.Username == "" || req.NewPassword == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "username and new_password are required"})
		return
	}

	var id int
	err := conn.QueryRow(context.Background(),
		`SELECT id FROM users WHERE username=$1`, req.Username,
	).Scan(&id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "user not found"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to hash password"})
		return
	}

	_, err = conn.Exec(context.Background(),
		`UPDATE users SET password_hash=$1 WHERE id=$2`, string(hash), id,
	)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to update password"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "password updated successfully"})
}

// GET /health
func healthHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := conn.Ping(ctx); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"status": "unhealthy",
			"error":  err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"status": "healthy",
		"time":   time.Now().Format(time.RFC3339),
	})
}

func main() {
	initDB()
	defer conn.Close(context.Background())

	r := mux.NewRouter()
	r.HandleFunc("/auth/signup", signupHandler).Methods("POST")
	r.HandleFunc("/auth/login", loginHandler).Methods("POST")
	r.HandleFunc("/auth/forgot-password", forgotPasswordHandler).Methods("POST")
	r.HandleFunc("/users", getUsersHandler).Methods("GET")
	r.HandleFunc("/health", healthHandler).Methods("GET")

	fmt.Println("Server running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", r))
}
