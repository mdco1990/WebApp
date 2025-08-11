package httpapi

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/mdco1990/webapp/internal/domain"
	"github.com/mdco1990/webapp/internal/repository"
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
		auth.Get("/me", handleMe(repo))
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
			if errors.Is(err, sql.ErrNoRows) {
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

		_ = repo.UpdateLastLogin(r.Context(), user.ID)

		// Also set a session cookie so browser navigation to admin routes works
		http.SetCookie(w, buildSessionCookie(r, session.ID, 24*60*60))

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
			_ = repo.DeleteSession(r.Context(), sessionID)
		}
		// Expire the session cookie in the browser (match attributes)
		http.SetCookie(w, buildSessionCookie(r, "", -1))
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
			CurrentPassword string `json:"current_password"`
			NewPassword     string `json:"new_password"`
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

// handleMe returns the current authenticated user details
func handleMe(repo *repository.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sessionID := getSessionFromRequest(r)
		if sessionID == "" {
			respondErr(w, http.StatusUnauthorized, errNotAuthenticated)
			return
		}
		session, err := repo.GetSession(r.Context(), sessionID)
		if err != nil {
			respondErr(w, http.StatusUnauthorized, errInvalidSession)
			return
		}

		user, _, err := repo.GetUserByID(r.Context(), session.UserID)
		if err != nil || user == nil {
			respondErr(w, http.StatusInternalServerError, "failed to load user")
			return
		}

		// Refresh cookie to keep browser session fresh
		http.SetCookie(w, buildSessionCookie(r, sessionID, 24*60*60))

		respondJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"user":    user,
		})
	}
}

// buildSessionCookie builds a session cookie with attributes tuned to the request context.
// When maxAgeSeconds > 0, sets an expiration in the future; when -1, expires immediately.
func buildSessionCookie(r *http.Request, value string, maxAgeSeconds int) *http.Cookie {
	c := &http.Cookie{
		Name:     "session_id",
		Value:    value,
		Path:     "/",
		HttpOnly: true,
		// Default to Lax, but use None for cross-site frontends so cookie can be received via XHR.
		SameSite: http.SameSiteLaxMode,
		MaxAge:   maxAgeSeconds,
	}
	// Detect HTTPS via direct TLS or forwarded proto
	if r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https") {
		c.Secure = true
	}
	// If Origin host differs from request host, treat as cross-site and relax SameSite
	if origin := r.Header.Get("Origin"); origin != "" {
		// Quick check without full parse: require scheme separator and host mismatch
		// Only relax when truly cross-site to avoid accidental third-party exposure.
		if !strings.Contains(origin, r.Host) {
			c.SameSite = http.SameSiteNoneMode
			// Per spec, SameSite=None requires Secure=true in modern browsers
			c.Secure = true
		}
	}
	if maxAgeSeconds > 0 {
		c.Expires = time.Now().Add(time.Duration(maxAgeSeconds) * time.Second)
	} else if maxAgeSeconds < 0 {
		c.Expires = time.Unix(0, 0)
	}
	return c
}
