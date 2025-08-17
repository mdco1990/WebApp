// Package auth implements authentication strategies using the strategy pattern.
package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/mdco1990/webapp/internal/domain"
	"github.com/mdco1990/webapp/internal/storage"
)

// Strategy defines the interface for authentication strategies
type Strategy interface {
	// Authenticate authenticates a user and returns session/token information
	Authenticate(ctx context.Context, credentials Credentials) (*Result, error)

	// Validate validates an existing session/token
	Validate(ctx context.Context, token string) (*Result, error)

	// Refresh refreshes an existing session/token
	Refresh(ctx context.Context, token string) (*Result, error)

	// Revoke revokes a session/token
	Revoke(ctx context.Context, token string) error

	// GetType returns the type of authentication strategy
	GetType() string
}

// Credentials represents authentication credentials
type Credentials struct {
	Username   string `json:"username"`
	Password   string `json:"password"`
	RememberMe bool   `json:"remember_me"`
}

// Result represents the result of authentication
type Result struct {
	User         *domain.User `json:"user"`
	Token        string       `json:"token"`
	TokenType    string       `json:"token_type"`
	ExpiresAt    time.Time    `json:"expires_at"`
	RefreshToken string       `json:"refresh_token,omitempty"`
	Permissions  []string     `json:"permissions,omitempty"`
}

// Service manages authentication strategies
type Service struct {
	strategies      map[string]Strategy
	defaultStrategy string
	storage         storage.Provider
	mu              sync.RWMutex
	config          Config
}

// Config holds authentication configuration
type Config struct {
	DefaultStrategy   string        `json:"default_strategy"`
	SessionTimeout    time.Duration `json:"session_timeout"`
	TokenTimeout      time.Duration `json:"token_timeout"`
	RefreshTimeout    time.Duration `json:"refresh_timeout"`
	MaxLoginAttempts  int           `json:"max_login_attempts"`
	LockoutDuration   time.Duration `json:"lockout_duration"`
	RequireMFA        bool          `json:"require_mfa"`
	PasswordMinLength int           `json:"password_min_length"`
	PasswordMaxLength int           `json:"password_max_length"`
}

// NewAuthService creates a new authentication service
func NewAuthService(storage storage.Provider, config Config) *Service {
	service := &Service{
		strategies:      make(map[string]Strategy),
		defaultStrategy: config.DefaultStrategy,
		storage:         storage,
		config:          config,
	}

	// Register default strategies
	service.RegisterStrategy("session", NewSessionStrategy(storage, config))
	service.RegisterStrategy("token", NewTokenStrategy(storage, config))

	return service
}

// RegisterStrategy registers an authentication strategy
func (as *Service) RegisterStrategy(name string, strategy Strategy) {
	as.mu.Lock()
	defer as.mu.Unlock()
	as.strategies[name] = strategy
}

// GetStrategy returns an authentication strategy by name
//
//nolint:ireturn
func (as *Service) GetStrategy(name string) (Strategy, error) {
	as.mu.RLock()
	defer as.mu.RUnlock()

	strategy, exists := as.strategies[name]
	if !exists {
		return nil, fmt.Errorf("authentication strategy not found: %s", name)
	}

	return strategy, nil
}

// Authenticate authenticates a user using the specified strategy
func (as *Service) Authenticate(ctx context.Context, strategyName string, credentials Credentials) (*Result, error) {
	strategy, err := as.GetStrategy(strategyName)
	if err != nil {
		return nil, err
	}

	// Check login attempts
	if err := as.checkLoginAttempts(ctx, credentials.Username); err != nil {
		return nil, err
	}

	// Attempt authentication
	result, err := strategy.Authenticate(ctx, credentials)
	if err != nil {
		as.recordFailedLogin(ctx, credentials.Username)
		return nil, err
	}

	// Record successful login
	as.recordSuccessfulLogin(ctx, credentials.Username)

	return result, nil
}

// Validate validates an authentication token/session
func (as *Service) Validate(ctx context.Context, strategyName, token string) (*Result, error) {
	strategy, err := as.GetStrategy(strategyName)
	if err != nil {
		return nil, err
	}

	return strategy.Validate(ctx, token)
}

// Refresh refreshes an authentication token/session
func (as *Service) Refresh(ctx context.Context, strategyName, token string) (*Result, error) {
	strategy, err := as.GetStrategy(strategyName)
	if err != nil {
		return nil, err
	}

	return strategy.Refresh(ctx, token)
}

