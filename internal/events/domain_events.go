package events

import (
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/mdco1990/webapp/internal/domain"
)

// BaseEvent provides common event functionality
type BaseEvent struct {
	id        string
	timestamp time.Time
	source    string
}

// NewBaseEvent creates a new base event
func NewBaseEvent(source string) BaseEvent {
	id := make([]byte, 8)
	rand.Read(id)

	return BaseEvent{
		id:        hex.EncodeToString(id),
		timestamp: time.Now(),
		source:    source,
	}
}

func (e BaseEvent) ID() string           { return e.id }
func (e BaseEvent) Timestamp() time.Time { return e.timestamp }
func (e BaseEvent) Source() string       { return e.source }

// ExpenseCreatedEvent represents an expense creation event
type ExpenseCreatedEvent struct {
	BaseEvent
	Expense *domain.Expense
	UserID  int64
}

func NewExpenseCreatedEvent(expense *domain.Expense, userID int64, source string) *ExpenseCreatedEvent {
	return &ExpenseCreatedEvent{
		BaseEvent: NewBaseEvent(source),
		Expense:   expense,
		UserID:    userID,
	}
}

func (e *ExpenseCreatedEvent) Type() string      { return "expense.created" }
func (e *ExpenseCreatedEvent) Data() interface{} { return e.Expense }

// ExpenseUpdatedEvent represents an expense update event
type ExpenseUpdatedEvent struct {
	BaseEvent
	Expense    *domain.Expense
	UserID     int64
	OldExpense *domain.Expense
}

func NewExpenseUpdatedEvent(expense, oldExpense *domain.Expense, userID int64, source string) *ExpenseUpdatedEvent {
	return &ExpenseUpdatedEvent{
		BaseEvent:  NewBaseEvent(source),
		Expense:    expense,
		UserID:     userID,
		OldExpense: oldExpense,
	}
}

func (e *ExpenseUpdatedEvent) Type() string      { return "expense.updated" }
func (e *ExpenseUpdatedEvent) Data() interface{} { return e.Expense }

// ExpenseDeletedEvent represents an expense deletion event
type ExpenseDeletedEvent struct {
	BaseEvent
	ExpenseID int64
	UserID    int64
	Expense   *domain.Expense // The expense that was deleted
}

func NewExpenseDeletedEvent(expense *domain.Expense, userID int64, source string) *ExpenseDeletedEvent {
	return &ExpenseDeletedEvent{
		BaseEvent: NewBaseEvent(source),
		ExpenseID: expense.ID,
		UserID:    userID,
		Expense:   expense,
	}
}

func (e *ExpenseDeletedEvent) Type() string      { return "expense.deleted" }
func (e *ExpenseDeletedEvent) Data() interface{} { return e.Expense }

// IncomeSourceCreatedEvent represents an income source creation event
type IncomeSourceCreatedEvent struct {
	BaseEvent
	IncomeSource *domain.IncomeSource
	UserID       int64
}

func NewIncomeSourceCreatedEvent(incomeSource *domain.IncomeSource, userID int64, source string) *IncomeSourceCreatedEvent {
	return &IncomeSourceCreatedEvent{
		BaseEvent:    NewBaseEvent(source),
		IncomeSource: incomeSource,
		UserID:       userID,
	}
}

func (e *IncomeSourceCreatedEvent) Type() string      { return "income_source.created" }
func (e *IncomeSourceCreatedEvent) Data() interface{} { return e.IncomeSource }

// IncomeSourceUpdatedEvent represents an income source update event
type IncomeSourceUpdatedEvent struct {
	BaseEvent
	IncomeSource    *domain.IncomeSource
	UserID          int64
	OldIncomeSource *domain.IncomeSource
}

func NewIncomeSourceUpdatedEvent(incomeSource, oldIncomeSource *domain.IncomeSource, userID int64, source string) *IncomeSourceUpdatedEvent {
	return &IncomeSourceUpdatedEvent{
		BaseEvent:       NewBaseEvent(source),
		IncomeSource:    incomeSource,
		UserID:          userID,
		OldIncomeSource: oldIncomeSource,
	}
}

func (e *IncomeSourceUpdatedEvent) Type() string      { return "income_source.updated" }
func (e *IncomeSourceUpdatedEvent) Data() interface{} { return e.IncomeSource }

// BudgetSourceCreatedEvent represents a budget source creation event
type BudgetSourceCreatedEvent struct {
	BaseEvent
	BudgetSource *domain.BudgetSource
	UserID       int64
}

func NewBudgetSourceCreatedEvent(budgetSource *domain.BudgetSource, userID int64, source string) *BudgetSourceCreatedEvent {
	return &BudgetSourceCreatedEvent{
		BaseEvent:    NewBaseEvent(source),
		BudgetSource: budgetSource,
		UserID:       userID,
	}
}

