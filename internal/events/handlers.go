package events

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/mdco1990/webapp/internal/domain"
)

// NotificationService interface for sending notifications
type NotificationService interface {
	SendNotification(ctx context.Context, userID int64, message string) error
	SendEmail(ctx context.Context, userID int64, subject, body string) error
	SendPushNotification(ctx context.Context, userID int64, title, body string) error
}

// AuditRepository interface for audit logging
type AuditRepository interface {
	Create(ctx context.Context, audit *domain.AuditLog) error
	GetByUserID(ctx context.Context, userID int64) ([]*domain.AuditLog, error)
	GetByAction(ctx context.Context, action string) ([]*domain.AuditLog, error)
}

// NotificationHandler handles notification-related events
type NotificationHandler struct {
	notificationService NotificationService
}

// NewNotificationHandler creates a new notification handler
func NewNotificationHandler(notificationService NotificationService) *NotificationHandler {
	return &NotificationHandler{
		notificationService: notificationService,
	}
}

// HandleExpenseCreated handles expense creation events
func (h *NotificationHandler) HandleExpenseCreated(ctx context.Context, event Event) error {
	expenseEvent, ok := event.(*ExpenseCreatedEvent)
	if !ok {
		return fmt.Errorf("invalid event type for expense created handler")
	}

	message := fmt.Sprintf("New expense added: %s - $%.2f",
		expenseEvent.Expense.Description,
		float64(expenseEvent.Expense.AmountCents)/100)

	slog.Info("sending expense created notification",
		"user_id", expenseEvent.UserID,
		"expense_id", expenseEvent.Expense.ID,
		"message", message)

	return h.notificationService.SendNotification(ctx, expenseEvent.UserID, message)
}

// HandleBudgetExceeded handles budget exceeded events
func (h *NotificationHandler) HandleBudgetExceeded(ctx context.Context, event Event) error {
	budgetEvent, ok := event.(*BudgetExceededEvent)
	if !ok {
		return fmt.Errorf("invalid event type for budget exceeded handler")
	}

	message := fmt.Sprintf("Budget exceeded for %s: $%.2f over budget (Budget: $%.2f, Spent: $%.2f)",
		budgetEvent.Category,
		float64(budgetEvent.Excess)/100,
		float64(budgetEvent.Budget)/100,
		float64(budgetEvent.Spent)/100)

	slog.Warn("sending budget exceeded notification",
		"user_id", budgetEvent.UserID,
		"category", budgetEvent.Category,
		"excess", budgetEvent.Excess)

	return h.notificationService.SendNotification(ctx, budgetEvent.UserID, message)
}

// HandleUserLoggedIn handles user login events
func (h *NotificationHandler) HandleUserLoggedIn(ctx context.Context, event Event) error {
	loginEvent, ok := event.(*UserLoggedInEvent)
	if !ok {
		return fmt.Errorf("invalid event type for user login handler")
	}

	message := fmt.Sprintf("Login detected from %s", loginEvent.LoginIP)

	slog.Info("sending login notification",
		"user_id", loginEvent.User.ID,
		"login_ip", loginEvent.LoginIP)

	return h.notificationService.SendNotification(ctx, loginEvent.User.ID, message)
}

// AuditHandler handles audit-related events
type AuditHandler struct {
	auditRepo AuditRepository
}

// NewAuditHandler creates a new audit handler
func NewAuditHandler(auditRepo AuditRepository) *AuditHandler {
	return &AuditHandler{
		auditRepo: auditRepo,
	}
}

// HandleExpenseCreated handles expense creation audit events
func (h *AuditHandler) HandleExpenseCreated(ctx context.Context, event Event) error {
	expenseEvent, ok := event.(*ExpenseCreatedEvent)
	if !ok {
		return fmt.Errorf("invalid event type for expense created audit handler")
	}

	audit := &domain.AuditLog{
		UserID:     expenseEvent.UserID,
		Action:     "expense.created",
		Resource:   "expense",
		ResourceID: expenseEvent.Expense.ID,
		Timestamp:  event.Timestamp(),
		Details: map[string]interface{}{
			"description": expenseEvent.Expense.Description,
			"amount":      expenseEvent.Expense.AmountCents,
			"category":    expenseEvent.Expense.Category,
			"year_month":  expenseEvent.Expense.YearMonth,
		},
	}

	slog.Info("creating audit log for expense created",
		"user_id", expenseEvent.UserID,
		"expense_id", expenseEvent.Expense.ID)

	return h.auditRepo.Create(ctx, audit)
}

