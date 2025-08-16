package service

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/mdco1990/webapp/internal/domain"
	"github.com/mdco1990/webapp/internal/events"
)

// EventService wraps the core service and adds event publishing capabilities
type EventService struct {
	coreService *Service
	eventBus    events.EventBusInterface
}

// NewEventService creates a new event-driven service
func NewEventService(coreService *Service, eventBus events.EventBusInterface) *EventService {
	return &EventService{
		coreService: coreService,
		eventBus:    eventBus,
	}
}

// AddExpense adds an expense and publishes events
func (es *EventService) AddExpense(ctx context.Context, expense *domain.Expense, userID int64) (int64, error) {
	// Add expense using core service
	expenseID, err := es.coreService.AddExpense(ctx, expense)
	if err != nil {
		return 0, fmt.Errorf("failed to add expense: %w", err)
	}

	// Set the ID from the result
	expense.ID = expenseID

	// Publish expense created event
	expenseEvent := events.NewExpenseCreatedEvent(expense, userID, "event_service")
	es.eventBus.PublishAsync(ctx, expenseEvent)

	slog.Info("expense added and event published",
		"expense_id", expenseID,
		"user_id", userID,
		"event_id", expenseEvent.ID())

	// Check if budget is exceeded
	es.checkBudgetExceeded(ctx, expense, userID)

	return expenseID, nil
}

// UpdateExpense updates an expense and publishes events
func (es *EventService) UpdateExpense(ctx context.Context, expenseID int64, expense *domain.Expense, userID int64) error {
	// Get the old expense for comparison
	oldExpenses, err := es.coreService.ListExpenses(ctx, expense.YearMonth)
	if err != nil {
		return fmt.Errorf("failed to get old expenses: %w", err)
	}

	// Find the old expense
	var oldExpense *domain.Expense
	for _, exp := range oldExpenses {
		if exp.ID == expenseID {
			oldExpense = &exp
			break
		}
	}

	if oldExpense == nil {
		return fmt.Errorf("expense not found")
	}

	// For now, we'll just delete and recreate since UpdateExpense doesn't exist
	// In a real implementation, you'd want to add UpdateExpense to the service
	err = es.coreService.DeleteExpense(ctx, expenseID)
	if err != nil {
		return fmt.Errorf("failed to delete old expense: %w", err)
	}

	_, err = es.coreService.AddExpense(ctx, expense)
	if err != nil {
		return fmt.Errorf("failed to add updated expense: %w", err)
	}

	// Set the ID for the event
	expense.ID = expenseID

	// Publish expense updated event
	expenseEvent := events.NewExpenseUpdatedEvent(expense, oldExpense, userID, "event_service")
	es.eventBus.PublishAsync(ctx, expenseEvent)

	slog.Info("expense updated and event published",
		"expense_id", expenseID,
		"user_id", userID,
		"event_id", expenseEvent.ID())

	// Check if budget is exceeded after update
	es.checkBudgetExceeded(ctx, expense, userID)

	return nil
}

// DeleteExpense deletes an expense and publishes events
func (es *EventService) DeleteExpense(ctx context.Context, expenseID int64, userID int64) error {
	// For now, we'll create a placeholder expense since GetExpense doesn't exist
	// In a real implementation, you'd want to add GetExpense to the service
	expense := &domain.Expense{
		ID:          expenseID,
		YearMonth:   domain.YearMonth{Year: 2024, Month: 1}, // Default values
		Description: "Deleted expense",
		AmountCents: 0,
		Category:    "Unknown",
	}

	// Delete expense using core service
	err := es.coreService.DeleteExpense(ctx, expenseID)
	if err != nil {
		return fmt.Errorf("failed to delete expense: %w", err)
	}

	// Publish expense deleted event
	expenseEvent := events.NewExpenseDeletedEvent(expense, userID, "event_service")
	es.eventBus.PublishAsync(ctx, expenseEvent)

	slog.Info("expense deleted and event published",
		"expense_id", expenseID,
		"user_id", userID,
		"event_id", expenseEvent.ID())

	return nil
}

// CreateIncomeSource creates an income source and publishes events
func (es *EventService) CreateIncomeSource(ctx context.Context, userID int64, name string, ym domain.YearMonth, amountCents domain.Money) (int64, error) {
	// Create income source using repository directly since service doesn't have this method
	req := domain.CreateIncomeSourceRequest{
		Name:        name,
		Year:        ym.Year,
		Month:       ym.Month,
		AmountCents: amountCents,
	}

	incomeSource, err := es.coreService.repo.CreateIncomeSource(ctx, userID, req)
	if err != nil {
		return 0, fmt.Errorf("failed to create income source: %w", err)
	}

	// Publish income source created event
	incomeEvent := events.NewIncomeSourceCreatedEvent(incomeSource, userID, "event_service")
	es.eventBus.PublishAsync(ctx, incomeEvent)

	slog.Info("income source created and event published",
		"income_source_id", incomeSource.ID,
		"user_id", userID,
		"event_id", incomeEvent.ID())

	return incomeSource.ID, nil
}

