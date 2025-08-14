// Package httpapi wires HTTP routing, handlers, and admin utilities.
package httpapi

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/mdco1990/webapp/internal/repository"
	"github.com/mdco1990/webapp/internal/security"
	"gopkg.in/yaml.v3"
)

const pathDBAdmin = "/db-admin"
const (
	headerContentType = "Content-Type"
	contentTypeHTML   = "text/html"
	contentTypeJSON   = "application/json"
)

// swaggerHTML contains the Swagger UI HTML template
const swaggerHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Swagger UI</title>
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
            const ui = SwaggerUIBundle({
                url: '/openapi.json',
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

// OpenAPISpecHandler handles OpenAPI specification serving
type OpenAPISpecHandler struct{}

// NewOpenAPISpecHandler creates a new OpenAPI spec handler
func NewOpenAPISpecHandler() *OpenAPISpecHandler {
	return &OpenAPISpecHandler{}
}

// ServeSpec serves the OpenAPI specification as JSON
func (oash *OpenAPISpecHandler) ServeSpec(w http.ResponseWriter, _ *http.Request) {
	f, err := os.Open("api/swagger.yaml")
	if err != nil {
		http.Error(w, "spec not found", http.StatusNotFound)
		return
	}
	defer func() { _ = f.Close() }()

	data, err := io.ReadAll(f)
	if err != nil {
		http.Error(w, "failed to read spec", http.StatusInternalServerError)
		return
	}

	var v any
	if err := yaml.Unmarshal(data, &v); err != nil {
		http.Error(w, "invalid yaml", http.StatusInternalServerError)
		return
	}

	out, err := json.Marshal(v)
	if err != nil {
		http.Error(w, "failed to encode json", http.StatusInternalServerError)
		return
	}

	w.Header().Set(headerContentType, contentTypeJSON)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(out)
}

// registerAdminRoutes wires Swagger UI and DB admin proxy (admin only)
func registerAdminRoutes(r chi.Router, repo *repository.Repository) {
	// Swagger UI route
	r.With(AdminOnly(repo)).Get("/swagger", handleSwaggerUI)

	// Admin user management API under /api/v1/admin/
	r.With(AdminOnly(repo)).Route("/api/v1/admin", func(a chi.Router) {
		a.Get("/users", handleListUsers(repo))
		a.Get("/users/pending", handleListPendingUsers(repo))
		a.Post("/users/{id}/approve", handleApproveUser(repo))
		a.Post("/users/{id}/reject", handleRejectUser(repo))
		a.Delete("/users/{id}", handleDeleteUser(repo))
		a.Get("/logs", handleGetLogs)
	})

	// Note: SQLite Admin UI is now proxied directly by nginx to sqlite-admin:8080
	// This route is kept for backward compatibility but redirects to nginx
	r.With(AdminOnly(repo)).Get(pathDBAdmin, handleDBAdminRedirect)
}

// handleSwaggerUI serves the Swagger UI interface
func handleSwaggerUI(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set(headerContentType, contentTypeHTML)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(swaggerHTML))
}

// handleListUsers returns a handler for listing users with optional status filter
func handleListUsers(repo *repository.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		status := strings.TrimSpace(r.URL.Query().Get("status"))
		users, err := repo.ListUsers(r.Context(), status)
		if err != nil {
			respondErr(w, http.StatusInternalServerError, "failed to list users")
			return
		}
		respondJSON(w, http.StatusOK, users)
	}
}

// handleListPendingUsers returns a handler for listing pending users
func handleListPendingUsers(repo *repository.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		users, err := repo.ListUsers(r.Context(), "pending")
		if err != nil {
			respondErr(w, http.StatusInternalServerError, "failed to list pending users")
			return
		}
		respondJSON(w, http.StatusOK, users)
	}
}

// handleApproveUser returns a handler for approving users
func handleApproveUser(repo *repository.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := chi.URLParam(r, "id")

		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil || id <= 0 {
			respondErr(w, http.StatusBadRequest, "invalid id")
			return
		}

		// Enhanced validation using security package
		if err := security.ValidateID(id, "id"); err != nil {
			respondErr(w, http.StatusBadRequest, "invalid id")
			return
		}

		if err := repo.UpdateUserStatus(r.Context(), id, "approved"); err != nil {
			respondErr(w, http.StatusInternalServerError, "failed to approve")
			return
		}
		respondJSON(w, http.StatusOK, map[string]string{"status": "approved"})
	}
}

// handleRejectUser returns a handler for rejecting users
func handleRejectUser(repo *repository.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := chi.URLParam(r, "id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil || id <= 0 {
			respondErr(w, http.StatusBadRequest, "invalid id")
			return
		}
		if err := repo.UpdateUserStatus(r.Context(), id, "rejected"); err != nil {
			respondErr(w, http.StatusInternalServerError, "failed to reject")
			return
		}
		respondJSON(w, http.StatusOK, map[string]string{"status": "rejected"})
	}
}

// handleDeleteUser returns a handler for deleting users
func handleDeleteUser(repo *repository.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := chi.URLParam(r, "id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil || id <= 0 {
			respondErr(w, http.StatusBadRequest, "invalid id")
			return
		}
		if err := repo.DeleteUser(r.Context(), id); err != nil {
			respondErr(w, http.StatusInternalServerError, "failed to delete")
			return
		}
		respondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
	}
}

// handleGetLogs returns a handler for getting logs (stub)
func handleGetLogs(w http.ResponseWriter, _ *http.Request) {
	respondJSON(w, http.StatusOK, map[string]any{"logs": []string{}})
}

// handleDBAdminRedirect handles the DB admin redirect
func handleDBAdminRedirect(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/db-admin/", http.StatusFound)
}
