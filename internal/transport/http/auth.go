package httpapi

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"golang.org/x/crypto/bcrypt"

	"github.com/personal/webapp/internal/repository"
)

const (
	invalidBodyMsg      = "invalid body"
	errNotAuthenticated = "not authenticated"
	errInvalidSession   = "invalid session"
)

// registerAuthRoutes wires public auth endpoints
func registerAuthRoutes(r chi.Router, repo *repository.Repository) {
	r.Route("/auth", func(auth chi.Router) {
		auth.Post("/login", func(w http.ResponseWriter, r *http.Request) {
			var req struct {
				Username string `json:"username"`
				Password string `json:"password"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				respondErr(w, http.StatusBadRequest, invalidBodyMsg)
				return
			}

			user, passwordHash, err := repo.GetUserByUsername(r.Context(), req.Username)
			if err != nil {
				if err == sql.ErrNoRows {
					respondJSON(w, http.StatusOK, map[string]any{
						"success": false,
						"message": "Invalid username or password",
					})
					return
				}
				respondErr(w, http.StatusInternalServerError, "login failed")
				return
			}

			if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
				respondJSON(w, http.StatusOK, map[string]any{
					"success": false,
					"message": "Invalid username or password",
				})
				return
			}

			session, err := repo.CreateSession(r.Context(), user.ID)
			if err != nil {
				respondErr(w, http.StatusInternalServerError, "failed to create session")
				return
			}

			repo.UpdateLastLogin(r.Context(), user.ID)

			respondJSON(w, http.StatusOK, map[string]any{
				"success":    true,
				"message":    "Login successful",
				"session_id": session.ID,
				"user":       user,
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
				respondErr(w, http.StatusUnauthorized, errNotAuthenticated)
				return
			}

			// Get user from session
			session, err := repo.GetSession(r.Context(), sessionID)
			if err != nil {
				respondErr(w, http.StatusUnauthorized, errInvalidSession)
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
}
