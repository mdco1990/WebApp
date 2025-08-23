// Package events implements decoupled event handling with concurrent support.
package events

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/mdco1990/webapp/internal/storage"
)

// Event interface defines the contract for all events
type Event interface {
	// Type returns the event type identifier
	Type() string

	// Data returns the event payload data
	Data() interface{}

	// Timestamp returns when the event was created
	Timestamp() time.Time

	// Source returns the source of the event
	Source() string

	// ID returns the unique event identifier
	ID() string

	// Version returns the event schema version
	Version() string
}

// BaseEvent provides common event functionality
type BaseEvent struct {
	EventType    string                 `json:"event_type"`
	EventData    interface{}            `json:"event_data"`
	EventTime    time.Time              `json:"event_time"`
	EventSource  string                 `json:"event_source"`
	EventID      string                 `json:"event_id"`
	EventVersion string                 `json:"event_version"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
}

// Type implements Event.Type
func (e BaseEvent) Type() string {
	return e.EventType
}

// Data implements Event.Data
func (e BaseEvent) Data() interface{} {
	return e.EventData
}

// Timestamp implements Event.Timestamp
func (e BaseEvent) Timestamp() time.Time {
	return e.EventTime
}

// Source implements Event.Source
func (e BaseEvent) Source() string {
	return e.EventSource
}

// ID implements Event.ID
func (e BaseEvent) ID() string {
	return e.EventID
}

// Version implements Event.Version
func (e BaseEvent) Version() string {
	return e.EventVersion
}

// NewBaseEvent creates a new base event
func NewBaseEvent(eventType, source string, data interface{}) BaseEvent {
	return BaseEvent{
		EventType:    eventType,
		EventData:    data,
		EventTime:    time.Now(),
		EventSource:  source,
		EventID:      generateEventID(),
		EventVersion: "1.0",
		Metadata:     make(map[string]interface{}),
	}
}

// EventHandler processes events
type EventHandler func(ctx context.Context, event Event) error

// EventMiddleware processes events before they reach handlers
type EventMiddleware func(next EventHandler) EventHandler

// EventSubscription represents an event subscription
type EventSubscription struct {
	ID       string
	Pattern  string
	Handler  EventHandler
	Priority int
	Active   bool
	Created  time.Time
	Metadata map[string]interface{}
}

// EventBus manages event publishing and subscription
type EventBus struct {
	subscriptions map[string][]*EventSubscription
	handlers      map[string][]EventHandler
	middleware    []EventMiddleware
	storage       storage.Provider
	mu            sync.RWMutex
	ctx           context.Context //nolint:containedctx
	cancel        context.CancelFunc
	stats         *EventBusStats
}

// EventBusStats tracks event bus statistics
type EventBusStats struct {
	EventsPublished     int64         `json:"events_published"`
	EventsProcessed     int64         `json:"events_processed"`
	EventsFailed        int64         `json:"events_failed"`
	ActiveSubscriptions int64         `json:"active_subscriptions"`
	TotalSubscriptions  int64         `json:"total_subscriptions"`
	AverageProcessTime  time.Duration `json:"average_process_time"`
	LastEventTime       time.Time     `json:"last_event_time"`
	mu                  sync.RWMutex
}

// NewEventBus creates a new event bus
func NewEventBus(storage storage.Provider) *EventBus {
	ctx, cancel := context.WithCancel(context.Background())

	return &EventBus{
		subscriptions: make(map[string][]*EventSubscription),
		handlers:      make(map[string][]EventHandler),
		middleware:    make([]EventMiddleware, 0),
		storage:       storage,
		ctx:           ctx,
		cancel:        cancel,
		stats:         &EventBusStats{},
	}
}

// Subscribe registers an event handler for a specific event type
func (eb *EventBus) Subscribe(eventType string, handler EventHandler, options ...SubscriptionOption) (string, error) {
	eb.mu.Lock()
	defer eb.mu.Unlock()

	// Create subscription
	sub := &EventSubscription{
		ID:       generateSubscriptionID(),
		Pattern:  eventType,
		Handler:  handler,
		Priority: 0,
		Active:   true,
		Created:  time.Now(),
		Metadata: make(map[string]interface{}),
	}

	// Apply options
	for _, option := range options {
		option(sub)
	}

	// Add to subscriptions
	eb.subscriptions[eventType] = append(eb.subscriptions[eventType], sub)

	// Sort by priority (higher priority first)
	eb.sortSubscriptionsByPriority(eventType)

	// Update stats
	eb.stats.mu.Lock()
	eb.stats.ActiveSubscriptions++
	eb.stats.TotalSubscriptions++
	eb.stats.mu.Unlock()

	return sub.ID, nil
}

// SubscribePattern registers an event handler for events matching a pattern
func (eb *EventBus) SubscribePattern(pattern string, handler EventHandler, options ...SubscriptionOption) (string, error) {
	eb.mu.Lock()
	defer eb.mu.Unlock()

	// Create subscription
	sub := &EventSubscription{
		ID:       generateSubscriptionID(),
		Pattern:  pattern,
		Handler:  handler,
		Priority: 0,
		Active:   true,
		Created:  time.Now(),
		Metadata: make(map[string]interface{}),
	}

	// Apply options
	for _, option := range options {
		option(sub)
	}

	// Add to pattern subscriptions
	eb.subscriptions[pattern] = append(eb.subscriptions[pattern], sub)

	// Sort by priority
	eb.sortSubscriptionsByPriority(pattern)

	// Update stats
	eb.stats.mu.Lock()
	eb.stats.ActiveSubscriptions++
	eb.stats.TotalSubscriptions++
	eb.stats.mu.Unlock()

	return sub.ID, nil
}

// Unsubscribe removes an event subscription
func (eb *EventBus) Unsubscribe(subscriptionID string) error {
	eb.mu.Lock()
	defer eb.mu.Unlock()

	for eventType, subs := range eb.subscriptions {
		for i, sub := range subs {
			if sub.ID == subscriptionID {
				// Remove subscription
				eb.subscriptions[eventType] = append(subs[:i], subs[i+1:]...)

				// Update stats
				eb.stats.mu.Lock()
				if sub.Active {
					eb.stats.ActiveSubscriptions--
				}
				eb.stats.mu.Unlock()

				return nil
			}
		}
	}

	return fmt.Errorf("subscription not found: %s", subscriptionID)
}

// Publish publishes an event to all subscribers
//
//nolint:cyclop
func (eb *EventBus) Publish(ctx context.Context, event Event) error {
	eb.mu.RLock()
	subs := make([]*EventSubscription, 0)

	// Collect all matching subscriptions
	for pattern, subscriptions := range eb.subscriptions {
		if eb.matchesPattern(event.Type(), pattern) {
			subs = append(subs, subscriptions...)
		}
	}
	eb.mu.RUnlock()

	if len(subs) == 0 {
		return nil // No subscribers
	}

	// Update stats
	eb.stats.mu.Lock()
	eb.stats.EventsPublished++
	eb.stats.LastEventTime = time.Now()
	eb.stats.mu.Unlock()

	// Process event with middleware
	handler := eb.buildHandlerChain(event)

	// Process event concurrently
	var wg sync.WaitGroup
	errors := make(chan error, len(subs))

	for _, sub := range subs {
		if !sub.Active {
			continue
		}

		wg.Add(1)
		go func(subscription *EventSubscription) {
			defer wg.Done()

			start := time.Now()
			err := handler(ctx, event)
			duration := time.Since(start)

			// Update stats
			eb.stats.mu.Lock()
			eb.stats.EventsProcessed++
			if err != nil {
				eb.stats.EventsFailed++
			}
			// Update average processing time
			if eb.stats.AverageProcessTime == 0 {
				eb.stats.AverageProcessTime = duration
			} else {
				eb.stats.AverageProcessTime = (eb.stats.AverageProcessTime + duration) / 2
			}
			eb.stats.mu.Unlock()

			if err != nil {
				errors <- fmt.Errorf("handler %s failed: %w", subscription.ID, err)
			}
		}(sub)
	}

	// Wait for all handlers to complete
	wg.Wait()
	close(errors)

	// Collect errors
	errs := make([]error, 0, len(errors))
	for err := range errors {
		errs = append(errs, err)
	}

	// Store event in storage for audit/replay
	if eb.storage != nil {
		eventData, _ := json.Marshal(event)
		ttl := 24 * time.Hour // Keep events for 24 hours
		_ = eb.storage.Save(ctx, "event:"+event.ID(), eventData, &ttl)
	}

	if len(errs) > 0 {
		return fmt.Errorf("some event handlers failed: %v", errs)
	}

	return nil
}

// PublishAsync publishes an event asynchronously
func (eb *EventBus) PublishAsync(ctx context.Context, event Event) {
	go func() {
		if err := eb.Publish(ctx, event); err != nil {
			// Log error but don't block
			slog.Error("Async event publishing failed", "error", err)
		}
	}()
}

// Use adds middleware to the event bus
func (eb *EventBus) Use(middleware ...EventMiddleware) {
	eb.mu.Lock()
	defer eb.mu.Unlock()
	eb.middleware = append(eb.middleware, middleware...)
}

// GetStats returns event bus statistics
func (eb *EventBus) GetStats() *EventBusStats {
	eb.stats.mu.RLock()
	defer eb.stats.mu.RUnlock()

	// Create a copy to avoid race conditions (excluding the mutex)
	stats := EventBusStats{
		EventsPublished:     eb.stats.EventsPublished,
		EventsProcessed:     eb.stats.EventsProcessed,
		EventsFailed:        eb.stats.EventsFailed,
		ActiveSubscriptions: eb.stats.ActiveSubscriptions,
		TotalSubscriptions:  eb.stats.TotalSubscriptions,
		AverageProcessTime:  eb.stats.AverageProcessTime,
		LastEventTime:       eb.stats.LastEventTime,
	}
	return &stats
}

// Close closes the event bus and cancels all operations
func (eb *EventBus) Close() error {
	eb.cancel()
	return nil
}

// matchesPattern checks if an event type matches a subscription pattern
func (eb *EventBus) matchesPattern(eventType, pattern string) bool {
	if pattern == eventType {
		return true
	}

	// Simple wildcard pattern matching
	if pattern == "*" {
		return true
	}

	if len(pattern) > 1 && pattern[len(pattern)-1] == '*' {
		prefix := pattern[:len(pattern)-1]
		return len(eventType) >= len(prefix) && eventType[:len(prefix)] == prefix
	}

	return false
}

// buildHandlerChain builds the middleware chain for event processing
func (eb *EventBus) buildHandlerChain(_ Event) EventHandler {
	handler := func(_ context.Context, _ Event) error {
		// This is a no-op handler that will be replaced by middleware
		return nil
	}

	// Apply middleware in reverse order
	for i := len(eb.middleware) - 1; i >= 0; i-- {
		handler = eb.middleware[i](handler)
	}

	return handler
}

// sortSubscriptionsByPriority sorts subscriptions by priority (higher first)
func (eb *EventBus) sortSubscriptionsByPriority(eventType string) {
	subs := eb.subscriptions[eventType]
	if len(subs) <= 1 {
		return
	}

	// Simple bubble sort for small lists
	for i := 0; i < len(subs)-1; i++ {
		for j := 0; j < len(subs)-i-1; j++ {
			if subs[j].Priority < subs[j+1].Priority {
				subs[j], subs[j+1] = subs[j+1], subs[j]
			}
		}
	}
}

// SubscriptionOption configures event subscriptions
type SubscriptionOption func(*EventSubscription)

// WithPriority sets the subscription priority
func WithPriority(priority int) SubscriptionOption {
	return func(sub *EventSubscription) {
		sub.Priority = priority
	}
}

// WithMetadata adds metadata to the subscription
func WithMetadata(key string, value interface{}) SubscriptionOption {
	return func(sub *EventSubscription) {
		if sub.Metadata == nil {
			sub.Metadata = make(map[string]interface{})
		}
		sub.Metadata[key] = value
	}
}

// ============================================================================
// SPECIFIC EVENT TYPES
// ============================================================================

// ExpenseCreatedEvent represents an expense creation event
type ExpenseCreatedEvent struct {
	BaseEvent
	ExpenseID int64  `json:"expense_id"`
	UserID    int64  `json:"user_id"`
	Amount    int64  `json:"amount_cents"`
	Category  string `json:"category"`
}

// NewExpenseCreatedEvent creates a new expense created event
func NewExpenseCreatedEvent(source string, expenseID, userID int64, amount int64, category string) *ExpenseCreatedEvent {
	return &ExpenseCreatedEvent{
		BaseEvent: NewBaseEvent("expense.created", source, nil),
		ExpenseID: expenseID,
		UserID:    userID,
		Amount:    amount,
		Category:  category,
	}
}

// BudgetExceededEvent represents a budget exceeded event
type BudgetExceededEvent struct {
	BaseEvent
	UserID      int64 `json:"user_id"`
	Month       int   `json:"month"`
	Year        int   `json:"year"`
	BudgetLimit int64 `json:"budget_limit_cents"`
	ActualSpent int64 `json:"actual_spent_cents"`
	Excess      int64 `json:"excess_cents"`
}

// NewBudgetExceededEvent creates a new budget exceeded event
func NewBudgetExceededEvent(source string, userID int64, month, year int, budgetLimit, actualSpent int64) *BudgetExceededEvent {
	excess := actualSpent - budgetLimit
	if excess < 0 {
		excess = 0
	}

	return &BudgetExceededEvent{
		BaseEvent:   NewBaseEvent("budget.exceeded", source, nil),
		UserID:      userID,
		Month:       month,
		Year:        year,
		BudgetLimit: budgetLimit,
		ActualSpent: actualSpent,
		Excess:      excess,
	}
}

// UserLoginEvent represents a user login event
type UserLoginEvent struct {
	BaseEvent
	UserID    int64  `json:"user_id"`
	Username  string `json:"username"`
	IPAddress string `json:"ip_address"`
	UserAgent string `json:"user_agent"`
	Success   bool   `json:"success"`
}

// NewUserLoginEvent creates a new user login event
func NewUserLoginEvent(source string, userID int64, username, ipAddress, userAgent string, success bool) *UserLoginEvent {
	return &UserLoginEvent{
		BaseEvent: NewBaseEvent("user.login", source, nil),
		UserID:    userID,
		Username:  username,
		IPAddress: ipAddress,
		UserAgent: userAgent,
		Success:   success,
	}
}

// DataExportEvent represents a data export event
type DataExportEvent struct {
	BaseEvent
	UserID     int64  `json:"user_id"`
	ExportType string `json:"export_type"`
	Format     string `json:"format"`
	FileSize   int64  `json:"file_size_bytes"`
	Status     string `json:"status"`
}

// NewDataExportEvent creates a new data export event
func NewDataExportEvent(source string, userID int64, exportType, format string, fileSize int64, status string) *DataExportEvent {
	return &DataExportEvent{
		BaseEvent:  NewBaseEvent("data.export", source, nil),
		UserID:     userID,
		ExportType: exportType,
		Format:     format,
		FileSize:   fileSize,
		Status:     status,
	}
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// generateEventID generates a unique event ID
func generateEventID() string {
	return fmt.Sprintf("evt_%d_%s", time.Now().UnixNano(), randomString(8))
}

// generateSubscriptionID generates a unique subscription ID
func generateSubscriptionID() string {
	return fmt.Sprintf("sub_%d_%s", time.Now().UnixNano(), randomString(8))
}

// randomString generates a random string of specified length
func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(b)
}
