package httpapi

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/mdco1990/webapp/internal/config"
	"github.com/mdco1990/webapp/internal/db"
)

// setupTestDB creates an in-memory database for testing
func setupTestDB(t *testing.T) *sql.DB {
	t.Helper()
	database, err := db.Open("sqlite", ":memory:", "")
	if err != nil {
		t.Fatalf("Failed to create test database: %v", err)
	}

	// Run migrations
	if err := db.Migrate(database); err != nil {
		if err := database.Close(); err != nil {
			t.Logf("Failed to close database: %v", err)
		}
		t.Fatalf("Failed to run migrations: %v", err)
	}

	return database
}

func TestNewRouter(t *testing.T) {
	// Create test config
	cfg := config.Config{
		HTTPAddress:        "127.0.0.1:8082",
		DBDriver:           "sqlite",
		DBPath:             ":memory:",
		CORSAllowedOrigins: []string{"http://localhost:3000"},
		Env:                "test",
		LogLevel:           "debug",
		LogFormat:          "text",
	}

	// Create test database
	database := setupTestDB(t)
	defer func() {
		if err := database.Close(); err != nil {
			t.Logf("Failed to close database: %v", err)
		}
	}()

	// Create router with real database
	router := NewRouter(cfg, database)
	if router == nil {
		t.Fatal("Expected router to be created")
	}
}

func TestHealthEndpoint(t *testing.T) {
	// Create test config
	cfg := config.Config{
		HTTPAddress:        "127.0.0.1:8082",
		DBDriver:           "sqlite",
		DBPath:             ":memory:",
		CORSAllowedOrigins: []string{"http://localhost:3000"},
		Env:                "test",
		LogLevel:           "debug",
		LogFormat:          "text",
	}

	// Create test database
	database := setupTestDB(t)
	defer func() {
		if err := database.Close(); err != nil {
			t.Logf("Failed to close database: %v", err)
		}
	}()

	// Create router
	router := NewRouter(cfg, database)

	// Create test request
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	w := httptest.NewRecorder()

	// Serve request
	router.ServeHTTP(w, req)

	// Check response
	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	// Check response body contains status ok
	responseBody := w.Body.String()
	if !strings.Contains(responseBody, `"status":"ok"`) {
		t.Errorf("Expected body to contain status ok, got %s", responseBody)
	}
}

func TestCORSHeaders(t *testing.T) {
	// Create test config with CORS
	cfg := config.Config{
		HTTPAddress:        "127.0.0.1:8082",
		DBDriver:           "sqlite",
		DBPath:             ":memory:",
		CORSAllowedOrigins: []string{"http://localhost:3000"},
		Env:                "test",
		LogLevel:           "debug",
		LogFormat:          "text",
	}

	// Create test database
	database := setupTestDB(t)
	defer func() {
		if err := database.Close(); err != nil {
			t.Logf("Failed to close database: %v", err)
		}
	}()

	// Create router
	router := NewRouter(cfg, database)

	// Test preflight request
	req := httptest.NewRequest(http.MethodOptions, "/api/test", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	req.Header.Set("Access-Control-Request-Method", "POST")
	req.Header.Set("Access-Control-Request-Headers", "Content-Type")
	w := httptest.NewRecorder()

	// Serve request
	router.ServeHTTP(w, req)

	// Check CORS headers
	if w.Header().Get("Access-Control-Allow-Origin") != "http://localhost:3000" {
		t.Errorf("Expected CORS origin header, got %s", w.Header().Get("Access-Control-Allow-Origin"))
	}

	if w.Header().Get("Access-Control-Allow-Methods") == "" {
		t.Error("Expected CORS methods header")
	}

	if w.Header().Get("Access-Control-Allow-Headers") == "" {
		t.Error("Expected CORS headers header")
	}
}

func TestNotFoundHandler(t *testing.T) {
	// Create test config
	cfg := config.Config{
		HTTPAddress:        "127.0.0.1:8082",
		DBDriver:           "sqlite",
		DBPath:             ":memory:",
		CORSAllowedOrigins: []string{"http://localhost:3000"},
		Env:                "test",
		LogLevel:           "debug",
		LogFormat:          "text",
	}

	// Create test database
	database := setupTestDB(t)
	defer func() {
		if err := database.Close(); err != nil {
			t.Logf("Failed to close database: %v", err)
		}
	}()

	// Create router
	router := NewRouter(cfg, database)

	// Test non-existent endpoint
	req := httptest.NewRequest(http.MethodGet, "/nonexistent", nil)
	w := httptest.NewRecorder()

	// Serve request
	router.ServeHTTP(w, req)

	// Check response
	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status 404, got %d", w.Code)
	}
}

