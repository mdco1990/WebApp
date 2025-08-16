package events

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/mdco1990/webapp/internal/domain"
	"github.com/stretchr/testify/assert"
)

func TestEventBus(t *testing.T) {
	t.Run("Subscribe and Publish", func(t *testing.T) {
		eventBus := NewEventBus()
		ctx := context.Background()

		var receivedEvent Event
		var handlerCalled bool

		handler := func(ctx context.Context, event Event) error {
			receivedEvent = event
			handlerCalled = true
			return nil
		}

		// Subscribe to event
		eventBus.Subscribe("expense.created", handler)

		// Create and publish event
		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "Test expense",
			AmountCents: 1000,
			Category:    "Food",
		}

		event := NewExpenseCreatedEvent(expense, 1, "test")
		eventBus.Publish(ctx, event)

		// Wait for async processing
		time.Sleep(100 * time.Millisecond)

		assert.True(t, handlerCalled)
		assert.Equal(t, event, receivedEvent)
		assert.Equal(t, "expense.created", receivedEvent.Type())
	})

	t.Run("Multiple Handlers", func(t *testing.T) {
		eventBus := NewEventBus()
		ctx := context.Background()

		var handler1Called, handler2Called bool
		var mu sync.Mutex

		handler1 := func(ctx context.Context, event Event) error {
			mu.Lock()
			handler1Called = true
			mu.Unlock()
			return nil
		}

		handler2 := func(ctx context.Context, event Event) error {
			mu.Lock()
			handler2Called = true
			mu.Unlock()
			return nil
		}

		// Subscribe multiple handlers
		eventBus.Subscribe("expense.created", handler1)
		eventBus.Subscribe("expense.created", handler2)

		// Create and publish event
		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "Test expense",
			AmountCents: 1000,
			Category:    "Food",
		}

		event := NewExpenseCreatedEvent(expense, 1, "test")
		eventBus.Publish(ctx, event)

		// Wait for async processing
		time.Sleep(100 * time.Millisecond)

		mu.Lock()
		assert.True(t, handler1Called)
		assert.True(t, handler2Called)
		mu.Unlock()
	})

	t.Run("Handler Error Handling", func(t *testing.T) {
		eventBus := NewEventBus()
		ctx := context.Background()

		var handlerCalled bool

		handler := func(ctx context.Context, event Event) error {
			handlerCalled = true
			return assert.AnError
		}

		// Subscribe to event
		eventBus.Subscribe("expense.created", handler)

		// Create and publish event
		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "Test expense",
			AmountCents: 1000,
			Category:    "Food",
		}

		event := NewExpenseCreatedEvent(expense, 1, "test")
		eventBus.Publish(ctx, event)

		// Wait for async processing
		time.Sleep(100 * time.Millisecond)

		assert.True(t, handlerCalled)

		// Check metrics
		metrics := eventBus.GetMetrics()
		assert.Equal(t, int64(1), metrics.PublishedEvents)
		assert.Equal(t, int64(0), metrics.HandledEvents)
		assert.Equal(t, int64(1), metrics.FailedEvents)
	})

	t.Run("Unsubscribe", func(t *testing.T) {
		eventBus := NewEventBus()
		ctx := context.Background()

		var handlerCalled bool

		handler := func(ctx context.Context, event Event) error {
			handlerCalled = true
			return nil
		}

		// Subscribe to event
		eventBus.Subscribe("expense.created", handler)

		// Unsubscribe
		eventBus.Unsubscribe("expense.created", handler)

		// Create and publish event
		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "Test expense",
			AmountCents: 1000,
			Category:    "Food",
		}

		event := NewExpenseCreatedEvent(expense, 1, "test")
		eventBus.Publish(ctx, event)

		// Wait for async processing
		time.Sleep(100 * time.Millisecond)

		assert.False(t, handlerCalled)
		assert.Equal(t, 0, eventBus.GetSubscriberCount())
	})

	t.Run("GetEventTypes", func(t *testing.T) {
		eventBus := NewEventBus()

		handler := func(ctx context.Context, event Event) error { return nil }

		// Subscribe to multiple event types
		eventBus.Subscribe("event1", handler)
		eventBus.Subscribe("event2", handler)
		eventBus.Subscribe("event3", handler)

		eventTypes := eventBus.GetEventTypes()

		assert.Len(t, eventTypes, 3)
		assert.Contains(t, eventTypes, "event1")
		assert.Contains(t, eventTypes, "event2")
		assert.Contains(t, eventTypes, "event3")
	})

	t.Run("GetSubscriberCount", func(t *testing.T) {
		eventBus := NewEventBus()

		handler1 := func(ctx context.Context, event Event) error { return nil }
		handler2 := func(ctx context.Context, event Event) error { return nil }

		// Subscribe multiple handlers to same event
		eventBus.Subscribe("expense.created", handler1)
		eventBus.Subscribe("expense.created", handler2)

		assert.Equal(t, 2, eventBus.GetSubscriberCount())
	})

	t.Run("Clear", func(t *testing.T) {
		eventBus := NewEventBus()

		handler := func(ctx context.Context, event Event) error { return nil }

		// Subscribe to events
		eventBus.Subscribe("event1", handler)
		eventBus.Subscribe("event2", handler)

		// Clear all handlers
		eventBus.Clear()

		assert.Equal(t, 0, eventBus.GetSubscriberCount())
		assert.Len(t, eventBus.GetEventTypes(), 0)

		metrics := eventBus.GetMetrics()
		assert.Equal(t, int64(0), metrics.ActiveSubscribers)
	})

	t.Run("Metrics", func(t *testing.T) {
		eventBus := NewEventBus()
		ctx := context.Background()

		successHandler := func(ctx context.Context, event Event) error { return nil }
		errorHandler := func(ctx context.Context, event Event) error { return assert.AnError }

		// Subscribe handlers to different event types
		eventBus.Subscribe("expense.created", successHandler)
		eventBus.Subscribe("budget.exceeded", errorHandler)

		// Publish events
		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "Test expense",
			AmountCents: 1000,
			Category:    "Food",
		}

		successEvent := NewExpenseCreatedEvent(expense, 1, "test")
		errorEvent := NewBudgetExceededEvent(domain.YearMonth{Year: 2024, Month: 1}, 1, "Food", 1000, 1500, "test")

		eventBus.Publish(ctx, successEvent)
		eventBus.Publish(ctx, errorEvent)

		// Wait for async processing
		time.Sleep(100 * time.Millisecond)

		metrics := eventBus.GetMetrics()
		assert.Equal(t, int64(2), metrics.PublishedEvents)
		assert.Equal(t, int64(1), metrics.HandledEvents)
		assert.Equal(t, int64(1), metrics.FailedEvents)
		assert.Equal(t, int64(2), metrics.ActiveSubscribers)
	})
}

