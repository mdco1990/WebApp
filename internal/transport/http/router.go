package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/personal/webapp/internal/config"
	"github.com/personal/webapp/internal/domain"
	"github.com/personal/webapp/internal/middleware"
	"github.com/personal/webapp/internal/repository"
	"github.com/personal/webapp/internal/service"
)

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
	// Recover from panics to avoid 500s without response
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					slog.Error("panic recovered", "err", rec)
					respondErr(w, http.StatusInternalServerError, "internal error")
				}
			}()
			next.ServeHTTP(w, r)
		})
	})

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
			slog.Info(
				"http_request",
				"method",
				logLine["method"],
				"path",
				logLine["path"],
				"status",
				logLine["status"],
				"duration",
				logLine["t"],
			)
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
	// Readiness endpoint (lightweight)
	r.Get("/readyz", func(w http.ResponseWriter, r *http.Request) {
		respondJSON(w, http.StatusOK, map[string]string{"status": "ready"})
	})

	repo := repository.New(db)
	svc := service.New(repo)

	// Serve static files from docs directory
	r.Route("/docs", func(docs chi.Router) {
		fs := http.FileServer(http.Dir("./docs/"))
		docs.Handle("/*", http.StripPrefix("/docs", fs))
	})

	// Admin/Docs routes (Swagger UI and DB admin proxy)
	registerAdminRoutes(r, repo)

	// Authentication routes (public)
	registerAuthRoutes(r, repo)

	// Protected API routes (require valid session + API key)
	registerAPIRoutes(r, cfg, repo, svc)

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
