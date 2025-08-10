package httpapi

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/personal/webapp/internal/domain"
	"github.com/personal/webapp/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

const (
	invalidBodyMsg      = "invalid body"
	errNotAuthenticated = "not authenticated"
	errInvalidSession   = "invalid session"
)

// registerAuthRoutes wires public auth endpoints
func registerAuthRoutes(r chi.Router, repo *repository.Repository) {
	r.Route("/auth", func(auth chi.Router) {
		auth.Post("/login", handleLogin(repo))
		auth.Post("/logout", handleLogout(repo))
		auth.Post("/update-password", handleUpdatePassword(repo))
		auth.Post("/register", handleRegister(repo))
	})
}

// handleLogin processes user login requests
func handleLogin(repo *repository.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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
	}
}

// handleLogout processes user logout requests
func handleLogout(repo *repository.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sessionID := getSessionFromRequest(r)
		if sessionID != "" {
			repo.DeleteSession(r.Context(), sessionID)
		}
		respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// handleUpdatePassword processes password update requests
func handleUpdatePassword(repo *repository.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		session, err := validatePasswordUpdateRequest(w, r, repo)
		if err != nil || session == nil {
			return // Response already sent
		}

		var req struct {
			CurrentPassword string `json:"currentPassword"`
			NewPassword     string `json:"newPassword"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondErr(w, http.StatusBadRequest, invalidBodyMsg)
			return
		}

		if err := validatePasswordChangeInput(w, req.CurrentPassword, req.NewPassword); err != nil {
			return // Response already sent
		}

		if err := verifyCurrentPassword(w, r, repo, session.UserID, req.CurrentPassword); err != nil {
			return // Response already sent
		}

		if err := repo.UpdateUserPassword(r.Context(), session.UserID, req.NewPassword); err != nil {
			respondErr(w, http.StatusInternalServerError, "failed to update password")
			return
		}

		respondJSON(w, http.StatusOK, map[string]string{"status": "password updated successfully"})
	}
}

// validatePasswordUpdateRequest checks session and returns session if valid
func validatePasswordUpdateRequest(
	w http.ResponseWriter,
	r *http.Request,
	repo *repository.Repository,
) (*domain.Session, error) {
	sessionID := getSessionFromRequest(r)
	if sessionID == "" {
		respondErr(w, http.StatusUnauthorized, errNotAuthenticated)
		return nil, errors.New("no session")
	}

	session, err := repo.GetSession(r.Context(), sessionID)
	if err != nil {
		respondErr(w, http.StatusUnauthorized, errInvalidSession)
		return nil, err
	}

	return session, nil
}

// validatePasswordChangeInput checks password requirements
func validatePasswordChangeInput(w http.ResponseWriter, currentPassword, newPassword string) error {
	if currentPassword == "" || newPassword == "" {
		respondErr(w, http.StatusBadRequest, "current password and new password required")
		return errors.New("empty passwords")
	}

	if len(newPassword) < 6 {
		respondErr(w, http.StatusBadRequest, "new password must be at least 6 characters long")
		return errors.New("password too short")
	}

	return nil
}

// verifyCurrentPassword checks if the provided current password is correct
func verifyCurrentPassword(
	w http.ResponseWriter,
	r *http.Request,
	repo *repository.Repository,
	userID int64,
	currentPassword string,
) error {
	_, passwordHash, err := repo.GetUserByID(r.Context(), userID)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "failed to get user")
		return err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(currentPassword)); err != nil {
		respondErr(w, http.StatusBadRequest, "current password is incorrect")
		return err
	}

	return nil
}

// handleRegister processes user registration requests
func handleRegister(repo *repository.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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
	}
}
