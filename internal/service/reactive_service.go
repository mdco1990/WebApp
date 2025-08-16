package service

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/mdco1990/webapp/internal/domain"
	"github.com/mdco1990/webapp/internal/reactive"
	"github.com/mdco1990/webapp/internal/transformation"
)

// ReactiveService provides reactive data operations and event-driven functionality.
type ReactiveService struct {
	repo     RepositoryInterface
	eventBus *reactive.EventBus

	// Reactive streams
	expenseStream     *reactive.BehaviorSubject[[]domain.Expense]
	incomeStream      *reactive.BehaviorSubject[[]domain.IncomeSource]
	budgetStream      *reactive.BehaviorSubject[[]domain.BudgetSource]
	monthlyDataStream *reactive.BehaviorSubject[*domain.MonthlyData]

	// Event subjects
	expenseEvents    *reactive.Subject[*reactive.Event]
	incomeEvents     *reactive.Subject[*reactive.Event]
	budgetEvents     *reactive.Subject[*reactive.Event]
	validationEvents *reactive.Subject[*reactive.Event]

	ctx    context.Context
	cancel context.CancelFunc
}

// NewReactiveService creates a new reactive service.
func NewReactiveService(repo RepositoryInterface, ctx context.Context) *ReactiveService {
	ctx, cancel := context.WithCancel(ctx)

	rs := &ReactiveService{
		repo:     repo,
		eventBus: reactive.NewEventBus(ctx),
		ctx:      ctx,
		cancel:   cancel,
	}

	// Initialize reactive streams
	rs.expenseStream = reactive.NewBehaviorSubject[[]domain.Expense](ctx, []domain.Expense{})
	rs.incomeStream = reactive.NewBehaviorSubject[[]domain.IncomeSource](ctx, []domain.IncomeSource{})
	rs.budgetStream = reactive.NewBehaviorSubject[[]domain.BudgetSource](ctx, []domain.BudgetSource{})
	rs.monthlyDataStream = reactive.NewBehaviorSubject[*domain.MonthlyData](ctx, nil)

	// Initialize event subjects
	rs.expenseEvents = reactive.NewSubject[*reactive.Event](ctx)
	rs.incomeEvents = reactive.NewSubject[*reactive.Event](ctx)
	rs.budgetEvents = reactive.NewSubject[*reactive.Event](ctx)
	rs.validationEvents = reactive.NewSubject[*reactive.Event](ctx)

	// Set up reactive pipelines
	rs.setupReactivePipelines()

	return rs
}

// setupReactivePipelines sets up reactive data flows and transformations.
func (rs *ReactiveService) setupReactivePipelines() {
	// Expense pipeline with transformations
	expensePipeline := reactive.Map(rs.expenseStream.Observable, func(expenses []domain.Expense) []domain.Expense {
		// Apply transformations
		if len(expenses) > 0 {
			// Sort by amount (descending)
			transformed, err := transformation.SortExpensesByAmount(expenses)
			if err == nil {
				if sorted, ok := transformed.([]domain.Expense); ok {
					return sorted
				}
			}
		}
		return expenses
	})

	// Subscribe to expense pipeline for real-time updates
	expensePipeline.Subscribe("expense_pipeline", func(expenses []domain.Expense) error {
		slog.Debug("Expense pipeline updated", "count", len(expenses))
		return nil
	})

	// Monthly data pipeline that combines all streams
	rs.setupMonthlyDataPipeline()

	// Event pipelines
	rs.setupEventPipelines()
}

// setupMonthlyDataPipeline sets up the monthly data reactive pipeline.
func (rs *ReactiveService) setupMonthlyDataPipeline() {
	// Combine expense, income, and budget streams
	expenseCountStream := reactive.Map(rs.expenseStream.Observable, func(expenses []domain.Expense) int {
		return len(expenses)
	})

	incomeCountStream := reactive.Map(rs.incomeStream.Observable, func(income []domain.IncomeSource) int {
		return len(income)
	})

	budgetCountStream := reactive.Map(rs.budgetStream.Observable, func(budget []domain.BudgetSource) int {
		return len(budget)
	})

	// Combine all counts for monitoring
	combinedStream := reactive.CombineLatest(rs.ctx, expenseCountStream, incomeCountStream,
		func(expCount, incCount int) struct{ Exp, Inc int } {
			return struct{ Exp, Inc int }{expCount, incCount}
		})

	finalStream := reactive.CombineLatest(rs.ctx, combinedStream, budgetCountStream,
		func(expInc struct{ Exp, Inc int }, budgetCount int) struct{ Exp, Inc, Budget int } {
			return struct{ Exp, Inc, Budget int }{expInc.Exp, expInc.Inc, budgetCount}
		})

	// Subscribe to combined stream for monitoring
	finalStream.Subscribe("monthly_monitoring", func(counts struct{ Exp, Inc, Budget int }) error {
		slog.Debug("Monthly data counts updated",
			"expenses", counts.Exp,
			"income", counts.Inc,
			"budget", counts.Budget)
		return nil
	})
}

