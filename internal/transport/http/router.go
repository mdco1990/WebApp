package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"golang.org/x/crypto/bcrypt"

	"github.com/personal/webapp/internal/config"
	"github.com/personal/webapp/internal/domain"
	"github.com/personal/webapp/internal/middleware"
	"github.com/personal/webapp/internal/repository"
	"github.com/personal/webapp/internal/service"
)

const invalidBodyMsg = "invalid body"

// Context key for user ID
type contextKey string

const userIDKey contextKey = "userID"

// statusWriter wraps ResponseWriter to capture status code
type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

func NewRouter(cfg config.Config, db *sql.DB) http.Handler {
	r := chi.NewRouter()

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type", "X-API-Key", "Authorization"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Use(middleware.SecurityHeaders)
	r.Use(middleware.RequestID())

	// Basic request logging middleware (concise)
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			ww := &statusWriter{ResponseWriter: w, status: 200}
			next.ServeHTTP(ww, r)
			duration := time.Since(start)
			// Avoid logging sensitive headers
			logLine := map[string]any{
				"method": r.Method,
				"path":   r.URL.Path,
				"status": ww.status,
				"t":      duration.String(),
			}
			b, _ := json.Marshal(logLine)
			log.Println(string(b))
		})
	})

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		// Basic health info
		status := map[string]any{
			"status": "ok",
			"env":    cfg.Env,
		}
		respondJSON(w, http.StatusOK, status)
	})

	repo := repository.New(db)
	svc := service.New(repo)

	// Serve static files from docs directory
	r.Route("/docs", func(docs chi.Router) {
		fs := http.FileServer(http.Dir("./docs/"))
		docs.Handle("/*", http.StripPrefix("/docs", fs))
	})

	// Swagger UI endpoint - serve the UI with our spec at /api/
	// Protect with admin-only access
	r.Group(func(g chi.Router) {
		g.Use(AdminOnly(repo))
		g.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
			// Serve Swagger UI with our OpenAPI spec
			swaggerHTML := `<!DOCTYPE html>
<html>
<head>
	<title>API Documentation</title>
	<link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
	<style>
		html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
		*, *:before, *:after { box-sizing: inherit; }
		body { margin:0; background: #fafafa; }
	</style>
</head>
<body>
	<div id="swagger-ui"></div>
	<script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
	<script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
	<script>
	window.onload = function() {
		SwaggerUIBundle({
			url: '/docs/swagger.yaml',
			dom_id: '#swagger-ui',
			deepLinking: true,
			presets: [
				SwaggerUIBundle.presets.apis,
				SwaggerUIStandalonePreset
			],
			plugins: [
				SwaggerUIBundle.plugins.DownloadUrl
			],
			layout: "StandaloneLayout"
		});
	};
	</script>
</body>
</html>`
			w.Header().Set("Content-Type", "text/html")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(swaggerHTML))
		})
	})

	// Internal DB Admin UI reverse proxy (kept inside the docker network)
	// Serves sqlite-web at /db-admin/ without exposing a public port; admin-only
	r.With(AdminOnly(repo)).Get("/db-admin", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/db-admin/", http.StatusFound)
	})
	r.Route("/db-admin", func(adm chi.Router) {
		adm.Use(AdminOnly(repo))
		targetURL, _ := url.Parse("http://sqlite-admin:8080")
		proxy := httputil.NewSingleHostReverseProxy(targetURL)
		// Add forwarding headers for better upstream awareness
		proxy.Director = func(req *http.Request) {
			// preserve original URL but point to target host
			req.URL.Scheme = targetURL.Scheme
			req.URL.Host = targetURL.Host
			// Forward base headers
			host := req.Host
			if host == "" {
				host = "api"
			}
			req.Header.Set("X-Forwarded-Host", host)
			req.Header.Set("X-Forwarded-Proto", "http")
			req.Header.Set("X-Forwarded-Prefix", "/db-admin")
		}
		// Strip the /db-admin prefix so upstream receives the correct paths
		adm.Mount("/", http.StripPrefix("/db-admin", proxy))
	})

	// Authentication routes (public)
	r.Route("/auth", func(auth chi.Router) {
		auth.Post("/login", func(w http.ResponseWriter, r *http.Request) {
			var req domain.LoginRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				respondErr(w, http.StatusBadRequest, invalidBodyMsg)
				return
			}

			user, passwordHash, err := repo.GetUserByUsername(r.Context(), req.Username)
			if err != nil {
				if err == sql.ErrNoRows {
					respondJSON(w, http.StatusOK, domain.LoginResponse{
						Success: false,
						Message: "Invalid username or password",
					})
					return
				}
				respondErr(w, http.StatusInternalServerError, "login failed")
				return
			}

			if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
				respondJSON(w, http.StatusOK, domain.LoginResponse{
					Success: false,
					Message: "Invalid username or password",
				})
				return
			}

			session, err := repo.CreateSession(r.Context(), user.ID)
			if err != nil {
				respondErr(w, http.StatusInternalServerError, "failed to create session")
				return
			}

			repo.UpdateLastLogin(r.Context(), user.ID)

			respondJSON(w, http.StatusOK, domain.LoginResponse{
				Success:   true,
				Message:   "Login successful",
				SessionID: session.ID,
				User:      user,
			})
		})

		auth.Post("/logout", func(w http.ResponseWriter, r *http.Request) {
			sessionID := getSessionFromRequest(r)
			if sessionID != "" {
				repo.DeleteSession(r.Context(), sessionID)
			}
			respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
		})

		auth.Post("/update-password", func(w http.ResponseWriter, r *http.Request) {
			sessionID := getSessionFromRequest(r)
			if sessionID == "" {
				respondErr(w, http.StatusUnauthorized, "not authenticated")
				return
			}

			// Get user from session
			session, err := repo.GetSession(r.Context(), sessionID)
			if err != nil {
				respondErr(w, http.StatusUnauthorized, "invalid session")
				return
			}

			var req struct {
				CurrentPassword string `json:"currentPassword"`
				NewPassword     string `json:"newPassword"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				respondErr(w, http.StatusBadRequest, invalidBodyMsg)
				return
			}

			if req.CurrentPassword == "" || req.NewPassword == "" {
				respondErr(w, http.StatusBadRequest, "current password and new password required")
				return
			}

			if len(req.NewPassword) < 6 {
				respondErr(w, http.StatusBadRequest, "new password must be at least 6 characters long")
				return
			}

			// Get current password hash
			_, passwordHash, err := repo.GetUserByID(r.Context(), session.UserID)
			if err != nil {
				respondErr(w, http.StatusInternalServerError, "failed to get user")
				return
			}

			// Verify current password
			if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.CurrentPassword)); err != nil {
				respondErr(w, http.StatusBadRequest, "current password is incorrect")
				return
			}

			// Update password
			if err := repo.UpdateUserPassword(r.Context(), session.UserID, req.NewPassword); err != nil {
				respondErr(w, http.StatusInternalServerError, "failed to update password")
				return
			}

			respondJSON(w, http.StatusOK, map[string]string{"status": "password updated successfully"})
		})

		auth.Post("/register", func(w http.ResponseWriter, r *http.Request) {
			var req struct {
				Username string `json:"username"`
				Password string `json:"password"`
				Email    string `json:"email"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				respondErr(w, http.StatusBadRequest, invalidBodyMsg)
				return
			}

			if req.Username == "" || req.Password == "" {
				respondErr(w, http.StatusBadRequest, "username and password required")
				return
			}

			user, err := repo.CreateUser(r.Context(), req.Username, req.Password, req.Email)
			if err != nil {
				if strings.Contains(err.Error(), "UNIQUE constraint failed") {
					respondErr(w, http.StatusConflict, "username already exists")
					return
				}
				respondErr(w, http.StatusInternalServerError, "failed to create user")
				return
			}

			respondJSON(w, http.StatusCreated, user)
		})
	})

	// Protected API routes (require valid session + API key)
	r.Route("/api/v1", func(api chi.Router) {
		api.Use(middleware.APIKeyAuth(middleware.APIKeyConfig{Header: "X-API-Key", Key: cfg.APIKey}))
		api.Use(RequireSession(repo))

		// Legacy endpoints
		api.Get("/summary", func(w http.ResponseWriter, r *http.Request) {
			ym, err := parseYM(r)
			if err != nil {
				respondErr(w, http.StatusBadRequest, err.Error())
				return
			}
			s, err := svc.Summary(r.Context(), ym)
			if err != nil {
				respondErr(w, http.StatusInternalServerError, "failed")
				return
			}
			respondJSON(w, http.StatusOK, s)
		})

		api.Post("/salary", func(w http.ResponseWriter, r *http.Request) {
			var req struct {
				Year        int   `json:"year"`
				Month       int   `json:"month"`
				AmountCents int64 `json:"amount_cents"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				respondErr(w, http.StatusBadRequest, invalidBodyMsg)
				return
			}
			if err := svc.SetSalary(r.Context(), domain.YearMonth{Year: req.Year, Month: req.Month}, domain.Money(req.AmountCents)); err != nil {
				respondErr(w, http.StatusBadRequest, err.Error())
				return
			}
			respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
		})

		api.Post("/budget", func(w http.ResponseWriter, r *http.Request) {
			var req struct {
				Year        int   `json:"year"`
				Month       int   `json:"month"`
				AmountCents int64 `json:"amount_cents"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				respondErr(w, http.StatusBadRequest, invalidBodyMsg)
				return
			}
			if err := svc.SetBudget(r.Context(), domain.YearMonth{Year: req.Year, Month: req.Month}, domain.Money(req.AmountCents)); err != nil {
				respondErr(w, http.StatusBadRequest, err.Error())
				return
			}
			respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
		})

		api.Get("/expenses", func(w http.ResponseWriter, r *http.Request) {
			ym, err := parseYM(r)
			if err != nil {
				respondErr(w, http.StatusBadRequest, err.Error())
				return
			}
			items, err := svc.ListExpenses(r.Context(), ym)
			if err != nil {
				respondErr(w, http.StatusInternalServerError, "failed")
				return
			}
			respondJSON(w, http.StatusOK, items)
		})

		api.Post("/expenses", func(w http.ResponseWriter, r *http.Request) {
			var req struct {
				Year        int    `json:"year"`
				Month       int    `json:"month"`
				Category    string `json:"category"`
				Description string `json:"description"`
				AmountCents int64  `json:"amount_cents"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				respondErr(w, http.StatusBadRequest, invalidBodyMsg)
				return
			}
			id, err := svc.AddExpense(r.Context(), &domain.Expense{YearMonth: domain.YearMonth{Year: req.Year, Month: req.Month}, Category: req.Category, Description: req.Description, AmountCents: domain.Money(req.AmountCents)})
			if err != nil {
				respondErr(w, http.StatusBadRequest, err.Error())
				return
			}
			respondJSON(w, http.StatusCreated, map[string]any{"id": id})
		})

		api.Delete("/expenses/{id}", func(w http.ResponseWriter, r *http.Request) {
			idStr := chi.URLParam(r, "id")
			id, err := strconv.ParseInt(idStr, 10, 64)
			if err != nil || id <= 0 {
				respondErr(w, http.StatusBadRequest, "invalid id")
				return
			}
			if err := svc.DeleteExpense(r.Context(), id); err != nil {
				respondErr(w, http.StatusInternalServerError, "failed")
				return
			}
			respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
		})

		// New enhanced endpoints
		api.Get("/monthly-data", func(w http.ResponseWriter, r *http.Request) {
			userID := getUserIDFromContext(r.Context())
			ym, err := parseYM(r)
			if err != nil {
				respondErr(w, http.StatusBadRequest, err.Error())
				return
			}

			data, err := repo.GetMonthlyData(r.Context(), userID, ym)
			if err != nil {
				respondErr(w, http.StatusInternalServerError, "failed to get monthly data")
				return
			}

			respondJSON(w, http.StatusOK, data)
		})

		// Seed default income/budget sources for the month if they are empty
		api.Post("/seed-defaults", func(w http.ResponseWriter, r *http.Request) {
			userID := getUserIDFromContext(r.Context())
			var req struct {
				Year  int `json:"year"`
				Month int `json:"month"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				respondErr(w, http.StatusBadRequest, invalidBodyMsg)
				return
			}
			if req.Year == 0 || req.Month == 0 {
				respondErr(w, http.StatusBadRequest, "year and month required")
				return
			}

			ym := domain.YearMonth{Year: req.Year, Month: req.Month}

			// Check existing
			income, err := repo.ListIncomeSources(r.Context(), userID, ym)
			if err != nil {
				respondErr(w, http.StatusInternalServerError, "failed to list income sources")
				return
			}
			budget, err := repo.ListBudgetSources(r.Context(), userID, ym)
			if err != nil {
				respondErr(w, http.StatusInternalServerError, "failed to list budget sources")
				return
			}

			seededIncome := 0
			seededBudget := 0

			if len(income) == 0 {
				defaults := []domain.CreateIncomeSourceRequest{
					{Name: "Main Salary", Year: req.Year, Month: req.Month, AmountCents: 268187},
					{Name: "Secondary Salary", Year: req.Year, Month: req.Month, AmountCents: 141054},
					{Name: "Meal Vouchers", Year: req.Year, Month: req.Month, AmountCents: 15000},
					{Name: "Other", Year: req.Year, Month: req.Month, AmountCents: 0},
				}
				for _, d := range defaults {
					if _, err := repo.CreateIncomeSource(r.Context(), userID, d); err == nil {
						seededIncome++
					}
				}
			}

			if len(budget) == 0 {
				defaults := []domain.CreateBudgetSourceRequest{
					{Name: "Money Savings", Year: req.Year, Month: req.Month, AmountCents: 10000},
					{Name: "Gas/Fuel", Year: req.Year, Month: req.Month, AmountCents: 8000},
					{Name: "Dance School", Year: req.Year, Month: req.Month, AmountCents: 4000},
					{Name: "Rent", Year: req.Year, Month: req.Month, AmountCents: 97686},
					{Name: "Car Loan", Year: req.Year, Month: req.Month, AmountCents: 28404},
					{Name: "Car Maintenance", Year: req.Year, Month: req.Month, AmountCents: 20025},
					{Name: "Home Insurance", Year: req.Year, Month: req.Month, AmountCents: 2315},
					{Name: "Car Insurance", Year: req.Year, Month: req.Month, AmountCents: 21185},
					{Name: "Electricity", Year: req.Year, Month: req.Month, AmountCents: 5300},
					{Name: "Gas", Year: req.Year, Month: req.Month, AmountCents: 11200},
					{Name: "Water", Year: req.Year, Month: req.Month, AmountCents: 4500},
					{Name: "Daycare", Year: req.Year, Month: req.Month, AmountCents: 6865},
					{Name: "Internet Subscription", Year: req.Year, Month: req.Month, AmountCents: 3798},
					{Name: "Phone Subscription", Year: req.Year, Month: req.Month, AmountCents: 3998},
					{Name: "Miscellaneous Courses", Year: req.Year, Month: req.Month, AmountCents: 65000},
				}
				for _, d := range defaults {
					if _, err := repo.CreateBudgetSource(r.Context(), userID, d); err == nil {
						seededBudget++
					}
				}
			}

			respondJSON(w, http.StatusOK, map[string]any{
				"seeded_income": seededIncome,
				"seeded_budget": seededBudget,
			})
		})

		// Income Sources endpoints
		api.Route("/income-sources", func(income chi.Router) {
			income.Get("/", func(w http.ResponseWriter, r *http.Request) {
				userID := getUserIDFromContext(r.Context())
				ym, err := parseYM(r)
				if err != nil {
					respondErr(w, http.StatusBadRequest, err.Error())
					return
				}
				sources, err := repo.ListIncomeSources(r.Context(), userID, ym)
				if err != nil {
					respondErr(w, http.StatusInternalServerError, "failed")
					return
				}
				respondJSON(w, http.StatusOK, sources)
			})

			income.Post("/", func(w http.ResponseWriter, r *http.Request) {
				userID := getUserIDFromContext(r.Context())
				var req domain.CreateIncomeSourceRequest
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					respondErr(w, http.StatusBadRequest, invalidBodyMsg)
					return
				}
				source, err := repo.CreateIncomeSource(r.Context(), userID, req)
				if err != nil {
					respondErr(w, http.StatusInternalServerError, "failed to create income source")
					return
				}
				respondJSON(w, http.StatusCreated, source)
			})

			income.Put("/{id}", func(w http.ResponseWriter, r *http.Request) {
				userID := getUserIDFromContext(r.Context())
				idStr := chi.URLParam(r, "id")
				id, err := strconv.ParseInt(idStr, 10, 64)
				if err != nil || id <= 0 {
					respondErr(w, http.StatusBadRequest, "invalid id")
					return
				}
				var req domain.UpdateSourceRequest
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					respondErr(w, http.StatusBadRequest, invalidBodyMsg)
					return
				}
				if err := repo.UpdateIncomeSource(r.Context(), id, userID, req); err != nil {
					respondErr(w, http.StatusInternalServerError, "failed to update income source")
					return
				}
				respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
			})

			income.Delete("/{id}", func(w http.ResponseWriter, r *http.Request) {
				userID := getUserIDFromContext(r.Context())
				idStr := chi.URLParam(r, "id")
				id, err := strconv.ParseInt(idStr, 10, 64)
				if err != nil || id <= 0 {
					respondErr(w, http.StatusBadRequest, "invalid id")
					return
				}
				if err := repo.DeleteIncomeSource(r.Context(), id, userID); err != nil {
					respondErr(w, http.StatusInternalServerError, "failed to delete income source")
					return
				}
				respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
			})
		})

		// Budget Sources endpoints
		api.Route("/budget-sources", func(budget chi.Router) {
			budget.Get("/", func(w http.ResponseWriter, r *http.Request) {
				userID := getUserIDFromContext(r.Context())
				ym, err := parseYM(r)
				if err != nil {
					respondErr(w, http.StatusBadRequest, err.Error())
					return
				}
				sources, err := repo.ListBudgetSources(r.Context(), userID, ym)
				if err != nil {
					respondErr(w, http.StatusInternalServerError, "failed")
					return
				}
				respondJSON(w, http.StatusOK, sources)
			})
			budget.Post("/", func(w http.ResponseWriter, r *http.Request) {
				userID := getUserIDFromContext(r.Context())
				var req domain.CreateBudgetSourceRequest
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					respondErr(w, http.StatusBadRequest, invalidBodyMsg)
					return
				}
				source, err := repo.CreateBudgetSource(r.Context(), userID, req)
				if err != nil {
					respondErr(w, http.StatusInternalServerError, "failed to create budget source")
					return
				}
				respondJSON(w, http.StatusCreated, source)
			})

			budget.Put("/{id}", func(w http.ResponseWriter, r *http.Request) {
				userID := getUserIDFromContext(r.Context())
				idStr := chi.URLParam(r, "id")
				id, err := strconv.ParseInt(idStr, 10, 64)
				if err != nil || id <= 0 {
					respondErr(w, http.StatusBadRequest, "invalid id")
					return
				}
				var req domain.UpdateSourceRequest
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					respondErr(w, http.StatusBadRequest, invalidBodyMsg)
					return
				}
				if err := repo.UpdateBudgetSource(r.Context(), id, userID, req); err != nil {
					respondErr(w, http.StatusInternalServerError, "failed to update budget source")
					return
				}
				respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
			})

			budget.Delete("/{id}", func(w http.ResponseWriter, r *http.Request) {
				userID := getUserIDFromContext(r.Context())
				idStr := chi.URLParam(r, "id")
				id, err := strconv.ParseInt(idStr, 10, 64)
				if err != nil || id <= 0 {
					respondErr(w, http.StatusBadRequest, "invalid id")
					return
				}
				if err := repo.DeleteBudgetSource(r.Context(), id, userID); err != nil {
					respondErr(w, http.StatusInternalServerError, "failed to delete budget source")
					return
				}
				respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
			})
		})

		// Manual Budget endpoints
		api.Route("/manual-budget", func(mb chi.Router) {
			mb.Get("/", func(w http.ResponseWriter, r *http.Request) {
				userID := getUserIDFromContext(r.Context())
				tym, err := parseYM(r)
				if err != nil {
					respondErr(w, http.StatusBadRequest, err.Error())
					return
				}
				data, err := repo.GetManualBudget(r.Context(), userID, tym)
				if err != nil {
					respondErr(w, http.StatusInternalServerError, "failed to get manual budget")
					return
				}
				respondJSON(w, http.StatusOK, map[string]any{
					"bank_amount_cents": int64(data.BankAmountCents),
					"items":             data.Items,
				})
			})

			mb.Put("/", func(w http.ResponseWriter, r *http.Request) {
				userID := getUserIDFromContext(r.Context())
				var req struct {
					Year            int                       `json:"year"`
					Month           int                       `json:"month"`
					BankAmountCents int64                     `json:"bank_amount_cents"`
					Items           []domain.ManualBudgetItem `json:"items"`
				}
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					respondErr(w, http.StatusBadRequest, invalidBodyMsg)
					return
				}
				if req.Year == 0 || req.Month == 0 {
					respondErr(w, http.StatusBadRequest, "year and month required")
					return
				}
				// Sanitize items: keep name, amount_cents
				items := make([]domain.ManualBudgetItem, 0, len(req.Items))
				for _, it := range req.Items {
					items = append(items, domain.ManualBudgetItem{Name: strings.TrimSpace(it.Name), AmountCents: domain.Money(it.AmountCents)})
				}
				if err := repo.UpsertManualBudget(r.Context(), userID, domain.YearMonth{Year: req.Year, Month: req.Month}, domain.Money(req.BankAmountCents), items); err != nil {
					respondErr(w, http.StatusInternalServerError, "failed to save manual budget")
					return
				}
				respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
			})
		})
	})

	return r
}