// HandleExpenseUpdated handles expense update audit events
func (h *AuditHandler) HandleExpenseUpdated(ctx context.Context, event Event) error {
	expenseEvent, ok := event.(*ExpenseUpdatedEvent)
	if !ok {
		return fmt.Errorf("invalid event type for expense updated audit handler")
	}

	audit := &domain.AuditLog{
		UserID:     expenseEvent.UserID,
		Action:     "expense.updated",
		Resource:   "expense",
		ResourceID: expenseEvent.Expense.ID,
		Timestamp:  event.Timestamp(),
		Details: map[string]interface{}{
			"old_description": expenseEvent.OldExpense.Description,
			"new_description": expenseEvent.Expense.Description,
			"old_amount":      expenseEvent.OldExpense.AmountCents,
			"new_amount":      expenseEvent.Expense.AmountCents,
			"old_category":    expenseEvent.OldExpense.Category,
			"new_category":    expenseEvent.Expense.Category,
		},
	}

	slog.Info("creating audit log for expense updated",
		"user_id", expenseEvent.UserID,
		"expense_id", expenseEvent.Expense.ID)

	return h.auditRepo.Create(ctx, audit)
}

// HandleExpenseDeleted handles expense deletion audit events
func (h *AuditHandler) HandleExpenseDeleted(ctx context.Context, event Event) error {
	expenseEvent, ok := event.(*ExpenseDeletedEvent)
	if !ok {
		return fmt.Errorf("invalid event type for expense deleted audit handler")
	}

	audit := &domain.AuditLog{
		UserID:     expenseEvent.UserID,
		Action:     "expense.deleted",
		Resource:   "expense",
		ResourceID: expenseEvent.ExpenseID,
		Timestamp:  event.Timestamp(),
		Details: map[string]interface{}{
			"description": expenseEvent.Expense.Description,
			"amount":      expenseEvent.Expense.AmountCents,
			"category":    expenseEvent.Expense.Category,
		},
	}

	slog.Info("creating audit log for expense deleted",
		"user_id", expenseEvent.UserID,
		"expense_id", expenseEvent.ExpenseID)

	return h.auditRepo.Create(ctx, audit)
}

// HandleUserLoggedIn handles user login audit events
func (h *AuditHandler) HandleUserLoggedIn(ctx context.Context, event Event) error {
	loginEvent, ok := event.(*UserLoggedInEvent)
	if !ok {
		return fmt.Errorf("invalid event type for user login audit handler")
	}

	audit := &domain.AuditLog{
		UserID:     loginEvent.User.ID,
		Action:     "user.logged_in",
		Resource:   "user",
		ResourceID: loginEvent.User.ID,
		Timestamp:  event.Timestamp(),
		Details: map[string]interface{}{
			"login_ip":   loginEvent.LoginIP,
			"user_agent": loginEvent.UserAgent,
			"username":   loginEvent.User.Username,
		},
	}

	slog.Info("creating audit log for user login",
		"user_id", loginEvent.User.ID,
		"login_ip", loginEvent.LoginIP)

	return h.auditRepo.Create(ctx, audit)
}

// AnalyticsHandler handles analytics-related events
type AnalyticsHandler struct {
	analyticsRepo AnalyticsRepository
}

// AnalyticsRepository interface for analytics data
type AnalyticsRepository interface {
	IncrementExpenseCount(ctx context.Context, userID int64, category string) error
	UpdateTotalSpent(ctx context.Context, userID int64, category string, amount int64) error
	RecordUserActivity(ctx context.Context, userID int64, activity string) error
	UpdateBudgetUtilization(ctx context.Context, userID int64, category string, utilization float64) error
}

// NewAnalyticsHandler creates a new analytics handler
func NewAnalyticsHandler(analyticsRepo AnalyticsRepository) *AnalyticsHandler {
	return &AnalyticsHandler{
		analyticsRepo: analyticsRepo,
	}
}

