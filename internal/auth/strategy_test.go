package auth

import (
	"context"
	"testing"
	"time"

	"github.com/mdco1990/webapp/internal/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// MockRepository for testing - implements minimal interface for auth tests
type MockRepository struct {
	mock.Mock
}

// Required methods for auth testing
func (m *MockRepository) GetUserByUsername(ctx context.Context, username string) (*domain.User, string, error) {
	args := m.Called(ctx, username)
	return args.Get(0).(*domain.User), args.Get(1).(string), args.Error(2)
}

func (m *MockRepository) GetUserByID(ctx context.Context, userID int64) (*domain.User, string, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(*domain.User), args.Get(1).(string), args.Error(2)
}

func (m *MockRepository) UpdateLastLogin(ctx context.Context, userID int64) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

func (m *MockRepository) GetSession(ctx context.Context, sessionID string) (*domain.Session, error) {
	args := m.Called(ctx, sessionID)
	return args.Get(0).(*domain.Session), args.Error(1)
}

func (m *MockRepository) CreateSession(ctx context.Context, userID int64) (*domain.Session, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(*domain.Session), args.Error(1)
}

func (m *MockRepository) DeleteSession(ctx context.Context, sessionID string) error {
	args := m.Called(ctx, sessionID)
	return args.Error(0)
}

// Stub implementations for other interface methods (not used in auth tests)
func (m *MockRepository) GetMonthlyData(ctx context.Context, userID int64, ym domain.YearMonth) (*domain.MonthlyData, error) {
	return nil, nil
}

func (m *MockRepository) AddExpense(ctx context.Context, e *domain.Expense) (int64, error) {
	return 0, nil
}

func (m *MockRepository) DeleteExpense(ctx context.Context, id int64) error {
	return nil
}

func (m *MockRepository) UpsertSalary(ctx context.Context, ym domain.YearMonth, amount domain.Money) error {
	return nil
}

func (m *MockRepository) UpsertBudget(ctx context.Context, ym domain.YearMonth, amount domain.Money) error {
	return nil
}

func (m *MockRepository) ListExpenses(ctx context.Context, ym domain.YearMonth) ([]domain.Expense, error) {
	return nil, nil
}

func (m *MockRepository) GetSalary(ctx context.Context, ym domain.YearMonth) (domain.Money, error) {
	return 0, nil
}

func (m *MockRepository) GetBudget(ctx context.Context, ym domain.YearMonth) (domain.Money, error) {
	return 0, nil
}

func (m *MockRepository) GetExpensesTotal(ctx context.Context, ym domain.YearMonth) (domain.Money, error) {
	return 0, nil
}

func (m *MockRepository) CreateUser(ctx context.Context, username, email, passwordHash string) (*domain.User, error) {
	return nil, nil
}

func (m *MockRepository) IsUserAdmin(ctx context.Context, userID int64) (bool, error) {
	return false, nil
}

func (m *MockRepository) UpdateUserPassword(ctx context.Context, userID int64, passwordHash string) error {
	return nil
}

func (m *MockRepository) CreateIncomeSource(ctx context.Context, userID int64, req domain.CreateIncomeSourceRequest) (*domain.IncomeSource, error) {
	return nil, nil
}

func (m *MockRepository) UpdateIncomeSource(ctx context.Context, id, userID int64, req domain.UpdateSourceRequest) error {
	return nil
}

func (m *MockRepository) ListIncomeSources(ctx context.Context, userID int64, ym domain.YearMonth) ([]domain.IncomeSource, error) {
	return nil, nil
}

func (m *MockRepository) DeleteIncomeSource(ctx context.Context, id, userID int64) error {
	return nil
}

func (m *MockRepository) CreateBudgetSource(ctx context.Context, userID int64, req domain.CreateBudgetSourceRequest) (*domain.BudgetSource, error) {
	return nil, nil
}

func (m *MockRepository) UpdateBudgetSource(ctx context.Context, id, userID int64, req domain.UpdateSourceRequest) error {
	return nil
}

func (m *MockRepository) ListBudgetSources(ctx context.Context, userID int64, ym domain.YearMonth) ([]domain.BudgetSource, error) {
	return nil, nil
}

func (m *MockRepository) DeleteBudgetSource(ctx context.Context, id, userID int64) error {
	return nil
}

func (m *MockRepository) GetManualBudget(ctx context.Context, userID int64, ym domain.YearMonth) (*domain.ManualBudget, error) {
	return nil, nil
}

func (m *MockRepository) UpsertManualBudget(ctx context.Context, userID int64, ym domain.YearMonth, bankAmount domain.Money, items []domain.ManualBudgetItem) error {
	return nil
}

func (m *MockRepository) ListUsers(ctx context.Context, status string) ([]domain.User, error) {
	return nil, nil
}

func (m *MockRepository) UpdateUserStatus(ctx context.Context, userID int64, status string) error {
	return nil
}

func (m *MockRepository) DeleteUser(ctx context.Context, userID int64) error {
	return nil
}

func TestSessionAuth(t *testing.T) {
	ctx := context.Background()
	mockRepo := &MockRepository{}
	sessionAuth := NewSessionAuth(mockRepo)

	t.Run("Authenticate Success", func(t *testing.T) {
		credentials := &domain.LoginRequest{
			Username: "testuser",
			Password: "password123",
		}

		user := &domain.User{
			ID:       1,
			Username: "testuser",
			Email:    "test@example.com",
		}

		// Mock password hash (SHA256 of "password123")
		passwordHash := "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f"

		mockRepo.On("GetUserByUsername", ctx, "testuser").Return(user, passwordHash, nil)
		mockRepo.On("UpdateLastLogin", ctx, int64(1)).Return(nil)

		result, err := sessionAuth.Authenticate(ctx, credentials)
		require.NoError(t, err)
		assert.Equal(t, user, result)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Authenticate Invalid Credentials", func(t *testing.T) {
		credentials := &domain.LoginRequest{
			Username: "testuser",
			Password: "wrongpassword",
		}

		user := &domain.User{
			ID:       1,
			Username: "testuser",
			Email:    "test@example.com",
		}

		passwordHash := "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f"

		mockRepo.On("GetUserByUsername", ctx, "testuser").Return(user, passwordHash, nil)

		result, err := sessionAuth.Authenticate(ctx, credentials)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid credentials")
		assert.Nil(t, result)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Authenticate User Not Found", func(t *testing.T) {
		credentials := &domain.LoginRequest{
			Username: "nonexistent",
			Password: "password123",
		}

		mockRepo.On("GetUserByUsername", ctx, "nonexistent").Return((*domain.User)(nil), "", assert.AnError)

		result, err := sessionAuth.Authenticate(ctx, credentials)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "authentication failed")
		assert.Nil(t, result)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Validate Session Success", func(t *testing.T) {
		sessionID := "test-session-id"
		session := &domain.Session{
			ID:        sessionID,
			UserID:    1,
			ExpiresAt: time.Now().Add(1 * time.Hour),
		}

		user := &domain.User{
			ID:       1,
			Username: "testuser",
			Email:    "test@example.com",
		}

		mockRepo.On("GetSession", ctx, sessionID).Return(session, nil)
		mockRepo.On("GetUserByID", ctx, int64(1)).Return(user, "", nil)

		result, err := sessionAuth.Validate(ctx, sessionID)
		require.NoError(t, err)
		assert.Equal(t, user, result)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Validate Expired Session", func(t *testing.T) {
		sessionID := "expired-session-id"
		session := &domain.Session{
			ID:        sessionID,
			UserID:    1,
			ExpiresAt: time.Now().Add(-1 * time.Hour), // Expired
		}

		mockRepo.On("GetSession", ctx, sessionID).Return(session, nil)
		mockRepo.On("DeleteSession", ctx, sessionID).Return(nil)

		result, err := sessionAuth.Validate(ctx, sessionID)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "session expired")
		assert.Nil(t, result)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Refresh Session Success", func(t *testing.T) {
		oldSessionID := "old-session-id"
		newSession := &domain.Session{
			ID:        "new-session-id",
			UserID:    1,
			ExpiresAt: time.Now().Add(1 * time.Hour),
		}

		oldSession := &domain.Session{
			ID:        oldSessionID,
			UserID:    1,
			ExpiresAt: time.Now().Add(1 * time.Hour),
		}

		user := &domain.User{
			ID:       1,
			Username: "testuser",
			Email:    "test@example.com",
		}

		mockRepo.On("GetSession", ctx, oldSessionID).Return(oldSession, nil)
		mockRepo.On("GetUserByID", ctx, int64(1)).Return(user, "", nil)
		mockRepo.On("CreateSession", ctx, int64(1)).Return(newSession, nil)
		mockRepo.On("DeleteSession", ctx, oldSessionID).Return(nil)

		newSessionID, err := sessionAuth.Refresh(ctx, oldSessionID)
		require.NoError(t, err)
		assert.Equal(t, newSession.ID, newSessionID)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Revoke Session", func(t *testing.T) {
		sessionID := "session-to-revoke"

		mockRepo.On("DeleteSession", ctx, sessionID).Return(nil)

		err := sessionAuth.Revoke(ctx, sessionID)
		require.NoError(t, err)

		mockRepo.AssertExpectations(t)
	})
}

