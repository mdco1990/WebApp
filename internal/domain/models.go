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

// ============================================================================
// NEW DOMAIN TYPES FOR PHASE 5 IMPLEMENTATION
// ============================================================================

// YearlySummary provides annual financial overview
type YearlySummary struct {
	Year            int     `json:"year"`
	TotalIncome     Money   `json:"total_income_cents"`
	TotalBudget     Money   `json:"total_budget_cents"`
	TotalExpenses   Money   `json:"total_expenses_cents"`
	NetSavings      Money   `json:"net_savings_cents"`
	MonthlyAverages []Money `json:"monthly_averages_cents"`
	TopCategories   []struct {
		Category string `json:"category"`
		Amount   Money  `json:"amount_cents"`
	} `json:"top_categories"`
}

// ExpenseReport represents a detailed expense analysis report
type ExpenseReport struct {
	ID          string    `json:"id"`
	UserID      int64     `json:"user_id"`
	Type        string    `json:"type"` // monthly, yearly, custom
	Period      YearMonth `json:"period"`
	GeneratedAt time.Time `json:"generated_at"`
	Data        struct {
		TotalExpenses     Money `json:"total_expenses_cents"`
		CategoryBreakdown []struct {
			Category string `json:"category"`
			Amount   Money  `json:"amount_cents"`
			Count    int    `json:"count"`
		} `json:"category_breakdown"`
		DailyTrends []struct {
			Date   time.Time `json:"date"`
			Amount Money     `json:"amount_cents"`
		} `json:"daily_trends"`
	} `json:"data"`
	Status  string `json:"status"` // processing, completed, failed
	FileURL string `json:"file_url,omitempty"`
}

// Notification represents a user notification
type Notification struct {
	ID        string                 `json:"id"`
	UserID    int64                  `json:"user_id"`
	Type      string                 `json:"type"`
	Title     string                 `json:"title"`
	Message   string                 `json:"message"`
	Priority  string                 `json:"priority"` // low, medium, high, urgent
	Data      map[string]interface{} `json:"data,omitempty"`
	Read      bool                   `json:"read"`
	CreatedAt time.Time              `json:"created_at"`
	ExpiresAt *time.Time             `json:"expires_at,omitempty"`
}

// NotificationPreferences defines user notification settings
type NotificationPreferences struct {
	ID               int64  `json:"id"`
	UserID           int64  `json:"user_id"`
	EmailEnabled     bool   `json:"email_enabled"`
	PushEnabled      bool   `json:"push_enabled"`
	SMSEnabled       bool   `json:"sms_enabled"`
	BudgetAlerts     bool   `json:"budget_alerts"`
	ExpenseReminders bool   `json:"expense_reminders"`
	SecurityAlerts   bool   `json:"security_alerts"`
	WeeklyReports    bool   `json:"weekly_reports"`
	MonthlyReports   bool   `json:"monthly_reports"`
	QuietHoursStart  int    `json:"quiet_hours_start"` // 24-hour format
	QuietHoursEnd    int    `json:"quiet_hours_end"`   // 24-hour format
	TimeZone         string `json:"timezone"`
}

// SystemNotification represents system-wide notifications
type SystemNotification struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"` // maintenance, update, alert
	Title       string                 `json:"title"`
	Message     string                 `json:"message"`
	Priority    string                 `json:"priority"`
	Data        map[string]interface{} `json:"data,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
	ExpiresAt   *time.Time             `json:"expires_at,omitempty"`
	TargetUsers []int64                `json:"target_users,omitempty"` // empty for all users
}

// AuditAction represents an audit log entry
type AuditAction struct {
	ID        string                 `json:"id"`
	UserID    int64                  `json:"user_id"`
	Action    string                 `json:"action"`
	Resource  string                 `json:"resource"`
	Details   string                 `json:"details"`
	IPAddress string                 `json:"ip_address,omitempty"`
	UserAgent string                 `json:"user_agent,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
	Source    string                 `json:"source"`
	EventID   string                 `json:"event_id,omitempty"`
	Status    string                 `json:"status"` // success, failure, pending
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// TimeRange represents a time period for queries
type TimeRange struct {
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
}

// AuditStats provides audit statistics
type AuditStats struct {
	TotalActions        int64                  `json:"total_actions"`
	ActionsByType       map[string]int64       `json:"actions_by_type"`
	ActionsByUser       map[int64]int64        `json:"actions_by_user"`
	ActionsByResource   map[string]int64       `json:"actions_by_resource"`
	SuccessRate         float64                `json:"success_rate"`
	AverageResponseTime time.Duration          `json:"average_response_time"`
	LastActivity        time.Time              `json:"last_activity"`
	Metadata            map[string]interface{} `json:"metadata,omitempty"`
}