// Revoke revokes an authentication token/session
func (as *Service) Revoke(ctx context.Context, strategyName, token string) error {
	strategy, err := as.GetStrategy(strategyName)
	if err != nil {
		return err
	}

	return strategy.Revoke(ctx, token)
}

// AuthenticateWithDefault authenticates using the default strategy
func (as *Service) AuthenticateWithDefault(ctx context.Context, credentials Credentials) (*Result, error) {
	return as.Authenticate(ctx, as.defaultStrategy, credentials)
}

// checkLoginAttempts checks if a user has exceeded maximum login attempts
func (as *Service) checkLoginAttempts(ctx context.Context, username string) error {
	key := "login_attempts:" + username

	attemptsData, err := as.storage.Load(ctx, key)
	if err != nil {
		//nolint:nilerr
		return nil // No previous attempts
	}

	var attempts LoginAttempts
	attemptsBytes, ok := attemptsData.([]byte)
	if !ok {
		return nil // Invalid data type, treat as no attempts
	}
	if err := json.Unmarshal(attemptsBytes, &attempts); err != nil {
		//nolint:nilerr
		return nil // Invalid data, treat as no attempts
	}

	// Check if locked out
	if attempts.IsLockedOut(as.config.MaxLoginAttempts, as.config.LockoutDuration) {
		return errors.New("account temporarily locked due to too many failed login attempts")
	}

	return nil
}

// recordFailedLogin records a failed login attempt
func (as *Service) recordFailedLogin(ctx context.Context, username string) {
	key := "login_attempts:" + username

	var attempts LoginAttempts
	attemptsData, err := as.storage.Load(ctx, key)
	if err == nil {
		attemptsBytes, ok := attemptsData.([]byte)
		if ok {
			if unmarshalErr := json.Unmarshal(attemptsBytes, &attempts); unmarshalErr != nil {
				// Log error but continue with empty attempts
				slog.Error("Failed to unmarshal login attempts", "error", unmarshalErr)
				attempts = LoginAttempts{}
			}
		}
	}

	attempts.RecordFailedAttempt()

	attemptsBytes, _ := json.Marshal(attempts)
	ttl := as.config.LockoutDuration * 2
	if saveErr := as.storage.Save(ctx, key, attemptsBytes, &ttl); saveErr != nil {
		slog.Error("Failed to save login attempts", "error", saveErr)
	}
}

// recordSuccessfulLogin records a successful login
func (as *Service) recordSuccessfulLogin(ctx context.Context, username string) {
	key := "login_attempts:" + username
	if deleteErr := as.storage.Delete(ctx, key); deleteErr != nil {
		slog.Error("Failed to delete login attempts", "error", deleteErr)
	}
}

// LoginAttempts tracks login attempts for a user
type LoginAttempts struct {
	FailedAttempts []time.Time `json:"failed_attempts"`
	LastAttempt    time.Time   `json:"last_attempt"`
}

// RecordFailedAttempt records a failed login attempt
func (la *LoginAttempts) RecordFailedAttempt() {
	now := time.Now()
	la.FailedAttempts = append(la.FailedAttempts, now)
	la.LastAttempt = now

	// Keep only recent attempts (last 24 hours)
	cutoff := now.Add(-24 * time.Hour)
	var recent []time.Time
	for _, attempt := range la.FailedAttempts {
		if attempt.After(cutoff) {
			recent = append(recent, attempt)
		}
	}
	la.FailedAttempts = recent
}

// IsLockedOut checks if the account is locked out
func (la *LoginAttempts) IsLockedOut(maxAttempts int, lockoutDuration time.Duration) bool {
	if len(la.FailedAttempts) < maxAttempts {
		return false
	}

	// Check if lockout period has passed
	lockoutEnd := la.LastAttempt.Add(lockoutDuration)
	return time.Now().Before(lockoutEnd)
}

// ============================================================================
// SESSION-BASED AUTHENTICATION STRATEGY
// ============================================================================

// SessionStrategy implements session-based authentication
type SessionStrategy struct {
	storage storage.Provider
	config  Config
}

// NewSessionStrategy creates a new session authentication strategy
func NewSessionStrategy(storage storage.Provider, config Config) *SessionStrategy {
	return &SessionStrategy{
		storage: storage,
		config:  config,
	}
}

// GetType returns the strategy type
func (s *SessionStrategy) GetType() string {
	return "session"
}