// HandleExpenseCreated handles expense creation analytics events
func (h *AnalyticsHandler) HandleExpenseCreated(ctx context.Context, event Event) error {
	expenseEvent, ok := event.(*ExpenseCreatedEvent)
	if !ok {
		return fmt.Errorf("invalid event type for expense created analytics handler")
	}

	// Update expense count
	if err := h.analyticsRepo.IncrementExpenseCount(ctx, expenseEvent.UserID, expenseEvent.Expense.Category); err != nil {
		slog.Error("failed to increment expense count", "error", err)
	}

	// Update total spent
	if err := h.analyticsRepo.UpdateTotalSpent(ctx, expenseEvent.UserID, expenseEvent.Expense.Category, int64(expenseEvent.Expense.AmountCents)); err != nil {
		slog.Error("failed to update total spent", "error", err)
	}

	// Record user activity
	if err := h.analyticsRepo.RecordUserActivity(ctx, expenseEvent.UserID, "expense_created"); err != nil {
		slog.Error("failed to record user activity", "error", err)
	}

	slog.Info("updated analytics for expense created",
		"user_id", expenseEvent.UserID,
		"category", expenseEvent.Expense.Category,
		"amount", expenseEvent.Expense.AmountCents)

	return nil
}

// HandleBudgetExceeded handles budget exceeded analytics events
func (h *AnalyticsHandler) HandleBudgetExceeded(ctx context.Context, event Event) error {
	budgetEvent, ok := event.(*BudgetExceededEvent)
	if !ok {
		return fmt.Errorf("invalid event type for budget exceeded analytics handler")
	}

	// Calculate utilization percentage
	utilization := float64(budgetEvent.Spent) / float64(budgetEvent.Budget) * 100

	// Update budget utilization
	if err := h.analyticsRepo.UpdateBudgetUtilization(ctx, budgetEvent.UserID, budgetEvent.Category, utilization); err != nil {
		slog.Error("failed to update budget utilization", "error", err)
	}

	// Record user activity
	if err := h.analyticsRepo.RecordUserActivity(ctx, budgetEvent.UserID, "budget_exceeded"); err != nil {
		slog.Error("failed to record user activity", "error", err)
	}

	slog.Info("updated analytics for budget exceeded",
		"user_id", budgetEvent.UserID,
		"category", budgetEvent.Category,
		"utilization", utilization)

	return nil
}

// SystemHealthHandler handles system health events
type SystemHealthHandler struct {
	healthRepo HealthRepository
}

// HealthRepository interface for health monitoring
type HealthRepository interface {
	RecordHealthCheck(ctx context.Context, status, message string, metrics map[string]interface{}) error
	GetHealthHistory(ctx context.Context, limit int) ([]*domain.HealthCheck, error)
	UpdateSystemStatus(ctx context.Context, status string) error
}

// NewSystemHealthHandler creates a new system health handler
func NewSystemHealthHandler(healthRepo HealthRepository) *SystemHealthHandler {
	return &SystemHealthHandler{
		healthRepo: healthRepo,
	}
}

// HandleSystemHealth handles system health events
func (h *SystemHealthHandler) HandleSystemHealth(ctx context.Context, event Event) error {
	healthEvent, ok := event.(*SystemHealthEvent)
	if !ok {
		return fmt.Errorf("invalid event type for system health handler")
	}

	// Record health check
	if err := h.healthRepo.RecordHealthCheck(ctx, healthEvent.Status, healthEvent.Message, healthEvent.Metrics); err != nil {
		slog.Error("failed to record health check", "error", err)
	}

	// Update system status
	if err := h.healthRepo.UpdateSystemStatus(ctx, healthEvent.Status); err != nil {
		slog.Error("failed to update system status", "error", err)
	}

	slog.Info("processed system health event",
		"status", healthEvent.Status,
		"message", healthEvent.Message)

	return nil
}

// CompositeHandler combines multiple handlers for convenience
type CompositeHandler struct {
	handlers []EventHandler
}

// NewCompositeHandler creates a new composite handler
func NewCompositeHandler(handlers ...EventHandler) *CompositeHandler {
	return &CompositeHandler{
		handlers: handlers,
	}
}

// Handle processes an event through all registered handlers
func (ch *CompositeHandler) Handle(ctx context.Context, event Event) error {
	var lastError error

	for _, handler := range ch.handlers {
		if err := handler(ctx, event); err != nil {
			slog.Error("handler failed in composite handler",
				"event_type", event.Type(),
				"error", err)
			lastError = err
		}
	}

	return lastError
}
