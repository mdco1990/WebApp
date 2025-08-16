package service

import (
	"context"
	"testing"
	"time"

	"github.com/mdco1990/webapp/internal/domain"
	"github.com/mdco1990/webapp/internal/events"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// MockEventBus for testing
type MockEventBus struct {
	publishedEvents []events.Event
	subscribers     map[string][]events.EventHandler
}

func NewMockEventBus() *MockEventBus {
	return &MockEventBus{
		publishedEvents: make([]events.Event, 0),
		subscribers:     make(map[string][]events.EventHandler),
	}
}

func (m *MockEventBus) Subscribe(eventType string, handler events.EventHandler) {
	m.subscribers[eventType] = append(m.subscribers[eventType], handler)
}

func (m *MockEventBus) Unsubscribe(eventType string, handler events.EventHandler) {
	// Simplified implementation for testing
}

func (m *MockEventBus) Publish(ctx context.Context, event events.Event) {
	m.publishedEvents = append(m.publishedEvents, event)
}

func (m *MockEventBus) PublishAsync(ctx context.Context, event events.Event) {
	m.publishedEvents = append(m.publishedEvents, event)
}

func (m *MockEventBus) GetMetrics() *events.EventMetrics {
	return &events.EventMetrics{}
}

func (m *MockEventBus) GetSubscriberCount() int {
	total := 0
	for _, handlers := range m.subscribers {
		total += len(handlers)
	}
	return total
}

func (m *MockEventBus) GetEventTypes() []string {
	types := make([]string, 0, len(m.subscribers))
	for eventType := range m.subscribers {
		types = append(types, eventType)
	}
	return types
}

func (m *MockEventBus) Clear() {
	m.publishedEvents = make([]events.Event, 0)
	m.subscribers = make(map[string][]events.EventHandler)
}

func (m *MockEventBus) GetPublishedEvents() []events.Event {
	return m.publishedEvents
}

func TestEventService(t *testing.T) {
	ctx := context.Background()

	t.Run("AddExpense", func(t *testing.T) {
		mockRepo := &MockRepository{}
		mockEventBus := NewMockEventBus()
		// Create a service that uses the mock repository
		coreService := &Service{repo: mockRepo}
		eventService := NewEventService(coreService, mockEventBus)

		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "Test expense",
			AmountCents: 1000,
			Category:    "Food",
		}

		// Mock repository response
		mockRepo.On("AddExpense", ctx, expense).Return(int64(1), nil)
		mockRepo.On("GetMonthlyData", ctx, int64(1), expense.YearMonth).Return(&domain.MonthlyData{
			YearMonth: expense.YearMonth,
			Expenses:  []domain.Expense{*expense},
			BudgetSources: []domain.BudgetSource{
				{Name: "Food", AmountCents: 500}, // Budget exceeded
			},
		}, nil)

		// Test adding expense
		expenseID, err := eventService.AddExpense(ctx, expense, 1)
		require.NoError(t, err)
		assert.Equal(t, int64(1), expenseID)

		// Wait for async event processing
		time.Sleep(100 * time.Millisecond)

		// Check that events were published
		publishedEvents := mockEventBus.GetPublishedEvents()
		assert.Len(t, publishedEvents, 2) // expense.created + budget.exceeded

		// Check expense created event
		expenseEvent := publishedEvents[0]
		assert.Equal(t, "expense.created", expenseEvent.Type())
		assert.Equal(t, expense, expenseEvent.Data())

		// Check budget exceeded event
		budgetEvent := publishedEvents[1]
		assert.Equal(t, "budget.exceeded", budgetEvent.Type())
	})

	t.Run("UpdateExpense", func(t *testing.T) {
		mockRepo := &MockRepository{}
		mockEventBus := NewMockEventBus()
		coreService := &Service{repo: mockRepo}
		eventService := NewEventService(coreService, mockEventBus)

		oldExpense := &domain.Expense{
			ID:          1,
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "Old expense",
			AmountCents: 500,
			Category:    "Food",
		}

		newExpense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "Updated expense",
			AmountCents: 1000,
			Category:    "Food",
		}

		// Mock repository responses
		mockRepo.On("ListExpenses", ctx, newExpense.YearMonth).Return([]domain.Expense{*oldExpense}, nil)
		mockRepo.On("DeleteExpense", ctx, int64(1)).Return(nil)
		mockRepo.On("AddExpense", ctx, newExpense).Return(int64(1), nil)
		mockRepo.On("GetMonthlyData", ctx, int64(1), newExpense.YearMonth).Return(&domain.MonthlyData{
			YearMonth: newExpense.YearMonth,
			Expenses:  []domain.Expense{*newExpense},
			BudgetSources: []domain.BudgetSource{
				{Name: "Food", AmountCents: 500}, // Budget exceeded
			},
		}, nil)

		// Test updating expense
		err := eventService.UpdateExpense(ctx, 1, newExpense, 1)
		require.NoError(t, err)

		// Wait for async event processing
		time.Sleep(100 * time.Millisecond)

		// Check that events were published
		publishedEvents := mockEventBus.GetPublishedEvents()
		assert.Len(t, publishedEvents, 2) // expense.updated + budget.exceeded

		// Check expense updated event
		expenseEvent := publishedEvents[0]
		assert.Equal(t, "expense.updated", expenseEvent.Type())
		assert.Equal(t, newExpense, expenseEvent.Data())
	})

	t.Run("DeleteExpense", func(t *testing.T) {
		mockRepo := &MockRepository{}
		mockEventBus := NewMockEventBus()
		coreService := &Service{repo: mockRepo}
		eventService := NewEventService(coreService, mockEventBus)

		// Mock repository responses
		mockRepo.On("DeleteExpense", ctx, int64(1)).Return(nil)

		// Test deleting expense
		err := eventService.DeleteExpense(ctx, 1, 1)
		require.NoError(t, err)

		// Wait for async event processing
		time.Sleep(100 * time.Millisecond)

		// Check that event was published
		publishedEvents := mockEventBus.GetPublishedEvents()
		assert.Len(t, publishedEvents, 1)

		// Check expense deleted event
		expenseEvent := publishedEvents[0]
		assert.Equal(t, "expense.deleted", expenseEvent.Type())

		// Since we don't have GetExpense, we create a placeholder expense
		deletedExpense := expenseEvent.Data().(*domain.Expense)
		assert.Equal(t, int64(1), deletedExpense.ID)
		assert.Equal(t, "Deleted expense", deletedExpense.Description)
		assert.Equal(t, "Unknown", deletedExpense.Category)
		assert.Equal(t, domain.Money(0), deletedExpense.AmountCents)
	})

	t.Run("CreateIncomeSource", func(t *testing.T) {
		mockRepo := &MockRepository{}
		mockEventBus := NewMockEventBus()
		coreService := &Service{repo: mockRepo}
		eventService := NewEventService(coreService, mockEventBus)

		ym := domain.YearMonth{Year: 2024, Month: 1}
		amountCents := domain.Money(5000)

		// Mock repository response
		req := domain.CreateIncomeSourceRequest{
			Name:        "Salary",
			Year:        ym.Year,
			Month:       ym.Month,
			AmountCents: amountCents,
		}
		incomeSource := &domain.IncomeSource{
			ID:          1,
			UserID:      1,
			Name:        "Salary",
			YearMonth:   ym,
			AmountCents: amountCents,
		}
		mockRepo.On("CreateIncomeSource", ctx, int64(1), req).Return(incomeSource, nil)

		// Test creating income source
		incomeSourceID, err := eventService.CreateIncomeSource(ctx, 1, "Salary", ym, amountCents)
		require.NoError(t, err)
		assert.Equal(t, int64(1), incomeSourceID)

		// Wait for async event processing
		time.Sleep(100 * time.Millisecond)

		// Check that event was published
		publishedEvents := mockEventBus.GetPublishedEvents()
		assert.Len(t, publishedEvents, 1)

		// Check income source created event
		incomeEvent := publishedEvents[0]
		assert.Equal(t, "income_source.created", incomeEvent.Type())

		incomeData := incomeEvent.Data().(*domain.IncomeSource)
		assert.Equal(t, "Salary", incomeData.Name)
		assert.Equal(t, amountCents, incomeData.AmountCents)
	})

	t.Run("CreateBudgetSource", func(t *testing.T) {
		mockRepo := &MockRepository{}
		mockEventBus := NewMockEventBus()
		coreService := &Service{repo: mockRepo}
		eventService := NewEventService(coreService, mockEventBus)

		ym := domain.YearMonth{Year: 2024, Month: 1}
		amountCents := domain.Money(1000)

		// Mock repository response
		req := domain.CreateBudgetSourceRequest{
			Name:        "Food Budget",
			Year:        ym.Year,
			Month:       ym.Month,
			AmountCents: amountCents,
		}
		budgetSource := &domain.BudgetSource{
			ID:          1,
			UserID:      1,
			Name:        "Food Budget",
			YearMonth:   ym,
			AmountCents: amountCents,
		}
		mockRepo.On("CreateBudgetSource", ctx, int64(1), req).Return(budgetSource, nil)

		// Test creating budget source
		budgetSourceID, err := eventService.CreateBudgetSource(ctx, 1, "Food Budget", ym, amountCents)
		require.NoError(t, err)
		assert.Equal(t, int64(1), budgetSourceID)

		// Wait for async event processing
		time.Sleep(100 * time.Millisecond)

		// Check that event was published
		publishedEvents := mockEventBus.GetPublishedEvents()
		assert.Len(t, publishedEvents, 1)

		// Check budget source created event
		budgetEvent := publishedEvents[0]
		assert.Equal(t, "budget_source.created", budgetEvent.Type())

		budgetData := budgetEvent.Data().(*domain.BudgetSource)
		assert.Equal(t, "Food Budget", budgetData.Name)
		assert.Equal(t, amountCents, budgetData.AmountCents)
	})

	t.Run("GetMonthlyData", func(t *testing.T) {
		mockRepo := &MockRepository{}
		mockEventBus := NewMockEventBus()
		coreService := &Service{repo: mockRepo}
		eventService := NewEventService(coreService, mockEventBus)

		ym := domain.YearMonth{Year: 2024, Month: 1}
		monthlyData := &domain.MonthlyData{
			YearMonth: ym,
			MonthName: "January",
		}

		// Mock repository response
		mockRepo.On("GetMonthlyData", ctx, int64(1), ym).Return(monthlyData, nil)

		// Test getting monthly data
		data, err := eventService.GetMonthlyData(ctx, ym, 1)
		require.NoError(t, err)
		assert.Equal(t, monthlyData, data)

		// Wait for async event processing
		time.Sleep(100 * time.Millisecond)

		// Check that event was published
		publishedEvents := mockEventBus.GetPublishedEvents()
		assert.Len(t, publishedEvents, 1)

		// Check monthly data updated event
		dataEvent := publishedEvents[0]
		assert.Equal(t, "monthly_data.updated", dataEvent.Type())
		assert.Equal(t, monthlyData, dataEvent.Data())
	})

	t.Run("PublishSystemHealth", func(t *testing.T) {
		mockRepo := &MockRepository{}
		mockEventBus := NewMockEventBus()
		coreService := &Service{repo: mockRepo}
		eventService := NewEventService(coreService, mockEventBus)

		metrics := map[string]interface{}{
			"cpu_usage":    75.5,
			"memory_usage": 60.2,
		}

		// Test publishing system health
		eventService.PublishSystemHealth(ctx, "healthy", "System is running well", metrics)

		// Wait for async event processing
		time.Sleep(100 * time.Millisecond)

		// Check that event was published
		publishedEvents := mockEventBus.GetPublishedEvents()
		assert.Len(t, publishedEvents, 1)

		// Check system health event
		healthEvent := publishedEvents[0]
		assert.Equal(t, "system.health", healthEvent.Type())

		healthData := healthEvent.Data().(map[string]interface{})
		assert.Equal(t, "healthy", healthData["status"])
		assert.Equal(t, "System is running well", healthData["message"])
		assert.Equal(t, metrics, healthData["metrics"])
	})

	t.Run("GetEventMetrics", func(t *testing.T) {
		mockRepo := &MockRepository{}
		mockEventBus := NewMockEventBus()
		coreService := &Service{repo: mockRepo}
		eventService := NewEventService(coreService, mockEventBus)

		// Test getting event metrics
		metrics := eventService.GetEventMetrics()
		assert.NotNil(t, metrics)
	})

	t.Run("GetEventTypes", func(t *testing.T) {
		mockRepo := &MockRepository{}
		mockEventBus := NewMockEventBus()
		coreService := &Service{repo: mockRepo}
		eventService := NewEventService(coreService, mockEventBus)

		// Test getting event types
		eventTypes := eventService.GetEventTypes()
		assert.NotNil(t, eventTypes)
	})

	t.Run("GetSubscriberCount", func(t *testing.T) {
		mockRepo := &MockRepository{}
		mockEventBus := NewMockEventBus()
		coreService := &Service{repo: mockRepo}
		eventService := NewEventService(coreService, mockEventBus)

		// Test getting subscriber count
		count := eventService.GetSubscriberCount()
		assert.Equal(t, 0, count)
	})
}