func TestTokenAuth(t *testing.T) {
	ctx := context.Background()
	mockRepo := &MockRepository{}
	tokenAuth := NewTokenAuth("test-secret", mockRepo)

	t.Run("Authenticate Success", func(t *testing.T) {
		credentials := &domain.LoginRequest{
			Username: "testuser",
			Password: "password123",
		}

		user := &domain.User{
			ID:       1,
			Username: "testuser",
			Email:    "test@example.com",
		}

		passwordHash := "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f"

		mockRepo.On("GetUserByUsername", ctx, "testuser").Return(user, passwordHash, nil)
		mockRepo.On("UpdateLastLogin", ctx, int64(1)).Return(nil)

		result, err := tokenAuth.Authenticate(ctx, credentials)
		require.NoError(t, err)
		assert.Equal(t, user, result)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Validate Token Success", func(t *testing.T) {
		token := "valid-token-1234567890"

		user := &domain.User{
			ID:       1,
			Username: "testuser",
			Email:    "test@example.com",
		}

		mockRepo.On("GetUserByID", ctx, int64(1)).Return(user, "", nil)

		result, err := tokenAuth.Validate(ctx, token)
		require.NoError(t, err)
		assert.Equal(t, user, result)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Validate Invalid Token", func(t *testing.T) {
		token := "invalid"

		result, err := tokenAuth.Validate(ctx, token)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid token")
		assert.Nil(t, result)
	})

	t.Run("Refresh Token Success", func(t *testing.T) {
		token := "valid-token-1234567890"

		user := &domain.User{
			ID:       1,
			Username: "testuser",
			Email:    "test@example.com",
		}

		mockRepo.On("GetUserByID", ctx, int64(1)).Return(user, "", nil)

		newToken, err := tokenAuth.Refresh(ctx, token)
		require.NoError(t, err)
		assert.NotEmpty(t, newToken)
		assert.NotEqual(t, token, newToken)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Revoke Token", func(t *testing.T) {
		token := "token-to-revoke"

		err := tokenAuth.Revoke(ctx, token)
		require.NoError(t, err)
	})
}

