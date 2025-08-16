package service

import (
	"context"
	"testing"
	"time"

	"github.com/mdco1990/webapp/internal/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockRepository is a mock implementation of the repository for testing
type MockRepository struct {
	mock.Mock
}

func (m *MockRepository) GetMonthlyData(ctx context.Context, userID int64, ym domain.YearMonth) (*domain.MonthlyData, error) {
	args := m.Called(ctx, userID, ym)
	return args.Get(0).(*domain.MonthlyData), args.Error(1)
}

// Implement other interface methods with empty implementations for testing
func (m *MockRepository) UpsertSalary(ctx context.Context, ym domain.YearMonth, amount domain.Money) error {
	args := m.Called(ctx, ym, amount)
	return args.Error(0)
}

func (m *MockRepository) UpsertBudget(ctx context.Context, ym domain.YearMonth, amount domain.Money) error {
	args := m.Called(ctx, ym, amount)
	return args.Error(0)
}

func (m *MockRepository) AddExpense(ctx context.Context, e *domain.Expense) (int64, error) {
	args := m.Called(ctx, e)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockRepository) ListExpenses(ctx context.Context, ym domain.YearMonth) ([]domain.Expense, error) {
	args := m.Called(ctx, ym)
	return args.Get(0).([]domain.Expense), args.Error(1)
}

func (m *MockRepository) DeleteExpense(ctx context.Context, id int64) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockRepository) GetSalary(ctx context.Context, ym domain.YearMonth) (domain.Money, error) {
	args := m.Called(ctx, ym)
	return args.Get(0).(domain.Money), args.Error(1)
}

func (m *MockRepository) GetBudget(ctx context.Context, ym domain.YearMonth) (domain.Money, error) {
	args := m.Called(ctx, ym)
	return args.Get(0).(domain.Money), args.Error(1)
}

func (m *MockRepository) GetExpensesTotal(ctx context.Context, ym domain.YearMonth) (domain.Money, error) {
	args := m.Called(ctx, ym)
	return args.Get(0).(domain.Money), args.Error(1)
}

// Implement remaining interface methods with empty implementations
func (m *MockRepository) CreateUser(ctx context.Context, username, email, passwordHash string) (*domain.User, error) {
	args := m.Called(ctx, username, email, passwordHash)
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *MockRepository) GetUserByUsername(ctx context.Context, username string) (*domain.User, string, error) {
	args := m.Called(ctx, username)
	return args.Get(0).(*domain.User), args.Get(1).(string), args.Error(2)
}

func (m *MockRepository) GetUserByID(ctx context.Context, userID int64) (*domain.User, string, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(*domain.User), args.Get(1).(string), args.Error(2)
}

func (m *MockRepository) IsUserAdmin(ctx context.Context, userID int64) (bool, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(bool), args.Error(1)
}

func (m *MockRepository) UpdateUserPassword(ctx context.Context, userID int64, passwordHash string) error {
	args := m.Called(ctx, userID, passwordHash)
	return args.Error(0)
}

func (m *MockRepository) UpdateLastLogin(ctx context.Context, userID int64) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

func (m *MockRepository) CreateSession(ctx context.Context, userID int64) (*domain.Session, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(*domain.Session), args.Error(1)
}

func (m *MockRepository) GetSession(ctx context.Context, sessionID string) (*domain.Session, error) {
	args := m.Called(ctx, sessionID)
	return args.Get(0).(*domain.Session), args.Error(1)
}

func (m *MockRepository) DeleteSession(ctx context.Context, sessionID string) error {
	args := m.Called(ctx, sessionID)
	return args.Error(0)
}

func (m *MockRepository) CreateIncomeSource(ctx context.Context, userID int64, req domain.CreateIncomeSourceRequest) (*domain.IncomeSource, error) {
	args := m.Called(ctx, userID, req)
	return args.Get(0).(*domain.IncomeSource), args.Error(1)
}

func (m *MockRepository) UpdateIncomeSource(ctx context.Context, id, userID int64, req domain.UpdateSourceRequest) error {
	args := m.Called(ctx, id, userID, req)
	return args.Error(0)
}

func (m *MockRepository) ListIncomeSources(ctx context.Context, userID int64, ym domain.YearMonth) ([]domain.IncomeSource, error) {
	args := m.Called(ctx, userID, ym)
	return args.Get(0).([]domain.IncomeSource), args.Error(1)
}

