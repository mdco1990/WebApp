// Package domain contains core business entities and request/response models.
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
	Status    string     `json:"status,omitempty"` // pending, approved, rejected
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

// ManualBudgetItem represents a single manual budget line item.
type ManualBudgetItem struct {
	ID          int64  `json:"id"`
	BudgetID    int64  `json:"-"`
	Name        string `json:"name"`
	AmountCents Money  `json:"amount_cents"`
}

// LoginRequest represents user credentials for authentication.
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// OAuthRequest represents OAuth credentials for authentication.
type OAuthRequest struct {
	Token    string `json:"token"`
	Provider string `json:"provider"`
}

// LoginResponse is returned after a successful or failed login attempt.
type LoginResponse struct {
	Success   bool   `json:"success"`
	Message   string `json:"message"`
	SessionID string `json:"session_id,omitempty"`
	User      *User  `json:"user,omitempty"`
}

// CreateIncomeSourceRequest defines the payload to create an income source.
type CreateIncomeSourceRequest struct {
	Name        string `json:"name"`
	Year        int    `json:"year"`
	Month       int    `json:"month"`
	AmountCents Money  `json:"amount_cents"`
}

// CreateBudgetSourceRequest defines the payload to create a budget source.
type CreateBudgetSourceRequest struct {
	Name        string `json:"name"`
	Year        int    `json:"year"`
	Month       int    `json:"month"`
	AmountCents Money  `json:"amount_cents"`
}

// UpdateSourceRequest defines the payload to update a source's name or amount.
type UpdateSourceRequest struct {
	Name        string `json:"name"`
	AmountCents Money  `json:"amount_cents"`
}

// AuditLog represents an audit trail entry
type AuditLog struct {
	ID         int64                  `json:"id"`
	UserID     int64                  `json:"user_id"`
	Action     string                 `json:"action"`
	Resource   string                 `json:"resource"`
	ResourceID int64                  `json:"resource_id"`
	Timestamp  time.Time              `json:"timestamp"`
	Details    map[string]interface{} `json:"details,omitempty"`
	IPAddress  string                 `json:"ip_address,omitempty"`
	UserAgent  string                 `json:"user_agent,omitempty"`
}

// HealthCheck represents a system health check
type HealthCheck struct {
	ID        int64                  `json:"id"`
	Status    string                 `json:"status"` // healthy, warning, critical
	Message   string                 `json:"message"`
	Metrics   map[string]interface{} `json:"metrics,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
	Source    string                 `json:"source"`
}

// SystemStatus represents the overall system status
type SystemStatus struct {
	Status    string                 `json:"status"`
	Message   string                 `json:"message"`
	Metrics   map[string]interface{} `json:"metrics,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
	Uptime    time.Duration          `json:"uptime"`
}