func TestOAuthAuth(t *testing.T) {
	ctx := context.Background()
	mockRepo := &MockRepository{}
	oauthAuth := NewOAuthAuth("google", mockRepo)

	t.Run("Authenticate Success", func(t *testing.T) {
		credentials := &domain.OAuthRequest{
			Token:    "oauth-token-123",
			Provider: "google",
		}

		user := &domain.User{
			ID:       1,
			Username: "oauthuser",
			Email:    "oauth@example.com",
		}

		mockRepo.On("GetUserByID", ctx, int64(1)).Return(user, "", nil)
		mockRepo.On("UpdateLastLogin", ctx, int64(1)).Return(nil)

		result, err := oauthAuth.Authenticate(ctx, credentials)
		require.NoError(t, err)
		assert.Equal(t, user, result)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Authenticate Invalid Credentials Type", func(t *testing.T) {
		credentials := &domain.LoginRequest{
			Username: "testuser",
			Password: "password123",
		}

		result, err := oauthAuth.Authenticate(ctx, credentials)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid credentials type for OAuth auth")
		assert.Nil(t, result)
	})

	t.Run("Validate OAuth Token", func(t *testing.T) {
		token := "oauth-token-123"

		user := &domain.User{
			ID:       1,
			Username: "oauthuser",
			Email:    "oauth@example.com",
		}

		mockRepo.On("GetUserByID", ctx, int64(1)).Return(user, "", nil)

		result, err := oauthAuth.Validate(ctx, token)
		require.NoError(t, err)
		assert.Equal(t, user, result)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Refresh OAuth Token", func(t *testing.T) {
		token := "oauth-token-123"

		newToken, err := oauthAuth.Refresh(ctx, token)
		require.NoError(t, err)
		assert.Equal(t, token, newToken) // OAuth refresh returns same token in mock
	})

	t.Run("Revoke OAuth Token", func(t *testing.T) {
		token := "oauth-token-to-revoke"

		err := oauthAuth.Revoke(ctx, token)
		require.NoError(t, err)
	})
}