func (m *MockRepository) DeleteIncomeSource(ctx context.Context, id, userID int64) error {
	args := m.Called(ctx, id, userID)
	return args.Error(0)
}

func (m *MockRepository) CreateBudgetSource(ctx context.Context, userID int64, req domain.CreateBudgetSourceRequest) (*domain.BudgetSource, error) {
	args := m.Called(ctx, userID, req)
	return args.Get(0).(*domain.BudgetSource), args.Error(1)
}

func (m *MockRepository) UpdateBudgetSource(ctx context.Context, id, userID int64, req domain.UpdateSourceRequest) error {
	args := m.Called(ctx, id, userID, req)
	return args.Error(0)
}

func (m *MockRepository) ListBudgetSources(ctx context.Context, userID int64, ym domain.YearMonth) ([]domain.BudgetSource, error) {
	args := m.Called(ctx, userID, ym)
	return args.Get(0).([]domain.BudgetSource), args.Error(1)
}

func (m *MockRepository) DeleteBudgetSource(ctx context.Context, id, userID int64) error {
	args := m.Called(ctx, id, userID)
	return args.Error(0)
}

func (m *MockRepository) GetManualBudget(ctx context.Context, userID int64, ym domain.YearMonth) (*domain.ManualBudget, error) {
	args := m.Called(ctx, userID, ym)
	return args.Get(0).(*domain.ManualBudget), args.Error(1)
}

func (m *MockRepository) UpsertManualBudget(ctx context.Context, userID int64, ym domain.YearMonth, bankAmount domain.Money, items []domain.ManualBudgetItem) error {
	args := m.Called(ctx, userID, ym, bankAmount, items)
	return args.Error(0)
}

func (m *MockRepository) ListUsers(ctx context.Context, status string) ([]domain.User, error) {
	args := m.Called(ctx, status)
	return args.Get(0).([]domain.User), args.Error(1)
}

func (m *MockRepository) UpdateUserStatus(ctx context.Context, userID int64, status string) error {
	args := m.Called(ctx, userID, status)
	return args.Error(0)
}

func (m *MockRepository) DeleteUser(ctx context.Context, userID int64) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

func TestNewConcurrentService(t *testing.T) {
	mockRepo := &MockRepository{}
	service := NewConcurrentService(mockRepo)

	assert.NotNil(t, service)
	assert.NotNil(t, service.repo)
}

func TestGetMonthlyDataConcurrent_Success(t *testing.T) {
	mockRepo := &MockRepository{}
	service := NewConcurrentService(mockRepo)

	ym := domain.YearMonth{Year: 2024, Month: 1}

	// Mock successful response
	monthlyData := &domain.MonthlyData{
		YearMonth: ym,
		MonthName: "January",
		IncomeSources: []domain.IncomeSource{
			{ID: 1, UserID: 1, Name: "Salary", YearMonth: ym, AmountCents: 500000},
		},
		BudgetSources: []domain.BudgetSource{
			{ID: 1, UserID: 1, Name: "Food", YearMonth: ym, AmountCents: 100000},
		},
		Expenses: []domain.Expense{
			{ID: 1, YearMonth: ym, Description: "Groceries", AmountCents: 50000},
		},
		TotalIncome:   500000,
		TotalBudget:   100000,
		TotalExpenses: 50000,
		Remaining:     550000,
	}

	mockRepo.On("GetMonthlyData", mock.Anything, int64(1), ym).Return(monthlyData, nil)

	ctx := context.Background()
	result, err := service.GetMonthlyDataConcurrent(ctx, ym)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, ym, result.YearMonth)
	assert.Equal(t, "January", result.MonthName)
	assert.Equal(t, monthlyData.IncomeSources, result.IncomeSources)
	assert.Equal(t, monthlyData.BudgetSources, result.BudgetSources)
	assert.Equal(t, monthlyData.Expenses, result.Expenses)
	assert.Equal(t, domain.Money(500000), result.TotalIncome)
	assert.Equal(t, domain.Money(100000), result.TotalBudget)
	assert.Equal(t, domain.Money(50000), result.TotalExpenses)
	assert.Equal(t, domain.Money(550000), result.Remaining)

	mockRepo.AssertExpectations(t)
}

