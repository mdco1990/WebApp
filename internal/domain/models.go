package domain

import "time"

// Money is represented in cents to avoid floating point issues.
type Money int64

// YearMonth identifies a month.
type YearMonth struct {
	Year  int `json:"year"`
	Month int `json:"month"`
}

// Salary record for a month.
type Salary struct {
	ID int64 `json:"id"`
	YearMonth
	AmountCents Money     `json:"amount_cents"`
	CreatedAt   time.Time `json:"created_at"`
}

// Budget record for a month.
type Budget struct {
	ID int64 `json:"id"`
	YearMonth
	AmountCents Money     `json:"amount_cents"`
	CreatedAt   time.Time `json:"created_at"`
}

// Expense entry.
type Expense struct {
	ID int64 `json:"id"`
	YearMonth
	Category    string    `json:"category,omitempty"`
	Description string    `json:"description"`
	AmountCents Money     `json:"amount_cents"`
	CreatedAt   time.Time `json:"created_at"`
}

// Summary aggregates for a month.
type Summary struct {
	YearMonth
	SalaryCents  Money `json:"salary_cents"`
	BudgetCents  Money `json:"budget_cents"`
	ExpenseCents Money `json:"expense_cents"`
	Remaining    Money `json:"remaining_cents"`
}

// Enhanced domain models for new features

// User represents an authenticated user
type User struct {
	ID        int64      `json:"id"`
	Username  string     `json:"username"`
	Email     string     `json:"email,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	LastLogin *time.Time `json:"last_login,omitempty"`
	IsAdmin   bool       `json:"is_admin,omitempty"`
}

// Session represents a user session
type Session struct {
	ID        string    `json:"id"`
	UserID    int64     `json:"user_id"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
}

// IncomeSource represents a named income source
type IncomeSource struct {
	ID     int64  `json:"id"`
	UserID int64  `json:"user_id"`
	Name   string `json:"name"`
	YearMonth
	AmountCents Money     `json:"amount_cents"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// BudgetSource represents a named budget category
type BudgetSource struct {
	ID     int64  `json:"id"`
	UserID int64  `json:"user_id"`
	Name   string `json:"name"`
	YearMonth
	AmountCents Money     `json:"amount_cents"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// MonthlyData aggregates all financial data for a month
type MonthlyData struct {
	YearMonth
	MonthName     string         `json:"month_name"`
	IncomeSources []IncomeSource `json:"income_sources"`
	BudgetSources []BudgetSource `json:"budget_sources"`
	Expenses      []Expense      `json:"expenses"`
	TotalIncome   Money          `json:"total_income_cents"`
	TotalBudget   Money          `json:"total_budget_cents"`
	TotalExpenses Money          `json:"total_expenses_cents"`
	Remaining     Money          `json:"remaining_cents"`
}

// ManualBudget models a user's month-specific manual budget plan (bank + ad-hoc items)
type ManualBudget struct {
	ID              int64 `json:"id"`
	UserID          int64 `json:"user_id"`
	YearMonth       `json:"-"`
	BankAmountCents Money              `json:"bank_amount_cents"`
	Items           []ManualBudgetItem `json:"items"`
}

type ManualBudgetItem struct {
	ID          int64  `json:"id"`
	BudgetID    int64  `json:"-"`
	Name        string `json:"name"`
	AmountCents Money  `json:"amount_cents"`
}

// Request/Response models
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Success   bool   `json:"success"`
	Message   string `json:"message"`
	SessionID string `json:"session_id,omitempty"`
	User      *User  `json:"user,omitempty"`
}

type CreateIncomeSourceRequest struct {
	Name        string `json:"name"`
	Year        int    `json:"year"`
	Month       int    `json:"month"`
	AmountCents Money  `json:"amount_cents"`
}

type CreateBudgetSourceRequest struct {
	Name        string `json:"name"`
	Year        int    `json:"year"`
	Month       int    `json:"month"`
	AmountCents Money  `json:"amount_cents"`
}

type UpdateSourceRequest struct {
	Name        string `json:"name"`
	AmountCents Money  `json:"amount_cents"`
}