func TestAuthService(t *testing.T) {
	ctx := context.Background()
	authService := NewAuthService()

	t.Run("Register and Use Strategies", func(t *testing.T) {
		mockRepo := &MockRepository{}

		// Register strategies
		sessionAuth := NewSessionAuth(mockRepo)
		tokenAuth := NewTokenAuth("test-secret", mockRepo)
		oauthAuth := NewOAuthAuth("google", mockRepo)

		authService.RegisterStrategy("session", sessionAuth)
		authService.RegisterStrategy("token", tokenAuth)
		authService.RegisterStrategy("oauth", oauthAuth)

		// Test available strategies
		strategies := authService.GetAvailableStrategies()
		assert.Contains(t, strategies, "session")
		assert.Contains(t, strategies, "token")
		assert.Contains(t, strategies, "oauth")

		// Test default strategy
		assert.Equal(t, "session", authService.GetDefaultStrategy())
	})

	t.Run("Authenticate with Specific Strategy", func(t *testing.T) {
		mockRepo := &MockRepository{}
		sessionAuth := NewSessionAuth(mockRepo)
		authService.RegisterStrategy("session", sessionAuth)

		credentials := &domain.LoginRequest{
			Username: "testuser",
			Password: "password123",
		}

		user := &domain.User{
			ID:       1,
			Username: "testuser",
			Email:    "test@example.com",
		}

		passwordHash := "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f"

		mockRepo.On("GetUserByUsername", ctx, "testuser").Return(user, passwordHash, nil)
		mockRepo.On("UpdateLastLogin", ctx, int64(1)).Return(nil)

		result, err := authService.Authenticate(ctx, "session", credentials)
		require.NoError(t, err)
		assert.Equal(t, user, result)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Authenticate with Default Strategy", func(t *testing.T) {
		mockRepo := &MockRepository{}
		sessionAuth := NewSessionAuth(mockRepo)
		authService.RegisterStrategy("session", sessionAuth)

		credentials := &domain.LoginRequest{
			Username: "testuser",
			Password: "password123",
		}

		user := &domain.User{
			ID:       1,
			Username: "testuser",
			Email:    "test@example.com",
		}

		passwordHash := "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f"

		mockRepo.On("GetUserByUsername", ctx, "testuser").Return(user, passwordHash, nil)
		mockRepo.On("UpdateLastLogin", ctx, int64(1)).Return(nil)

		result, err := authService.AuthenticateDefault(ctx, credentials)
		require.NoError(t, err)
		assert.Equal(t, user, result)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Authenticate with Non-existent Strategy", func(t *testing.T) {
		credentials := &domain.LoginRequest{
			Username: "testuser",
			Password: "password123",
		}

		result, err := authService.Authenticate(ctx, "nonexistent", credentials)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unsupported auth method")
		assert.Nil(t, result)
	})

	t.Run("Set Default Strategy", func(t *testing.T) {
		mockRepo := &MockRepository{}
		tokenAuth := NewTokenAuth("test-secret", mockRepo)
		authService.RegisterStrategy("token", tokenAuth)

		authService.SetDefaultStrategy("token")
		assert.Equal(t, "token", authService.GetDefaultStrategy())

		// Reset to session
		authService.SetDefaultStrategy("session")
		assert.Equal(t, "session", authService.GetDefaultStrategy())
	})

	t.Run("Validate with Strategy", func(t *testing.T) {
		mockRepo := &MockRepository{}
		sessionAuth := NewSessionAuth(mockRepo)
		authService.RegisterStrategy("session", sessionAuth)

		sessionID := "test-session-id"
		session := &domain.Session{
			ID:        sessionID,
			UserID:    1,
			ExpiresAt: time.Now().Add(1 * time.Hour),
		}

		user := &domain.User{
			ID:       1,
			Username: "testuser",
			Email:    "test@example.com",
		}

		mockRepo.On("GetSession", ctx, sessionID).Return(session, nil)
		mockRepo.On("GetUserByID", ctx, int64(1)).Return(user, "", nil)

		result, err := authService.Validate(ctx, "session", sessionID)
		require.NoError(t, err)
		assert.Equal(t, user, result)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Refresh with Strategy", func(t *testing.T) {
		mockRepo := &MockRepository{}
		sessionAuth := NewSessionAuth(mockRepo)
		authService.RegisterStrategy("session", sessionAuth)

		oldSessionID := "old-session-id"
		newSession := &domain.Session{
			ID:        "new-session-id",
			UserID:    1,
			ExpiresAt: time.Now().Add(1 * time.Hour),
		}

		oldSession := &domain.Session{
			ID:        oldSessionID,
			UserID:    1,
			ExpiresAt: time.Now().Add(1 * time.Hour),
		}

		user := &domain.User{
			ID:       1,
			Username: "testuser",
			Email:    "test@example.com",
		}

		mockRepo.On("GetSession", ctx, oldSessionID).Return(oldSession, nil)
		mockRepo.On("GetUserByID", ctx, int64(1)).Return(user, "", nil)
		mockRepo.On("CreateSession", ctx, int64(1)).Return(newSession, nil)
		mockRepo.On("DeleteSession", ctx, oldSessionID).Return(nil)

		newSessionID, err := authService.Refresh(ctx, "session", oldSessionID)
		require.NoError(t, err)
		assert.Equal(t, newSession.ID, newSessionID)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Revoke with Strategy", func(t *testing.T) {
		mockRepo := &MockRepository{}
		sessionAuth := NewSessionAuth(mockRepo)
		authService.RegisterStrategy("session", sessionAuth)

		sessionID := "session-to-revoke"

		mockRepo.On("DeleteSession", ctx, sessionID).Return(nil)

		err := authService.Revoke(ctx, "session", sessionID)
		require.NoError(t, err)

		mockRepo.AssertExpectations(t)
	})
}