func TestMethodNotAllowed(t *testing.T) {
	// Create test config
	cfg := config.Config{
		HTTPAddress:        "127.0.0.1:8082",
		DBDriver:           "sqlite",
		DBPath:             ":memory:",
		CORSAllowedOrigins: []string{"http://localhost:3000"},
		Env:                "test",
		LogLevel:           "debug",
		LogFormat:          "text",
	}

	// Create test database
	database := setupTestDB(t)
	defer func() {
		if err := database.Close(); err != nil {
			t.Logf("Failed to close database: %v", err)
		}
	}()

	// Create router
	router := NewRouter(cfg, database)

	// Test POST to health endpoint (should not be allowed)
	req := httptest.NewRequest(http.MethodPost, "/healthz", nil)
	w := httptest.NewRecorder()

	// Serve request
	router.ServeHTTP(w, req)

	// Check response
	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("Expected status 405, got %d", w.Code)
	}
}

func TestRouterMiddleware(t *testing.T) {
	// Create test config
	cfg := config.Config{
		HTTPAddress:        "127.0.0.1:8082",
		DBDriver:           "sqlite",
		DBPath:             ":memory:",
		CORSAllowedOrigins: []string{"http://localhost:3000"},
		Env:                "test",
		LogLevel:           "debug",
		LogFormat:          "text",
	}

	// Create test database
	database := setupTestDB(t)
	defer func() {
		if err := database.Close(); err != nil {
			t.Logf("Failed to close database: %v", err)
		}
	}()

	// Create router
	router := NewRouter(cfg, database)

	// Test that middleware is applied (check for common headers)
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	w := httptest.NewRecorder()

	// Serve request
	router.ServeHTTP(w, req)

	// Check for common middleware headers
	if w.Header().Get("Content-Type") == "" {
		t.Error("Expected Content-Type header from middleware")
	}
}

func TestRouterWithDatabase(t *testing.T) {
	// This test would require a mock database
	// For now, just test that router creation doesn't panic with nil DB
	cfg := config.Config{
		HTTPAddress:        "127.0.0.1:8082",
		DBDriver:           "sqlite",
		DBPath:             ":memory:",
		CORSAllowedOrigins: []string{"http://localhost:3000"},
		Env:                "test",
		LogLevel:           "debug",
		LogFormat:          "text",
	}

	// Create test database
	database := setupTestDB(t)
	defer func() {
		if err := database.Close(); err != nil {
			t.Logf("Failed to close database: %v", err)
		}
	}()

	// Should not panic
	router := NewRouter(cfg, database)
	if router == nil {
		t.Fatal("Router should not be nil")
	}
}

func TestRouterConcurrency(t *testing.T) {
	// Create test config
	cfg := config.Config{
		HTTPAddress:        "127.0.0.1:8082",
		DBDriver:           "sqlite",
		DBPath:             ":memory:",
		CORSAllowedOrigins: []string{"http://localhost:3000"},
		Env:                "test",
		LogLevel:           "debug",
		LogFormat:          "text",
	}

	// Create test database
	database := setupTestDB(t)
	defer func() {
		if err := database.Close(); err != nil {
			t.Logf("Failed to close database: %v", err)
		}
	}()

	// Create router
	router := NewRouter(cfg, database)

	// Test concurrent requests
	done := make(chan bool, 10)
	for i := 0; i < 10; i++ {
		go func(id int) {
			defer func() { done <- true }()

			req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != http.StatusOK {
				t.Errorf("Concurrent request %d failed with status %d", id, w.Code)
			}
		}(i)
	}

	// Wait for all goroutines to complete
	for i := 0; i < 10; i++ {
		<-done
	}
}
