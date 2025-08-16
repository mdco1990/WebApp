// Package service defines interfaces for dependency injection and testing.
package service

import (
	"context"

	"github.com/mdco1990/webapp/internal/domain"
)

// RepositoryInterface defines the interface for repository operations.
// This allows for dependency injection and easier testing.
type RepositoryInterface interface {
	// Monthly data operations
	GetMonthlyData(ctx context.Context, userID int64, ym domain.YearMonth) (*domain.MonthlyData, error)

	// Legacy operations
	UpsertSalary(ctx context.Context, ym domain.YearMonth, amount domain.Money) error
	UpsertBudget(ctx context.Context, ym domain.YearMonth, amount domain.Money) error
	AddExpense(ctx context.Context, e *domain.Expense) (int64, error)
	ListExpenses(ctx context.Context, ym domain.YearMonth) ([]domain.Expense, error)
	DeleteExpense(ctx context.Context, id int64) error
	GetSalary(ctx context.Context, ym domain.YearMonth) (domain.Money, error)
	GetBudget(ctx context.Context, ym domain.YearMonth) (domain.Money, error)
	GetExpensesTotal(ctx context.Context, ym domain.YearMonth) (domain.Money, error)

	// User operations
	CreateUser(ctx context.Context, username, email, passwordHash string) (*domain.User, error)
	GetUserByUsername(ctx context.Context, username string) (*domain.User, string, error)
	GetUserByID(ctx context.Context, userID int64) (*domain.User, string, error)
	IsUserAdmin(ctx context.Context, userID int64) (bool, error)
	UpdateUserPassword(ctx context.Context, userID int64, passwordHash string) error
	UpdateLastLogin(ctx context.Context, userID int64) error

	// Session operations
	CreateSession(ctx context.Context, userID int64) (*domain.Session, error)
	GetSession(ctx context.Context, sessionID string) (*domain.Session, error)
	DeleteSession(ctx context.Context, sessionID string) error

	// Income source operations
	CreateIncomeSource(ctx context.Context, userID int64, req domain.CreateIncomeSourceRequest) (*domain.IncomeSource, error)
	UpdateIncomeSource(ctx context.Context, id, userID int64, req domain.UpdateSourceRequest) error
	ListIncomeSources(ctx context.Context, userID int64, ym domain.YearMonth) ([]domain.IncomeSource, error)
	DeleteIncomeSource(ctx context.Context, id, userID int64) error

	// Budget source operations
	CreateBudgetSource(ctx context.Context, userID int64, req domain.CreateBudgetSourceRequest) (*domain.BudgetSource, error)
	UpdateBudgetSource(ctx context.Context, id, userID int64, req domain.UpdateSourceRequest) error
	ListBudgetSources(ctx context.Context, userID int64, ym domain.YearMonth) ([]domain.BudgetSource, error)
	DeleteBudgetSource(ctx context.Context, id, userID int64) error

	// Manual budget operations
	GetManualBudget(ctx context.Context, userID int64, ym domain.YearMonth) (*domain.ManualBudget, error)
	UpsertManualBudget(ctx context.Context, userID int64, ym domain.YearMonth, bankAmount domain.Money, items []domain.ManualBudgetItem) error

	// User management operations
	ListUsers(ctx context.Context, status string) ([]domain.User, error)
	UpdateUserStatus(ctx context.Context, userID int64, status string) error
	DeleteUser(ctx context.Context, userID int64) error
}