// CreateBudgetSource creates a budget source and publishes events
func (es *EventService) CreateBudgetSource(ctx context.Context, userID int64, name string, ym domain.YearMonth, amountCents domain.Money) (int64, error) {
	// Create budget source using repository directly since service doesn't have this method
	req := domain.CreateBudgetSourceRequest{
		Name:        name,
		Year:        ym.Year,
		Month:       ym.Month,
		AmountCents: amountCents,
	}

	budgetSource, err := es.coreService.repo.CreateBudgetSource(ctx, userID, req)
	if err != nil {
		return 0, fmt.Errorf("failed to create budget source: %w", err)
	}

	// Publish budget source created event
	budgetEvent := events.NewBudgetSourceCreatedEvent(budgetSource, userID, "event_service")
	es.eventBus.PublishAsync(ctx, budgetEvent)

	slog.Info("budget source created and event published",
		"budget_source_id", budgetSource.ID,
		"user_id", userID,
		"event_id", budgetEvent.ID())

	return budgetSource.ID, nil
}

// GetMonthlyData gets monthly data and publishes update event
func (es *EventService) GetMonthlyData(ctx context.Context, ym domain.YearMonth, userID int64) (*domain.MonthlyData, error) {
	// Get monthly data using repository directly since service doesn't have this method
	data, err := es.coreService.repo.GetMonthlyData(ctx, userID, ym)
	if err != nil {
		return nil, fmt.Errorf("failed to get monthly data: %w", err)
	}

	// Publish monthly data updated event
	dataEvent := events.NewMonthlyDataUpdatedEvent(ym, userID, data, "event_service")
	es.eventBus.PublishAsync(ctx, dataEvent)

	slog.Debug("monthly data retrieved and event published",
		"year_month", ym,
		"user_id", userID,
		"event_id", dataEvent.ID())

	return data, nil
}

// checkBudgetExceeded checks if budget is exceeded and publishes event if needed
func (es *EventService) checkBudgetExceeded(ctx context.Context, expense *domain.Expense, userID int64) {
	// Get monthly data to check budget
	data, err := es.coreService.repo.GetMonthlyData(ctx, userID, expense.YearMonth)
	if err != nil {
		slog.Error("failed to get monthly data for budget check", "error", err)
		return
	}

	// Find budget for the expense category
	var budgetAmount int64
	for _, budget := range data.BudgetSources {
		if budget.Name == expense.Category {
			budgetAmount = int64(budget.AmountCents)
			break
		}
	}

	if budgetAmount == 0 {
		return // No budget set for this category
	}

	// Calculate total spent for this category
	var totalSpent int64
	for _, exp := range data.Expenses {
		if exp.Category == expense.Category {
			totalSpent += int64(exp.AmountCents)
		}
	}

	// Check if budget is exceeded
	if totalSpent > budgetAmount {
		// Publish budget exceeded event
		budgetEvent := events.NewBudgetExceededEvent(
			expense.YearMonth,
			userID,
			expense.Category,
			budgetAmount,
			totalSpent,
			"event_service",
		)
		es.eventBus.PublishAsync(ctx, budgetEvent)

		slog.Warn("budget exceeded event published",
			"category", expense.Category,
			"budget", budgetAmount,
			"spent", totalSpent,
			"excess", totalSpent-budgetAmount,
			"event_id", budgetEvent.ID())
	}
}

// PublishSystemHealth publishes system health events
func (es *EventService) PublishSystemHealth(ctx context.Context, status, message string, metrics map[string]interface{}) {
	healthEvent := events.NewSystemHealthEvent(status, message, metrics, "event_service")
	es.eventBus.PublishAsync(ctx, healthEvent)

	slog.Info("system health event published",
		"status", status,
		"message", message,
		"event_id", healthEvent.ID())
}

// GetEventMetrics returns event bus metrics
func (es *EventService) GetEventMetrics() *events.EventMetrics {
	return es.eventBus.GetMetrics()
}

// GetEventTypes returns all registered event types
func (es *EventService) GetEventTypes() []string {
	return es.eventBus.GetEventTypes()
}

// GetSubscriberCount returns the total number of subscribers
func (es *EventService) GetSubscriberCount() int {
	return es.eventBus.GetSubscriberCount()
}