// Authenticate authenticates a user and creates a session
func (s *SessionStrategy) Authenticate(ctx context.Context, credentials Credentials) (*Result, error) {
	// Validate credentials (this would typically check against a database)
	user, err := s.validateCredentials(ctx, credentials)
	if err != nil {
		return nil, err
	}

	// Generate session token
	sessionToken := s.generateSessionToken()

	// Create session data
	sessionData := SessionData{
		UserID:    user.ID,
		Username:  user.Username,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(s.config.SessionTimeout),
		IPAddress: "", // Would be extracted from context in real implementation
		UserAgent: "", // Would be extracted from context in real implementation
	}

	// Store session
	sessionBytes, _ := json.Marshal(sessionData)
	ttl := s.config.SessionTimeout
	err = s.storage.Save(ctx, "session:"+sessionToken, sessionBytes, &ttl)
	if err != nil {
		return nil, fmt.Errorf("failed to store session: %w", err)
	}

	return &Result{
		User:      user,
		Token:     sessionToken,
		TokenType: "session",
		ExpiresAt: sessionData.ExpiresAt,
	}, nil
}

// Validate validates a session token
func (s *SessionStrategy) Validate(ctx context.Context, token string) (*Result, error) {
	// Retrieve session data
	sessionBytes, err := s.storage.Load(ctx, "session:"+token)
	if err != nil {
		return nil, errors.New("invalid or expired session")
	}

	var sessionData SessionData
	sessionBytesData, ok := sessionBytes.([]byte)
	if !ok {
		return nil, errors.New("invalid session data type")
	}
	if err := json.Unmarshal(sessionBytesData, &sessionData); err != nil {
		return nil, errors.New("invalid session data")
	}

	// Check if session has expired
	if time.Now().After(sessionData.ExpiresAt) {
		// Remove expired session
		if deleteErr := s.storage.Delete(ctx, "session:"+token); deleteErr != nil {
			slog.Error("Failed to delete expired session", "error", deleteErr)
		}
		return nil, errors.New("session expired")
	}

	// Retrieve user data (this would typically come from a database)
	user := &domain.User{
		ID:       sessionData.UserID,
		Username: sessionData.Username,
	}

	return &Result{
		User:      user,
		Token:     token,
		TokenType: "session",
		ExpiresAt: sessionData.ExpiresAt,
	}, nil
}

// Refresh refreshes a session
func (s *SessionStrategy) Refresh(ctx context.Context, token string) (*Result, error) {
	// Validate existing session
	result, err := s.Validate(ctx, token)
	if err != nil {
		return nil, err
	}

	// Extend session
	sessionData := SessionData{
		UserID:    result.User.ID,
		Username:  result.User.Username,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(s.config.SessionTimeout),
		IPAddress: "",
		UserAgent: "",
	}

	// Update session
	sessionBytes, _ := json.Marshal(sessionData)
	ttl := s.config.SessionTimeout
	err = s.storage.Save(ctx, "session:"+token, sessionBytes, &ttl)
	if err != nil {
		return nil, fmt.Errorf("failed to refresh session: %w", err)
	}

	result.ExpiresAt = sessionData.ExpiresAt
	return result, nil
}

// Revoke revokes a session
func (s *SessionStrategy) Revoke(ctx context.Context, token string) error {
	return s.storage.Delete(ctx, "session:"+token)
}

// validateCredentials validates user credentials
func (s *SessionStrategy) validateCredentials(_ context.Context, credentials Credentials) (*domain.User, error) {
	// This is a simplified implementation
	// In a real application, you would:
	// 1. Hash the password
	// 2. Query the database for the user
	// 3. Compare password hashes
	// 4. Check if the user is active

	if credentials.Username == "" || credentials.Password == "" {
		return nil, errors.New("username and password are required")
	}

	if len(credentials.Password) < s.config.PasswordMinLength {
		return nil, errors.New("password must be at least " + strconv.Itoa(s.config.PasswordMinLength) + " characters")
	}

	// Mock user for demonstration
	user := &domain.User{
		ID:       1,
		Username: credentials.Username,
		Email:    credentials.Username + "@example.com",
	}

	return user, nil
}

// generateSessionToken generates a secure session token
func (s *SessionStrategy) generateSessionToken() string {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		slog.Error("Failed to generate random bytes for session token", "error", err)
		// Fallback to a deterministic but unique token
		return "fallback_" + strconv.FormatInt(time.Now().UnixNano(), 10) + "_" + strconv.FormatInt(int64(s.config.SessionTimeout), 10)
	}
	return base64.URLEncoding.EncodeToString(bytes)
}