func (e *BudgetSourceCreatedEvent) Type() string      { return "budget_source.created" }
func (e *BudgetSourceCreatedEvent) Data() interface{} { return e.BudgetSource }

// BudgetSourceUpdatedEvent represents a budget source update event
type BudgetSourceUpdatedEvent struct {
	BaseEvent
	BudgetSource    *domain.BudgetSource
	UserID          int64
	OldBudgetSource *domain.BudgetSource
}

func NewBudgetSourceUpdatedEvent(budgetSource, oldBudgetSource *domain.BudgetSource, userID int64, source string) *BudgetSourceUpdatedEvent {
	return &BudgetSourceUpdatedEvent{
		BaseEvent:       NewBaseEvent(source),
		BudgetSource:    budgetSource,
		UserID:          userID,
		OldBudgetSource: oldBudgetSource,
	}
}

func (e *BudgetSourceUpdatedEvent) Type() string      { return "budget_source.updated" }
func (e *BudgetSourceUpdatedEvent) Data() interface{} { return e.BudgetSource }

// UserLoggedInEvent represents a user login event
type UserLoggedInEvent struct {
	BaseEvent
	User      *domain.User
	LoginIP   string
	UserAgent string
}

func NewUserLoggedInEvent(user *domain.User, loginIP, userAgent, source string) *UserLoggedInEvent {
	return &UserLoggedInEvent{
		BaseEvent: NewBaseEvent(source),
		User:      user,
		LoginIP:   loginIP,
		UserAgent: userAgent,
	}
}

func (e *UserLoggedInEvent) Type() string      { return "user.logged_in" }
func (e *UserLoggedInEvent) Data() interface{} { return e.User }

// UserLoggedOutEvent represents a user logout event
type UserLoggedOutEvent struct {
	BaseEvent
	User      *domain.User
	SessionID string
}

func NewUserLoggedOutEvent(user *domain.User, sessionID, source string) *UserLoggedOutEvent {
	return &UserLoggedOutEvent{
		BaseEvent: NewBaseEvent(source),
		User:      user,
		SessionID: sessionID,
	}
}

func (e *UserLoggedOutEvent) Type() string      { return "user.logged_out" }
func (e *UserLoggedOutEvent) Data() interface{} { return e.User }

// MonthlyDataUpdatedEvent represents a monthly data update event
type MonthlyDataUpdatedEvent struct {
	BaseEvent
	YearMonth   domain.YearMonth
	UserID      int64
	MonthlyData *domain.MonthlyData
}

func NewMonthlyDataUpdatedEvent(yearMonth domain.YearMonth, userID int64, data *domain.MonthlyData, source string) *MonthlyDataUpdatedEvent {
	return &MonthlyDataUpdatedEvent{
		BaseEvent:   NewBaseEvent(source),
		YearMonth:   yearMonth,
		UserID:      userID,
		MonthlyData: data,
	}
}

func (e *MonthlyDataUpdatedEvent) Type() string      { return "monthly_data.updated" }
func (e *MonthlyDataUpdatedEvent) Data() interface{} { return e.MonthlyData }

// BudgetExceededEvent represents a budget exceeded event
type BudgetExceededEvent struct {
	BaseEvent
	YearMonth domain.YearMonth
	UserID    int64
	Category  string
	Budget    int64
	Spent     int64
	Excess    int64
}

func NewBudgetExceededEvent(yearMonth domain.YearMonth, userID int64, category string, budget, spent int64, source string) *BudgetExceededEvent {
	return &BudgetExceededEvent{
		BaseEvent: NewBaseEvent(source),
		YearMonth: yearMonth,
		UserID:    userID,
		Category:  category,
		Budget:    budget,
		Spent:     spent,
		Excess:    spent - budget,
	}
}

func (e *BudgetExceededEvent) Type() string { return "budget.exceeded" }
func (e *BudgetExceededEvent) Data() interface{} {
	return map[string]interface{}{
		"year_month": e.YearMonth,
		"user_id":    e.UserID,
		"category":   e.Category,
		"budget":     e.Budget,
		"spent":      e.Spent,
		"excess":     e.Excess,
	}
}

// SystemHealthEvent represents a system health event
type SystemHealthEvent struct {
	BaseEvent
	Status  string
	Message string
	Metrics map[string]interface{}
}

func NewSystemHealthEvent(status, message string, metrics map[string]interface{}, source string) *SystemHealthEvent {
	return &SystemHealthEvent{
		BaseEvent: NewBaseEvent(source),
		Status:    status,
		Message:   message,
		Metrics:   metrics,
	}
}

func (e *SystemHealthEvent) Type() string { return "system.health" }
func (e *SystemHealthEvent) Data() interface{} {
	return map[string]interface{}{
		"status":  e.Status,
		"message": e.Message,
		"metrics": e.Metrics,
	}
}
