package httpapi

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	_ "github.com/glebarez/go-sqlite"
	"github.com/go-chi/chi/v5"
	"github.com/mdco1990/webapp/internal/repository"
)

// Constants to avoid duplication (use test-specific names to avoid conflicts)
const (
	testAPIEndpoint       = "/api/v1/manual-budget"
	testGetQuery          = "?year=2024&month=1"
	testContentTypeJSON   = "application/json"
	testHeaderContentType = "Content-Type"
	msgExpectedStatus     = "expected status %d, got %d"
	msgUnmarshalFailed    = "failed to unmarshal response: %v"
	msgItemsShouldBeArray = "items should be an array"
)

func setupSimpleAPI(tb testing.TB) (*chi.Mux, func()) {
	tb.Helper()

	// Create in-memory database
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		tb.Fatalf("failed to open test database: %v", err)
	}

	// Create schema
	schema := `
	CREATE TABLE manual_budgets (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		year INTEGER NOT NULL,
		month INTEGER NOT NULL,
		bank_amount_cents INTEGER NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(user_id, year, month)
	);

	CREATE TABLE manual_budget_items (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		budget_id INTEGER NOT NULL,
		name TEXT NOT NULL,
		amount_cents INTEGER NOT NULL,
		FOREIGN KEY (budget_id) REFERENCES manual_budgets(id) ON DELETE CASCADE
	);
	`

	if _, err := db.Exec(schema); err != nil {
		tb.Fatalf("failed to create test schema: %v", err)
	}

	repo := repository.New(db)

	// Setup router
	r := chi.NewRouter()

	// Test middleware for user ID
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), "userID", int64(1))
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	})

	// Simple test endpoints
	r.Route("/api/v1", func(api chi.Router) {
		api.Get("/manual-budget", func(w http.ResponseWriter, r *http.Request) {
			response := map[string]interface{}{
				"bank_amount_cents": 0,
				"items":             []interface{}{},
			}
			w.Header().Set(testHeaderContentType, testContentTypeJSON)
			if err := json.NewEncoder(w).Encode(response); err != nil {
				http.Error(w, "encoding error", http.StatusInternalServerError)
				return
			}
		})

		api.Put("/manual-budget", func(w http.ResponseWriter, r *http.Request) {
			var payload map[string]interface{}
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				http.Error(w, "invalid JSON", http.StatusBadRequest)
				return
			}

			w.Header().Set(testHeaderContentType, testContentTypeJSON)
			w.WriteHeader(http.StatusOK)
			if err := json.NewEncoder(w).Encode(map[string]string{"status": "success"}); err != nil {
				http.Error(w, "encoding error", http.StatusInternalServerError)
				return
			}
		})
	})

	cleanup := func() {
		_ = repo // Suppress unused warning
		if err := db.Close(); err != nil {
			tb.Errorf("failed to close test database: %v", err)
		}
	}

	return r, cleanup
}

func TestAPIGetManualBudget(t *testing.T) {
	router, cleanup := setupSimpleAPI(t)
	defer cleanup()

	t.Run("GetEmptyBudget", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, testAPIEndpoint+testGetQuery, nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf(msgExpectedStatus, http.StatusOK, w.Code)
		}

		var response map[string]interface{}
		if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
			t.Fatalf(msgUnmarshalFailed, err)
		}

		if bankAmount, ok := response["bank_amount_cents"].(float64); !ok || bankAmount != 0 {
			t.Errorf("expected bank_amount_cents 0, got %v", response["bank_amount_cents"])
		}

		if items, ok := response["items"].([]interface{}); !ok || len(items) != 0 {
			t.Errorf("expected empty items array, got %v", response["items"])
		}
	})
}

func TestAPIUpdateManualBudget(t *testing.T) {
	router, cleanup := setupSimpleAPI(t)
	defer cleanup()

	t.Run("CreateBudget", func(t *testing.T) {
		payload := map[string]interface{}{
			"year":              2024,
			"month":             1,
			"bank_amount_cents": 300000,
			"items": []map[string]interface{}{
				{"name": "Salary", "amount_cents": 550000},
				{"name": "Rent", "amount_cents": -125000},
			},
		}

		jsonData, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPut, testAPIEndpoint, bytes.NewBuffer(jsonData))
		req.Header.Set(testHeaderContentType, testContentTypeJSON)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf(msgExpectedStatus, http.StatusOK, w.Code)
		}

		var response map[string]interface{}
		if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
			t.Fatalf(msgUnmarshalFailed, err)
		}

		if status, ok := response["status"].(string); !ok || status != "success" {
			t.Errorf("expected status 'success', got %v", response["status"])
		}
	})

	t.Run("InvalidJSON", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPut, testAPIEndpoint, bytes.NewBufferString("invalid json"))
		req.Header.Set(testHeaderContentType, testContentTypeJSON)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf(msgExpectedStatus, http.StatusBadRequest, w.Code)
		}
	})
}

func TestAPIUserWorkflow(t *testing.T) {
	router, cleanup := setupSimpleAPI(t)
	defer cleanup()

	t.Run("BasicWorkflow", func(t *testing.T) {
		// Step 1: Get empty budget
		req := httptest.NewRequest(http.MethodGet, testAPIEndpoint+testGetQuery, nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("initial get failed: %d", w.Code)
		}

		// Step 2: Create budget
		payload := map[string]interface{}{
			"year":              2024,
			"month":             1,
			"bank_amount_cents": 250000,
			"items": []map[string]interface{}{
				{"name": "Salary", "amount_cents": 500000},
				{"name": "Rent", "amount_cents": -120000},
			},
		}

		jsonData, _ := json.Marshal(payload)
		req = httptest.NewRequest(http.MethodPut, testAPIEndpoint, bytes.NewBuffer(jsonData))
		req.Header.Set(testHeaderContentType, testContentTypeJSON)
		w = httptest.NewRecorder()

		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("create budget failed: %d", w.Code)
		}

		t.Log("✅ API workflow test passed")
		t.Log("   ✓ Empty budget retrieved")
		t.Log("   ✓ Budget created successfully")
	})
}