// SessionData represents session information
type SessionData struct {
	UserID    int64     `json:"user_id"`
	Username  string    `json:"username"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
	IPAddress string    `json:"ip_address"`
	UserAgent string    `json:"user_agent"`
}

// ============================================================================
// TOKEN-BASED AUTHENTICATION STRATEGY
// ============================================================================

// TokenStrategy implements JWT-based authentication
type TokenStrategy struct {
	storage storage.Provider
	config  Config
	secret  []byte
}

// NewTokenStrategy creates a new token authentication strategy
func NewTokenStrategy(storage storage.Provider, config Config) *TokenStrategy {
	return &TokenStrategy{
		storage: storage,
		config:  config,
		secret:  []byte("your-secret-key"), // In production, use environment variable
	}
}

// GetType returns the strategy type
func (s *TokenStrategy) GetType() string {
	return "token"
}

// Authenticate authenticates a user and creates a JWT token
func (s *TokenStrategy) Authenticate(ctx context.Context, credentials Credentials) (*Result, error) {
	// Validate credentials
	user, err := s.validateCredentials(ctx, credentials)
	if err != nil {
		return nil, err
	}

	// Generate JWT token
	token := s.generateJWTToken(user)

	// Generate refresh token
	refreshToken := s.generateRefreshToken()

	// Store refresh token
	refreshData := RefreshTokenData{
		UserID:    user.ID,
		Token:     refreshToken,
		ExpiresAt: time.Now().Add(s.config.RefreshTimeout),
	}

	refreshBytes, _ := json.Marshal(refreshData)
	ttl := s.config.RefreshTimeout
	err = s.storage.Save(ctx, "refresh:"+refreshToken, refreshBytes, &ttl)
	if err != nil {
		return nil, fmt.Errorf("failed to store refresh token: %w", err)
	}

	return &Result{
		User:         user,
		Token:        token,
		TokenType:    "jwt",
		ExpiresAt:    time.Now().Add(s.config.TokenTimeout),
		RefreshToken: refreshToken,
	}, nil
}

// Validate validates a JWT token
func (s *TokenStrategy) Validate(_ context.Context, token string) (*Result, error) {
	// Parse and validate JWT token
	claims, err := s.parseJWTToken(token)
	if err != nil {
		return nil, err
	}

	// Check if token has expired
	if time.Now().After(claims.ExpiresAt) {
		return nil, errors.New("token expired")
	}

	// Create user object from claims
	user := &domain.User{
		ID:       claims.UserID,
		Username: claims.Username,
		Email:    claims.Email,
	}

	return &Result{
		User:      user,
		Token:     token,
		TokenType: "jwt",
		ExpiresAt: claims.ExpiresAt,
	}, nil
}

// Refresh refreshes a JWT token using a refresh token
func (s *TokenStrategy) Refresh(ctx context.Context, refreshToken string) (*Result, error) {
	// Validate refresh token
	refreshData, err := s.validateRefreshToken(ctx, refreshToken)
	if err != nil {
		return nil, err
	}

	// Generate new JWT token
	user := &domain.User{
		ID:       refreshData.UserID,
		Username: refreshData.Username,
		Email:    refreshData.Email,
	}

	token := s.generateJWTToken(user)

	// Generate new refresh token
	newRefreshToken := s.generateRefreshToken()

	// Update refresh token
	newRefreshData := RefreshTokenData{
		UserID:    refreshData.UserID,
		Username:  refreshData.Username,
		Email:     refreshData.Email,
		Token:     newRefreshToken,
		ExpiresAt: time.Now().Add(s.config.RefreshTimeout),
	}

	newRefreshBytes, _ := json.Marshal(newRefreshData)
	ttl := s.config.RefreshTimeout

	// Store new refresh token
	err = s.storage.Save(ctx, "refresh:"+newRefreshToken, newRefreshBytes, &ttl)
	if err != nil {
		return nil, fmt.Errorf("failed to store new refresh token: %w", err)
	}

	// Remove old refresh token
	if deleteErr := s.storage.Delete(ctx, "refresh:"+refreshToken); deleteErr != nil {
		slog.Error("Failed to delete old refresh token", "error", deleteErr)
	}

	return &Result{
		User:         user,
		Token:        token,
		TokenType:    "jwt",
		ExpiresAt:    time.Now().Add(s.config.TokenTimeout),
		RefreshToken: newRefreshToken,
	}, nil
}

// Revoke revokes a refresh token
func (s *TokenStrategy) Revoke(ctx context.Context, refreshToken string) error {
	return s.storage.Delete(ctx, "refresh:"+refreshToken)
}

// validateCredentials validates user credentials
func (s *TokenStrategy) validateCredentials(_ context.Context, credentials Credentials) (*domain.User, error) {
	// Same implementation as SessionStrategy
	if credentials.Username == "" || credentials.Password == "" {
		return nil, errors.New("username and password are required")
	}

	if len(credentials.Password) < s.config.PasswordMinLength {
		return nil, errors.New("password must be at least " + strconv.Itoa(s.config.PasswordMinLength) + " characters")
	}

	user := &domain.User{
		ID:       1,
		Username: credentials.Username,
		Email:    credentials.Username + "@example.com",
	}

	return user, nil
}

// generateJWTToken generates a JWT token
func (s *TokenStrategy) generateJWTToken(user *domain.User) string {
	// This is a simplified JWT implementation
	// In production, use a proper JWT library

	claims := JWTClaims{
		UserID:    user.ID,
		Username:  user.Username,
		Email:     user.Email,
		IssuedAt:  time.Now(),
		ExpiresAt: time.Now().Add(s.config.TokenTimeout),
	}

	claimsBytes, _ := json.Marshal(claims)
	claimsB64 := base64.URLEncoding.EncodeToString(claimsBytes)

	// Generate signature (simplified)
	signature := s.generateSignature(claimsB64)
	signatureB64 := base64.URLEncoding.EncodeToString(signature)

	return fmt.Sprintf("%s.%s", claimsB64, signatureB64)
}

// parseJWTToken parses and validates a JWT token
func (s *TokenStrategy) parseJWTToken(token string) (*JWTClaims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return nil, errors.New("invalid token format")
	}

	claimsB64 := parts[0]
	signatureB64 := parts[1]

	// Verify signature
	expectedSignature := s.generateSignature(claimsB64)
	expectedSignatureB64 := base64.URLEncoding.EncodeToString(expectedSignature)

	if signatureB64 != expectedSignatureB64 {
		return nil, errors.New("invalid signature")
	}

	// Parse claims
	claimsBytes, err := base64.URLEncoding.DecodeString(claimsB64)
	if err != nil {
		return nil, errors.New("invalid claims encoding")
	}

	var claims JWTClaims
	if err := json.Unmarshal(claimsBytes, &claims); err != nil {
		return nil, errors.New("invalid claims format")
	}

	return &claims, nil
}

// generateSignature generates a signature for JWT claims
func (s *TokenStrategy) generateSignature(claimsB64 string) []byte {
	hash := sha256.New()
	hash.Write([]byte(claimsB64))
	hash.Write(s.secret)
	return hash.Sum(nil)
}

// generateRefreshToken generates a secure refresh token
func (s *TokenStrategy) generateRefreshToken() string {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		slog.Error("Failed to generate random bytes for refresh token", "error", err)
		// Fallback to a deterministic but unique token
		return "fallback_refresh_" + strconv.FormatInt(time.Now().UnixNano(), 10) + "_" + strconv.FormatInt(int64(s.config.RefreshTimeout), 10)
	}
	return base64.URLEncoding.EncodeToString(bytes)
}

// validateRefreshToken validates a refresh token
func (s *TokenStrategy) validateRefreshToken(ctx context.Context, refreshToken string) (*RefreshTokenData, error) {
	refreshBytes, err := s.storage.Load(ctx, "refresh:"+refreshToken)
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}

	var refreshData RefreshTokenData
	refreshBytesData, ok := refreshBytes.([]byte)
	if !ok {
		return nil, errors.New("invalid refresh token data type")
	}
	if err := json.Unmarshal(refreshBytesData, &refreshData); err != nil {
		return nil, errors.New("invalid refresh token data")
	}

	if time.Now().After(refreshData.ExpiresAt) {
		// Remove expired refresh token
		if deleteErr := s.storage.Delete(ctx, "refresh:"+refreshToken); deleteErr != nil {
			slog.Error("Failed to delete expired refresh token", "error", deleteErr)
		}
		return nil, errors.New("refresh token expired")
	}

	return &refreshData, nil
}

// JWTClaims represents JWT token claims
type JWTClaims struct {
	UserID    int64     `json:"user_id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	IssuedAt  time.Time `json:"iat"`
	ExpiresAt time.Time `json:"exp"`
}

// RefreshTokenData represents refresh token information
type RefreshTokenData struct {
	UserID    int64     `json:"user_id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
}
