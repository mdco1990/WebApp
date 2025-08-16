package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/mdco1990/webapp/internal/domain"
	"github.com/mdco1990/webapp/internal/service"
)

// AuthStrategy defines the interface for authentication strategies
type AuthStrategy interface {
	Authenticate(ctx context.Context, credentials interface{}) (*domain.User, error)
	Validate(ctx context.Context, token string) (*domain.User, error)
	Refresh(ctx context.Context, token string) (string, error)
	Revoke(ctx context.Context, token string) error
}

// SessionAuth implements session-based authentication
type SessionAuth struct {
	repo service.RepositoryInterface
}

// NewSessionAuth creates a new session authentication strategy
func NewSessionAuth(repo service.RepositoryInterface) *SessionAuth {
	return &SessionAuth{
		repo: repo,
	}
}

// Authenticate implements session-based authentication
func (s *SessionAuth) Authenticate(ctx context.Context, credentials interface{}) (*domain.User, error) {
	creds, ok := credentials.(*domain.LoginRequest)
	if !ok {
		return nil, errors.New("invalid credentials type for session auth")
	}

	// Get user by username
	user, passwordHash, err := s.repo.GetUserByUsername(ctx, creds.Username)
	if err != nil {
		return nil, fmt.Errorf("authentication failed: %w", err)
	}

	// Validate password
	if !s.validatePassword(creds.Password, passwordHash) {
		return nil, errors.New("invalid credentials")
	}

	// Update last login
	err = s.repo.UpdateLastLogin(ctx, user.ID)
	if err != nil {
		// Log error but don't fail authentication
		fmt.Printf("Failed to update last login: %v\n", err)
	}

	return user, nil
}