// setupEventPipelines sets up event processing pipelines.
func (rs *ReactiveService) setupEventPipelines() {
	// Debounce expense events to avoid spam
	debouncedExpenseEvents := reactive.Debounce(rs.expenseEvents.Observable, 100*time.Millisecond)

	// Filter validation events
	filteredValidationEvents := reactive.Filter(rs.validationEvents.Observable, func(event *reactive.Event) bool {
		return event.Type == "validation_error" || event.Type == "validation_success"
	})

	// Subscribe to debounced expense events
	debouncedExpenseEvents.Subscribe("debounced_expense_events", func(event *reactive.Event) error {
		slog.Debug("Debounced expense event", "type", event.Type, "data", event.Data)
		return rs.eventBus.Publish(event)
	})

	// Subscribe to filtered validation events
	filteredValidationEvents.Subscribe("filtered_validation_events", func(event *reactive.Event) error {
		slog.Debug("Filtered validation event", "type", event.Type, "data", event.Data)
		return rs.eventBus.Publish(event)
	})
}

// GetExpenseStream returns the reactive expense stream.
func (rs *ReactiveService) GetExpenseStream() *reactive.BehaviorSubject[[]domain.Expense] {
	return rs.expenseStream
}

// GetIncomeStream returns the reactive income stream.
func (rs *ReactiveService) GetIncomeStream() *reactive.BehaviorSubject[[]domain.IncomeSource] {
	return rs.incomeStream
}

// GetBudgetStream returns the reactive budget stream.
func (rs *ReactiveService) GetBudgetStream() *reactive.BehaviorSubject[[]domain.BudgetSource] {
	return rs.budgetStream
}

// GetMonthlyDataStream returns the reactive monthly data stream.
func (rs *ReactiveService) GetMonthlyDataStream() *reactive.BehaviorSubject[*domain.MonthlyData] {
	return rs.monthlyDataStream
}

// GetEventBus returns the event bus.
func (rs *ReactiveService) GetEventBus() *reactive.EventBus {
	return rs.eventBus
}

// AddExpenseReactive adds an expense and updates reactive streams.
func (rs *ReactiveService) AddExpenseReactive(ctx context.Context, expense *domain.Expense) error {
	// Validate expense
	if err := rs.validateExpense(expense); err != nil {
		// Emit validation error event
		validationEvent := reactive.NewEvent("validation_error", map[string]interface{}{
			"entity": "expense",
			"error":  err.Error(),
			"data":   expense,
		})
		rs.validationEvents.Next(validationEvent)
		return err
	}

	// Add expense to repository
	_, err := rs.repo.AddExpense(ctx, expense)
	if err != nil {
		return err
	}

	// Update reactive stream
	currentExpenses := rs.expenseStream.GetValue()
	updatedExpenses := append(currentExpenses, *expense)
	rs.expenseStream.Next(updatedExpenses)

	// Emit expense added event
	expenseEvent := reactive.NewEvent("expense_added", map[string]interface{}{
		"expense":     expense,
		"total_count": len(updatedExpenses),
	})
	rs.expenseEvents.Next(expenseEvent)

	// Update monthly data stream
	rs.updateMonthlyDataStream(ctx, expense.YearMonth)

	return nil
}

// DeleteExpenseReactive deletes an expense and updates reactive streams.
func (rs *ReactiveService) DeleteExpenseReactive(ctx context.Context, id int64) error {
	// Delete from repository
	if err := rs.repo.DeleteExpense(ctx, id); err != nil {
		return err
	}

	// Update reactive stream
	currentExpenses := rs.expenseStream.GetValue()
	var updatedExpenses []domain.Expense
	for _, expense := range currentExpenses {
		if expense.ID != id {
			updatedExpenses = append(updatedExpenses, expense)
		}
	}
	rs.expenseStream.Next(updatedExpenses)

	// Emit expense deleted event
	expenseEvent := reactive.NewEvent("expense_deleted", map[string]interface{}{
		"expense_id":  id,
		"total_count": len(updatedExpenses),
	})
	rs.expenseEvents.Next(expenseEvent)

	return nil
}