func TestEventServiceBudgetExceeded(t *testing.T) {
	ctx := context.Background()

	t.Run("BudgetExceededOnAddExpense", func(t *testing.T) {
		mockRepo := &MockRepository{}
		mockEventBus := NewMockEventBus()
		coreService := &Service{repo: mockRepo}
		eventService := NewEventService(coreService, mockEventBus)

		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "Test expense",
			AmountCents: 1500, // Exceeds budget
			Category:    "Food",
		}

		// Mock repository responses
		mockRepo.On("AddExpense", ctx, expense).Return(int64(1), nil)
		mockRepo.On("GetMonthlyData", ctx, int64(1), expense.YearMonth).Return(&domain.MonthlyData{
			YearMonth: expense.YearMonth,
			Expenses:  []domain.Expense{*expense},
			BudgetSources: []domain.BudgetSource{
				{Name: "Food", AmountCents: 1000}, // Budget is 1000, spent is 1500
			},
		}, nil)

		// Test adding expense that exceeds budget
		expenseID, err := eventService.AddExpense(ctx, expense, 1)
		require.NoError(t, err)
		assert.Equal(t, int64(1), expenseID)

		// Wait for async event processing
		time.Sleep(100 * time.Millisecond)

		// Check that budget exceeded event was published
		publishedEvents := mockEventBus.GetPublishedEvents()
		assert.Len(t, publishedEvents, 2) // expense.created + budget.exceeded

		// Check budget exceeded event
		budgetEvent := publishedEvents[1]
		assert.Equal(t, "budget.exceeded", budgetEvent.Type())

		budgetData := budgetEvent.Data().(map[string]interface{})
		assert.Equal(t, "Food", budgetData["category"])
		assert.Equal(t, int64(1000), budgetData["budget"])
		assert.Equal(t, int64(1500), budgetData["spent"])
		assert.Equal(t, int64(500), budgetData["excess"])
	})

	t.Run("NoBudgetExceededWhenUnderBudget", func(t *testing.T) {
		mockRepo := &MockRepository{}
		mockEventBus := NewMockEventBus()
		coreService := &Service{repo: mockRepo}
		eventService := NewEventService(coreService, mockEventBus)

		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "Test expense",
			AmountCents: 500, // Under budget
			Category:    "Food",
		}

		// Mock repository responses
		mockRepo.On("AddExpense", ctx, expense).Return(int64(1), nil)
		mockRepo.On("GetMonthlyData", ctx, int64(1), expense.YearMonth).Return(&domain.MonthlyData{
			YearMonth: expense.YearMonth,
			Expenses:  []domain.Expense{*expense},
			BudgetSources: []domain.BudgetSource{
				{Name: "Food", AmountCents: 1000}, // Budget is 1000, spent is 500
			},
		}, nil)

		// Test adding expense that doesn't exceed budget
		expenseID, err := eventService.AddExpense(ctx, expense, 1)
		require.NoError(t, err)
		assert.Equal(t, int64(1), expenseID)

		// Wait for async event processing
		time.Sleep(100 * time.Millisecond)

		// Check that only expense created event was published
		publishedEvents := mockEventBus.GetPublishedEvents()
		assert.Len(t, publishedEvents, 1) // Only expense.created

		// Check expense created event
		expenseEvent := publishedEvents[0]
		assert.Equal(t, "expense.created", expenseEvent.Type())
	})

	t.Run("NoBudgetExceededWhenNoBudgetSet", func(t *testing.T) {
		mockRepo := &MockRepository{}
		mockEventBus := NewMockEventBus()
		coreService := &Service{repo: mockRepo}
		eventService := NewEventService(coreService, mockEventBus)

		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "Test expense",
			AmountCents: 1500,
			Category:    "Food",
		}

		// Mock repository responses
		mockRepo.On("AddExpense", ctx, expense).Return(int64(1), nil)
		mockRepo.On("GetMonthlyData", ctx, int64(1), expense.YearMonth).Return(&domain.MonthlyData{
			YearMonth:     expense.YearMonth,
			Expenses:      []domain.Expense{*expense},
			BudgetSources: []domain.BudgetSource{}, // No budget set
		}, nil)

		// Test adding expense when no budget is set
		expenseID, err := eventService.AddExpense(ctx, expense, 1)
		require.NoError(t, err)
		assert.Equal(t, int64(1), expenseID)

		// Wait for async event processing
		time.Sleep(100 * time.Millisecond)

		// Check that only expense created event was published
		publishedEvents := mockEventBus.GetPublishedEvents()
		assert.Len(t, publishedEvents, 1) // Only expense.created

		// Check expense created event
		expenseEvent := publishedEvents[0]
		assert.Equal(t, "expense.created", expenseEvent.Type())
	})
}