// Validate validates a session token
func (s *SessionAuth) Validate(ctx context.Context, sessionID string) (*domain.User, error) {
	session, err := s.repo.GetSession(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("invalid session: %w", err)
	}

	// Check if session is expired
	if time.Now().After(session.ExpiresAt) {
		// Clean up expired session
		s.repo.DeleteSession(ctx, sessionID)
		return nil, errors.New("session expired")
	}

	// Get user from session
	user, _, err := s.repo.GetUserByID(ctx, session.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	return user, nil
}

// Refresh refreshes a session token
func (s *SessionAuth) Refresh(ctx context.Context, sessionID string) (string, error) {
	// Validate existing session
	_, err := s.Validate(ctx, sessionID)
	if err != nil {
		return "", err
	}

	// Create new session
	session, err := s.repo.CreateSession(ctx, 1) // Using userID 1 as default
	if err != nil {
		return "", fmt.Errorf("failed to create new session: %w", err)
	}

	// Delete old session
	s.repo.DeleteSession(ctx, sessionID)

	return session.ID, nil
}

// Revoke revokes a session token
func (s *SessionAuth) Revoke(ctx context.Context, sessionID string) error {
	return s.repo.DeleteSession(ctx, sessionID)
}

// validatePassword validates a password against its hash
func (s *SessionAuth) validatePassword(password, hash string) bool {
	// In a real implementation, you would use bcrypt or similar
	// For now, we'll use a simple SHA256 comparison
	hashedPassword := sha256.Sum256([]byte(password))
	hashedPasswordStr := hex.EncodeToString(hashedPassword[:])
	return hashedPasswordStr == hash
}

// TokenAuth implements JWT-based authentication
type TokenAuth struct {
	jwtSecret string
	repo      service.RepositoryInterface
}

// NewTokenAuth creates a new token authentication strategy
func NewTokenAuth(jwtSecret string, repo service.RepositoryInterface) *TokenAuth {
	return &TokenAuth{
		jwtSecret: jwtSecret,
		repo:      repo,
	}
}

// Authenticate implements JWT-based authentication
func (s *TokenAuth) Authenticate(ctx context.Context, credentials interface{}) (*domain.User, error) {
	creds, ok := credentials.(*domain.LoginRequest)
	if !ok {
		return nil, errors.New("invalid credentials type for token auth")
	}

	// Get user by username
	user, passwordHash, err := s.repo.GetUserByUsername(ctx, creds.Username)
	if err != nil {
		return nil, fmt.Errorf("authentication failed: %w", err)
	}

	// Validate password
	if !s.validatePassword(creds.Password, passwordHash) {
		return nil, errors.New("invalid credentials")
	}

	// Update last login
	err = s.repo.UpdateLastLogin(ctx, user.ID)
	if err != nil {
		// Log error but don't fail authentication
		fmt.Printf("Failed to update last login: %v\n", err)
	}

	return user, nil
}

// Validate validates a JWT token
func (s *TokenAuth) Validate(ctx context.Context, token string) (*domain.User, error) {
	// In a real implementation, you would decode and validate the JWT
	// For now, we'll simulate JWT validation
	claims, err := s.decodeJWT(token)
	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	// Check if token is expired
	if time.Now().Unix() > claims.ExpiresAt {
		return nil, errors.New("token expired")
	}

	// Get user from claims
	user, _, err := s.repo.GetUserByID(ctx, claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	return user, nil
}

// Refresh refreshes a JWT token
func (s *TokenAuth) Refresh(ctx context.Context, token string) (string, error) {
	// Validate existing token
	user, err := s.Validate(ctx, token)
	if err != nil {
		return "", err
	}

	// Generate new token
	newToken, err := s.generateJWT(user)
	if err != nil {
		return "", fmt.Errorf("failed to generate new token: %w", err)
	}

	return newToken, nil
}

// Revoke revokes a JWT token (in a real implementation, you'd add to a blacklist)
func (s *TokenAuth) Revoke(ctx context.Context, token string) error {
	// In a real implementation, you would add the token to a blacklist
	// For now, we'll just return success
	return nil
}

// validatePassword validates a password against its hash
func (s *TokenAuth) validatePassword(password, hash string) bool {
	// In a real implementation, you would use bcrypt or similar
	// For now, we'll use a simple SHA256 comparison
	hashedPassword := sha256.Sum256([]byte(password))
	hashedPasswordStr := hex.EncodeToString(hashedPassword[:])
	return hashedPasswordStr == hash
}

// JWTClaims represents JWT claims
type JWTClaims struct {
	UserID    int64  `json:"user_id"`
	Username  string `json:"username"`
	ExpiresAt int64  `json:"exp"`
	IssuedAt  int64  `json:"iat"`
}

// decodeJWT decodes and validates a JWT token
func (s *TokenAuth) decodeJWT(token string) (*JWTClaims, error) {
	// In a real implementation, you would use a JWT library
	// For now, we'll simulate JWT decoding
	if len(token) < 10 {
		return nil, errors.New("invalid token format")
	}

	// Simulate JWT claims
	claims := &JWTClaims{
		UserID:    1, // Default user ID
		Username:  "testuser",
		ExpiresAt: time.Now().Add(24 * time.Hour).Unix(),
		IssuedAt:  time.Now().Unix(),
	}

	return claims, nil
}

// generateJWT generates a new JWT token
func (s *TokenAuth) generateJWT(user *domain.User) (string, error) {
	// In a real implementation, you would use a JWT library
	// For now, we'll generate a simple token
	tokenBytes := make([]byte, 32)
	_, err := rand.Read(tokenBytes)
	if err != nil {
		return "", err
	}

	return hex.EncodeToString(tokenBytes), nil
}

// OAuthAuth implements OAuth-based authentication
type OAuthAuth struct {
	provider string
	repo     service.RepositoryInterface
}

// NewOAuthAuth creates a new OAuth authentication strategy
func NewOAuthAuth(provider string, repo service.RepositoryInterface) *OAuthAuth {
	return &OAuthAuth{
		provider: provider,
		repo:     repo,
	}
}

// Authenticate implements OAuth-based authentication
func (s *OAuthAuth) Authenticate(ctx context.Context, credentials interface{}) (*domain.User, error) {
	creds, ok := credentials.(*domain.OAuthRequest)
	if !ok {
		return nil, errors.New("invalid credentials type for OAuth auth")
	}

	// In a real implementation, you would validate the OAuth token with the provider
	// For now, we'll simulate OAuth validation
	user, err := s.validateOAuthToken(ctx, creds.Token, creds.Provider)
	if err != nil {
		return nil, fmt.Errorf("OAuth validation failed: %w", err)
	}

	// Update last login
	err = s.repo.UpdateLastLogin(ctx, user.ID)
	if err != nil {
		// Log error but don't fail authentication
		fmt.Printf("Failed to update last login: %v\n", err)
	}

	return user, nil
}

// Validate validates an OAuth token
func (s *OAuthAuth) Validate(ctx context.Context, token string) (*domain.User, error) {
	// In a real implementation, you would validate the OAuth token
	// For now, we'll simulate validation
	user, err := s.validateOAuthToken(ctx, token, s.provider)
	if err != nil {
		return nil, fmt.Errorf("OAuth validation failed: %w", err)
	}

	return user, nil
}

// Refresh refreshes an OAuth token
func (s *OAuthAuth) Refresh(ctx context.Context, token string) (string, error) {
	// In a real implementation, you would refresh the OAuth token
	// For now, we'll return the same token
	return token, nil
}

// Revoke revokes an OAuth token
func (s *OAuthAuth) Revoke(ctx context.Context, token string) error {
	// In a real implementation, you would revoke the OAuth token
	// For now, we'll just return success
	return nil
}

// validateOAuthToken validates an OAuth token
func (s *OAuthAuth) validateOAuthToken(ctx context.Context, token, provider string) (*domain.User, error) {
	// In a real implementation, you would validate the token with the OAuth provider
	// For now, we'll simulate validation and return a default user
	user, _, err := s.repo.GetUserByID(ctx, 1) // Default user ID
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	return user, nil
}

// AuthService manages multiple authentication strategies
type AuthService struct {
	strategies      map[string]AuthStrategy
	defaultStrategy string
}

// NewAuthService creates a new authentication service
func NewAuthService() *AuthService {
	return &AuthService{
		strategies:      make(map[string]AuthStrategy),
		defaultStrategy: "session",
	}
}

// RegisterStrategy registers an authentication strategy
func (s *AuthService) RegisterStrategy(name string, strategy AuthStrategy) {
	s.strategies[name] = strategy
}

// SetDefaultStrategy sets the default authentication strategy
func (s *AuthService) SetDefaultStrategy(name string) {
	if _, exists := s.strategies[name]; exists {
		s.defaultStrategy = name
	}
}

// Authenticate authenticates using the specified strategy
func (s *AuthService) Authenticate(ctx context.Context, method string, credentials interface{}) (*domain.User, error) {
	strategy, exists := s.strategies[method]
	if !exists {
		return nil, fmt.Errorf("unsupported auth method: %s", method)
	}
	return strategy.Authenticate(ctx, credentials)
}

// AuthenticateDefault authenticates using the default strategy
func (s *AuthService) AuthenticateDefault(ctx context.Context, credentials interface{}) (*domain.User, error) {
	return s.Authenticate(ctx, s.defaultStrategy, credentials)
}

// Validate validates a token using the specified strategy
func (s *AuthService) Validate(ctx context.Context, method, token string) (*domain.User, error) {
	strategy, exists := s.strategies[method]
	if !exists {
		return nil, fmt.Errorf("unsupported auth method: %s", method)
	}
	return strategy.Validate(ctx, token)
}

// ValidateDefault validates a token using the default strategy
func (s *AuthService) ValidateDefault(ctx context.Context, token string) (*domain.User, error) {
	return s.Validate(ctx, s.defaultStrategy, token)
}

// Refresh refreshes a token using the specified strategy
func (s *AuthService) Refresh(ctx context.Context, method, token string) (string, error) {
	strategy, exists := s.strategies[method]
	if !exists {
		return "", fmt.Errorf("unsupported auth method: %s", method)
	}
	return strategy.Refresh(ctx, token)
}

// RefreshDefault refreshes a token using the default strategy
func (s *AuthService) RefreshDefault(ctx context.Context, token string) (string, error) {
	return s.Refresh(ctx, s.defaultStrategy, token)
}

// Revoke revokes a token using the specified strategy
func (s *AuthService) Revoke(ctx context.Context, method, token string) error {
	strategy, exists := s.strategies[method]
	if !exists {
		return fmt.Errorf("unsupported auth method: %s", method)
	}
	return strategy.Revoke(ctx, token)
}

// RevokeDefault revokes a token using the default strategy
func (s *AuthService) RevokeDefault(ctx context.Context, token string) error {
	return s.Revoke(ctx, s.defaultStrategy, token)
}

// GetAvailableStrategies returns the list of available authentication strategies
func (s *AuthService) GetAvailableStrategies() []string {
	strategies := make([]string, 0, len(s.strategies))
	for name := range s.strategies {
		strategies = append(strategies, name)
	}
	return strategies
}

// GetDefaultStrategy returns the default authentication strategy name
func (s *AuthService) GetDefaultStrategy() string {
	return s.defaultStrategy
}