// AddIncomeSourceReactive adds an income source and updates reactive streams.
func (rs *ReactiveService) AddIncomeSourceReactive(ctx context.Context, income *domain.IncomeSource) error {
	// Validate income source
	if err := rs.validateIncomeSource(income); err != nil {
		// Emit validation error event
		validationEvent := reactive.NewEvent("validation_error", map[string]interface{}{
			"entity": "income_source",
			"error":  err.Error(),
			"data":   income,
		})
		rs.validationEvents.Next(validationEvent)
		return err
	}

	// Add to repository
	req := domain.CreateIncomeSourceRequest{
		Name:        income.Name,
		Year:        income.YearMonth.Year,
		Month:       income.YearMonth.Month,
		AmountCents: income.AmountCents,
	}
	_, err := rs.repo.CreateIncomeSource(ctx, 1, req)
	if err != nil {
		return err
	}

	// Update reactive stream
	currentIncome := rs.incomeStream.GetValue()
	updatedIncome := append(currentIncome, *income)
	rs.incomeStream.Next(updatedIncome)

	// Emit income added event
	incomeEvent := reactive.NewEvent("income_added", map[string]interface{}{
		"income":      income,
		"total_count": len(updatedIncome),
	})
	rs.incomeEvents.Next(incomeEvent)

	// Update monthly data stream
	rs.updateMonthlyDataStream(ctx, income.YearMonth)

	return nil
}

// AddBudgetSourceReactive adds a budget source and updates reactive streams.
func (rs *ReactiveService) AddBudgetSourceReactive(ctx context.Context, budget *domain.BudgetSource) error {
	// Validate budget source
	if err := rs.validateBudgetSource(budget); err != nil {
		// Emit validation error event
		validationEvent := reactive.NewEvent("validation_error", map[string]interface{}{
			"entity": "budget_source",
			"error":  err.Error(),
			"data":   budget,
		})
		rs.validationEvents.Next(validationEvent)
		return err
	}

	// Add to repository
	req := domain.CreateBudgetSourceRequest{
		Name:        budget.Name,
		Year:        budget.YearMonth.Year,
		Month:       budget.YearMonth.Month,
		AmountCents: budget.AmountCents,
	}
	_, err := rs.repo.CreateBudgetSource(ctx, 1, req)
	if err != nil {
		return err
	}

	// Update reactive stream
	currentBudget := rs.budgetStream.GetValue()
	updatedBudget := append(currentBudget, *budget)
	rs.budgetStream.Next(updatedBudget)

	// Emit budget added event
	budgetEvent := reactive.NewEvent("budget_added", map[string]interface{}{
		"budget":      budget,
		"total_count": len(updatedBudget),
	})
	rs.budgetEvents.Next(budgetEvent)

	// Update monthly data stream
	rs.updateMonthlyDataStream(ctx, budget.YearMonth)

	return nil
}

// LoadMonthlyDataReactive loads monthly data and updates reactive streams.
func (rs *ReactiveService) LoadMonthlyDataReactive(ctx context.Context, ym domain.YearMonth) error {
	// Load data from repository
	monthlyData, err := rs.repo.GetMonthlyData(ctx, 1, ym) // Using userID 1 as default
	if err != nil {
		return err
	}

	// Update all reactive streams
	rs.expenseStream.Next(monthlyData.Expenses)
	rs.incomeStream.Next(monthlyData.IncomeSources)
	rs.budgetStream.Next(monthlyData.BudgetSources)
	rs.monthlyDataStream.Next(monthlyData)

	// Emit data loaded event
	dataEvent := reactive.NewEvent("monthly_data_loaded", map[string]interface{}{
		"year_month":    ym,
		"expense_count": len(monthlyData.Expenses),
		"income_count":  len(monthlyData.IncomeSources),
		"budget_count":  len(monthlyData.BudgetSources),
	})
	rs.eventBus.Publish(dataEvent)

	return nil
}

// updateMonthlyDataStream updates the monthly data stream when data changes.
func (rs *ReactiveService) updateMonthlyDataStream(ctx context.Context, ym domain.YearMonth) {
	// Reload monthly data to keep streams in sync
	if err := rs.LoadMonthlyDataReactive(ctx, ym); err != nil {
		slog.Error("Failed to update monthly data stream", "error", err, "year_month", ym)
	}
}