// RequireSession ensures a valid session is present and sets user ID in context
func RequireSession(repo *repository.Repository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			sessionID := getSessionFromRequest(r)
			if sessionID == "" {
				respondErr(w, http.StatusUnauthorized, "not authenticated")
				return
			}
			session, err := repo.GetSession(r.Context(), sessionID)
			if err != nil {
				respondErr(w, http.StatusUnauthorized, "invalid session")
				return
			}
			ctx := context.WithValue(r.Context(), userIDKey, session.UserID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// AdminOnly ensures the requester is an authenticated admin
func AdminOnly(repo *repository.Repository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			sessionID := getSessionFromRequest(r)
			if sessionID == "" {
				respondErr(w, http.StatusUnauthorized, "not authenticated")
				return
			}
			session, err := repo.GetSession(r.Context(), sessionID)
			if err != nil {
				respondErr(w, http.StatusUnauthorized, "invalid session")
				return
			}
			isAdmin, err := repo.IsUserAdmin(r.Context(), session.UserID)
			if err != nil {
				respondErr(w, http.StatusInternalServerError, "failed to check admin")
				return
			}
			if !isAdmin {
				respondErr(w, http.StatusForbidden, "forbidden")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func parseYM(r *http.Request) (domain.YearMonth, error) {
	yearStr := r.URL.Query().Get("year")
	monthStr := r.URL.Query().Get("month")
	y, err := strconv.Atoi(yearStr)
	if err != nil {
		return domain.YearMonth{}, err
	}
	m, err := strconv.Atoi(monthStr)
	if err != nil {
		return domain.YearMonth{}, err
	}
	return domain.YearMonth{Year: y, Month: m}, nil
}

func respondJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func respondErr(w http.ResponseWriter, status int, msg string) {
	respondJSON(w, status, map[string]string{"error": msg})
}

func getSessionFromRequest(r *http.Request) string {
	// Try Authorization header first
	if auth := r.Header.Get("Authorization"); auth != "" {
		parts := strings.Split(auth, " ")
		if len(parts) == 2 && parts[0] == "Bearer" {
			return parts[1]
		}
	}

	// Fall back to cookie
	if cookie, err := r.Cookie("session_id"); err == nil {
		return cookie.Value
	}

	return ""
}

func getUserIDFromContext(ctx context.Context) int64 {
	if userID, ok := ctx.Value(userIDKey).(int64); ok {
		return userID
	}
	return 0
}