func TestDomainEvents(t *testing.T) {
	t.Run("ExpenseCreatedEvent", func(t *testing.T) {
		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "Test expense",
			AmountCents: 1000,
			Category:    "Food",
		}

		event := NewExpenseCreatedEvent(expense, 1, "test")

		assert.Equal(t, "expense.created", event.Type())
		assert.Equal(t, expense, event.Data())
		assert.NotEmpty(t, event.ID())
		assert.Equal(t, "test", event.Source())
		assert.True(t, time.Since(event.Timestamp()) < time.Second)
	})

	t.Run("ExpenseUpdatedEvent", func(t *testing.T) {
		oldExpense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "Old expense",
			AmountCents: 500,
			Category:    "Food",
		}

		newExpense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "New expense",
			AmountCents: 1000,
			Category:    "Food",
		}

		event := NewExpenseUpdatedEvent(newExpense, oldExpense, 1, "test")

		assert.Equal(t, "expense.updated", event.Type())
		assert.Equal(t, newExpense, event.Data())
		assert.Equal(t, oldExpense, event.OldExpense)
		assert.Equal(t, int64(1), event.UserID)
	})

	t.Run("ExpenseDeletedEvent", func(t *testing.T) {
		expense := &domain.Expense{
			ID:          123,
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "Test expense",
			AmountCents: 1000,
			Category:    "Food",
		}

		event := NewExpenseDeletedEvent(expense, 1, "test")

		assert.Equal(t, "expense.deleted", event.Type())
		assert.Equal(t, expense, event.Data())
		assert.Equal(t, int64(123), event.ExpenseID)
		assert.Equal(t, int64(1), event.UserID)
	})

	t.Run("BudgetExceededEvent", func(t *testing.T) {
		ym := domain.YearMonth{Year: 2024, Month: 1}
		event := NewBudgetExceededEvent(ym, 1, "Food", 1000, 1500, "test")

		assert.Equal(t, "budget.exceeded", event.Type())
		assert.Equal(t, ym, event.YearMonth)
		assert.Equal(t, int64(1), event.UserID)
		assert.Equal(t, "Food", event.Category)
		assert.Equal(t, int64(1000), event.Budget)
		assert.Equal(t, int64(1500), event.Spent)
		assert.Equal(t, int64(500), event.Excess)

		data := event.Data().(map[string]interface{})
		assert.Equal(t, ym, data["year_month"])
		assert.Equal(t, int64(1), data["user_id"])
		assert.Equal(t, "Food", data["category"])
		assert.Equal(t, int64(1000), data["budget"])
		assert.Equal(t, int64(1500), data["spent"])
		assert.Equal(t, int64(500), data["excess"])
	})

	t.Run("SystemHealthEvent", func(t *testing.T) {
		metrics := map[string]interface{}{
			"cpu_usage":    75.5,
			"memory_usage": 60.2,
		}

		event := NewSystemHealthEvent("healthy", "System is running well", metrics, "test")

		assert.Equal(t, "system.health", event.Type())
		assert.Equal(t, "healthy", event.Status)
		assert.Equal(t, "System is running well", event.Message)
		assert.Equal(t, metrics, event.Metrics)

		data := event.Data().(map[string]interface{})
		assert.Equal(t, "healthy", data["status"])
		assert.Equal(t, "System is running well", data["message"])
		assert.Equal(t, metrics, data["metrics"])
	})

	t.Run("UserLoggedInEvent", func(t *testing.T) {
		user := &domain.User{
			ID:       1,
			Username: "testuser",
			Email:    "test@example.com",
		}

		event := NewUserLoggedInEvent(user, "192.168.1.1", "Mozilla/5.0", "test")

		assert.Equal(t, "user.logged_in", event.Type())
		assert.Equal(t, user, event.Data())
		assert.Equal(t, "192.168.1.1", event.LoginIP)
		assert.Equal(t, "Mozilla/5.0", event.UserAgent)
	})

	t.Run("MonthlyDataUpdatedEvent", func(t *testing.T) {
		ym := domain.YearMonth{Year: 2024, Month: 1}
		data := &domain.MonthlyData{
			YearMonth: ym,
			MonthName: "January",
		}

		event := NewMonthlyDataUpdatedEvent(ym, 1, data, "test")

		assert.Equal(t, "monthly_data.updated", event.Type())
		assert.Equal(t, data, event.Data())
		assert.Equal(t, ym, event.YearMonth)
		assert.Equal(t, int64(1), event.UserID)
	})
}

func TestEventIDUniqueness(t *testing.T) {
	eventBus := NewEventBus()
	ctx := context.Background()

	var eventIDs []string
	var mu sync.Mutex

	handler := func(ctx context.Context, event Event) error {
		mu.Lock()
		eventIDs = append(eventIDs, event.ID())
		mu.Unlock()
		return nil
	}

	eventBus.Subscribe("expense.created", handler)

	// Create multiple events
	expense := &domain.Expense{
		YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
		Description: "Test expense",
		AmountCents: 1000,
		Category:    "Food",
	}

	for i := 0; i < 10; i++ {
		event := NewExpenseCreatedEvent(expense, 1, "test")
		eventBus.Publish(ctx, event)
	}

	// Wait for async processing
	time.Sleep(100 * time.Millisecond)

	mu.Lock()
	assert.Len(t, eventIDs, 10)

	// Check uniqueness
	uniqueIDs := make(map[string]bool)
	for _, id := range eventIDs {
		assert.False(t, uniqueIDs[id], "Duplicate event ID found: %s", id)
		uniqueIDs[id] = true
	}
	mu.Unlock()
}