// validateExpense validates an expense using the validation package.
func (rs *ReactiveService) validateExpense(expense *domain.Expense) error {
	// This would use the validation package from Phase 2
	// For now, basic validation
	if expense.Description == "" {
		return fmt.Errorf("expense description is required")
	}
	if expense.AmountCents <= 0 {
		return fmt.Errorf("expense amount must be positive")
	}
	return nil
}

// validateIncomeSource validates an income source.
func (rs *ReactiveService) validateIncomeSource(income *domain.IncomeSource) error {
	if income.Name == "" {
		return fmt.Errorf("income source name is required")
	}
	if income.AmountCents <= 0 {
		return fmt.Errorf("income amount must be positive")
	}
	return nil
}

// validateBudgetSource validates a budget source.
func (rs *ReactiveService) validateBudgetSource(budget *domain.BudgetSource) error {
	if budget.Name == "" {
		return fmt.Errorf("budget source name is required")
	}
	if budget.AmountCents < 0 {
		return fmt.Errorf("budget amount cannot be negative")
	}
	return nil
}

// GetExpenseAnalyticsReactive returns reactive expense analytics.
func (rs *ReactiveService) GetExpenseAnalyticsReactive() *reactive.Observable[map[string]interface{}] {
	analyticsStream := reactive.Map(rs.expenseStream.Observable, func(expenses []domain.Expense) map[string]interface{} {
		if len(expenses) == 0 {
			return map[string]interface{}{
				"total_expenses":     0,
				"average_amount":     0,
				"category_breakdown": map[string]int{},
			}
		}

		// Calculate analytics
		var total domain.Money
		categoryBreakdown := make(map[string]int)

		for _, expense := range expenses {
			total += expense.AmountCents
			categoryBreakdown[expense.Category]++
		}

		average := total / domain.Money(len(expenses))

		return map[string]interface{}{
			"total_expenses":     total,
			"average_amount":     average,
			"category_breakdown": categoryBreakdown,
			"expense_count":      len(expenses),
		}
	})

	return analyticsStream
}

// GetFinancialSummaryReactive returns reactive financial summary.
func (rs *ReactiveService) GetFinancialSummaryReactive() *reactive.Observable[*domain.Summary] {
	summaryStream := reactive.Map(rs.monthlyDataStream.Observable, func(monthlyData *domain.MonthlyData) *domain.Summary {
		if monthlyData == nil {
			return &domain.Summary{}
		}

		// Calculate totals
		var totalIncome domain.Money
		var totalBudget domain.Money
		var totalExpenses domain.Money

		for _, income := range monthlyData.IncomeSources {
			totalIncome += income.AmountCents
		}

		for _, budget := range monthlyData.BudgetSources {
			totalBudget += budget.AmountCents
		}

		for _, expense := range monthlyData.Expenses {
			totalExpenses += expense.AmountCents
		}

		remaining := totalIncome + totalBudget - totalExpenses

		return &domain.Summary{
			YearMonth:    monthlyData.YearMonth,
			SalaryCents:  totalIncome,
			BudgetCents:  totalBudget,
			ExpenseCents: totalExpenses,
			Remaining:    remaining,
		}
	})

	return summaryStream
}

// SubscribeToExpenseEvents subscribes to expense-related events.
func (rs *ReactiveService) SubscribeToExpenseEvents(id string, observer reactive.Observer[*reactive.Event]) error {
	return rs.eventBus.Subscribe("expense_added", id, observer)
}

// SubscribeToValidationEvents subscribes to validation events.
func (rs *ReactiveService) SubscribeToValidationEvents(id string, observer reactive.Observer[*reactive.Event]) error {
	return rs.eventBus.Subscribe("validation_error", id, observer)
}

// SubscribeToMonthlyDataEvents subscribes to monthly data events.
func (rs *ReactiveService) SubscribeToMonthlyDataEvents(id string, observer reactive.Observer[*reactive.Event]) error {
	return rs.eventBus.Subscribe("monthly_data_loaded", id, observer)
}

// Close closes the reactive service and cleans up resources.
func (rs *ReactiveService) Close() {
	rs.cancel()
	rs.eventBus.Close()
	rs.expenseStream.Close()
	rs.incomeStream.Close()
	rs.budgetStream.Close()
	rs.monthlyDataStream.Close()
	rs.expenseEvents.Close()
	rs.incomeEvents.Close()
	rs.budgetEvents.Close()
	rs.validationEvents.Close()
}