func TestGetMonthlyDataConcurrent_ValidationError(t *testing.T) {
	mockRepo := &MockRepository{}
	service := NewConcurrentService(mockRepo)

	// Invalid year/month
	ym := domain.YearMonth{Year: 1800, Month: 13}

	ctx := context.Background()
	result, err := service.GetMonthlyDataConcurrent(ctx, ym)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Equal(t, ErrValidation, err)
}

func TestGetMonthlyDataConcurrent_Error(t *testing.T) {
	mockRepo := &MockRepository{}
	service := NewConcurrentService(mockRepo)

	ym := domain.YearMonth{Year: 2024, Month: 1}

	// Mock error for GetMonthlyData
	mockRepo.On("GetMonthlyData", mock.Anything, int64(1), ym).Return((*domain.MonthlyData)(nil), assert.AnError)

	ctx := context.Background()
	result, err := service.GetMonthlyDataConcurrent(ctx, ym)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Equal(t, assert.AnError, err)

	mockRepo.AssertExpectations(t)
}

func TestGetMonthlyDataConcurrent_ContextTimeout(t *testing.T) {
	mockRepo := &MockRepository{}
	service := NewConcurrentService(mockRepo)

	ym := domain.YearMonth{Year: 2024, Month: 1}

	// Mock response
	mockRepo.On("GetMonthlyData", mock.Anything, int64(1), ym).Return(&domain.MonthlyData{}, nil)

	// Create context with very short timeout
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Millisecond)
	defer cancel()

	result, err := service.GetMonthlyDataConcurrent(ctx, ym)

	// Should timeout or complete successfully depending on timing
	if err != nil {
		assert.Contains(t, err.Error(), "context")
	} else {
		assert.NotNil(t, result)
	}
}

func TestGetMonthlyDataConcurrent_ContextCancellation(t *testing.T) {
	mockRepo := &MockRepository{}
	service := NewConcurrentService(mockRepo)

	ym := domain.YearMonth{Year: 2024, Month: 1}

	// Mock response
	mockRepo.On("GetMonthlyData", mock.Anything, int64(1), ym).Return(&domain.MonthlyData{}, nil)

	ctx, cancel := context.WithCancel(context.Background())

	// Cancel immediately
	cancel()

	result, err := service.GetMonthlyDataConcurrent(ctx, ym)

	// Should handle cancellation gracefully
	if err != nil {
		assert.Contains(t, err.Error(), "context")
	} else {
		assert.NotNil(t, result)
	}
}

func TestGetMonthName(t *testing.T) {
	tests := []struct {
		month    int
		expected string
	}{
		{1, "January"},
		{2, "February"},
		{3, "March"},
		{4, "April"},
		{5, "May"},
		{6, "June"},
		{7, "July"},
		{8, "August"},
		{9, "September"},
		{10, "October"},
		{11, "November"},
		{12, "December"},
		{0, "Unknown"},
		{13, "Unknown"},
		{-1, "Unknown"},
	}

	for _, test := range tests {
		result := getMonthName(test.month)
		assert.Equal(t, test.expected, result, "Month %d should return %s", test.month, test.expected)
	}
}

func TestGetMonthlyDataConcurrent_EmptyData(t *testing.T) {
	mockRepo := &MockRepository{}
	service := NewConcurrentService(mockRepo)

	ym := domain.YearMonth{Year: 2024, Month: 1}

	// Mock empty response
	emptyData := &domain.MonthlyData{
		YearMonth:     ym,
		MonthName:     "January",
		IncomeSources: []domain.IncomeSource{},
		BudgetSources: []domain.BudgetSource{},
		Expenses:      []domain.Expense{},
		TotalIncome:   0,
		TotalBudget:   0,
		TotalExpenses: 0,
		Remaining:     0,
	}

	mockRepo.On("GetMonthlyData", mock.Anything, int64(1), ym).Return(emptyData, nil)

	ctx := context.Background()
	result, err := service.GetMonthlyDataConcurrent(ctx, ym)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, ym, result.YearMonth)
	assert.Equal(t, "January", result.MonthName)
	assert.Empty(t, result.IncomeSources)
	assert.Empty(t, result.BudgetSources)
	assert.Empty(t, result.Expenses)
	assert.Equal(t, domain.Money(0), result.TotalIncome)
	assert.Equal(t, domain.Money(0), result.TotalBudget)
	assert.Equal(t, domain.Money(0), result.TotalExpenses)
	assert.Equal(t, domain.Money(0), result.Remaining)

	mockRepo.AssertExpectations(t)
}
