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
	ID          int64     `json:"id"`
	YearMonth             
	AmountCents Money     `json:"amount_cents"`
	CreatedAt   time.Time `json:"created_at"`
}

// Budget record for a month.
type Budget struct {
	ID          int64     `json:"id"`
	YearMonth             
	AmountCents Money     `json:"amount_cents"`
	CreatedAt   time.Time `json:"created_at"`
}

// Expense entry.
type Expense struct {
	ID          int64     `json:"id"`
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
