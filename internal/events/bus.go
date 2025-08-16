package events

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"
)

// Event represents a domain event in the system
type Event interface {
	Type() string
	Data() interface{}
	Timestamp() time.Time
	ID() string
	Source() string
}

// EventHandler defines a function that handles events
type EventHandler func(ctx context.Context, event Event) error

// EventBusInterface defines the interface for event bus operations
type EventBusInterface interface {
	Subscribe(eventType string, handler EventHandler)
	Unsubscribe(eventType string, handler EventHandler)
	Publish(ctx context.Context, event Event)
	PublishAsync(ctx context.Context, event Event)
	GetMetrics() *EventMetrics
	GetEventTypes() []string
	GetSubscriberCount() int
}

// EventBus manages event subscriptions and publishing
type EventBus struct {
	handlers map[string][]EventHandler
	mu       sync.RWMutex
	metrics  *EventMetrics
}

// EventMetrics tracks event bus performance
type EventMetrics struct {
	PublishedEvents   int64
	HandledEvents     int64
	FailedEvents      int64
	ActiveSubscribers int64
	mu                sync.RWMutex
}

// NewEventBus creates a new event bus instance
func NewEventBus() *EventBus {
	return &EventBus{
		handlers: make(map[string][]EventHandler),
		metrics:  &EventMetrics{},
	}
}

// Subscribe registers an event handler for a specific event type
func (eb *EventBus) Subscribe(eventType string, handler EventHandler) {
	eb.mu.Lock()
	defer eb.mu.Unlock()

	eb.handlers[eventType] = append(eb.handlers[eventType], handler)

	eb.metrics.mu.Lock()
	eb.metrics.ActiveSubscribers++
	eb.metrics.mu.Unlock()

	slog.Info("event handler subscribed", "event_type", eventType)
}

// Unsubscribe removes an event handler for a specific event type
func (eb *EventBus) Unsubscribe(eventType string, handler EventHandler) {
	eb.mu.Lock()
	defer eb.mu.Unlock()

	handlers, exists := eb.handlers[eventType]
	if !exists {
		return
	}

	// Remove handler from slice
	for i, h := range handlers {
		if fmt.Sprintf("%p", h) == fmt.Sprintf("%p", handler) {
			eb.handlers[eventType] = append(handlers[:i], handlers[i+1:]...)
			break
		}
	}

	eb.metrics.mu.Lock()
	eb.metrics.ActiveSubscribers--
	eb.metrics.mu.Unlock()

	slog.Info("event handler unsubscribed", "event_type", eventType)
}

// Publish sends an event to all registered handlers
func (eb *EventBus) Publish(ctx context.Context, event Event) {
	eb.mu.RLock()
	handlers := make([]EventHandler, len(eb.handlers[event.Type()]))
	copy(handlers, eb.handlers[event.Type()])
	eb.mu.RUnlock()

	eb.metrics.mu.Lock()
	eb.metrics.PublishedEvents++
	eb.metrics.mu.Unlock()

	slog.Info("event published",
		"event_type", event.Type(),
		"event_id", event.ID(),
		"handlers_count", len(handlers))

	// Execute handlers concurrently
	var wg sync.WaitGroup
	for _, handler := range handlers {
		wg.Add(1)
		go func(h EventHandler) {
			defer wg.Done()

			start := time.Now()
			if err := h(ctx, event); err != nil {
				eb.metrics.mu.Lock()
				eb.metrics.FailedEvents++
				eb.metrics.mu.Unlock()

				slog.Error("event handler failed",
					"event_type", event.Type(),
					"event_id", event.ID(),
					"handler_error", err,
					"duration", time.Since(start))
			} else {
				eb.metrics.mu.Lock()
				eb.metrics.HandledEvents++
				eb.metrics.mu.Unlock()

				slog.Debug("event handler completed",
					"event_type", event.Type(),
					"event_id", event.ID(),
					"duration", time.Since(start))
			}
		}(handler)
	}

	wg.Wait()
}

// PublishAsync publishes an event asynchronously
func (eb *EventBus) PublishAsync(ctx context.Context, event Event) {
	go eb.Publish(ctx, event)
}

// GetMetrics returns current event bus metrics
func (eb *EventBus) GetMetrics() *EventMetrics {
	eb.metrics.mu.RLock()
	defer eb.metrics.mu.RUnlock()

	return &EventMetrics{
		PublishedEvents:   eb.metrics.PublishedEvents,
		HandledEvents:     eb.metrics.HandledEvents,
		FailedEvents:      eb.metrics.FailedEvents,
		ActiveSubscribers: eb.metrics.ActiveSubscribers,
	}
}

// GetSubscriberCount returns the total number of subscribers across all event types
func (eb *EventBus) GetSubscriberCount() int {
	eb.mu.RLock()
	defer eb.mu.RUnlock()

	total := 0
	for _, handlers := range eb.handlers {
		total += len(handlers)
	}

	return total
}

// GetEventTypes returns all registered event types
func (eb *EventBus) GetEventTypes() []string {
	eb.mu.RLock()
	defer eb.mu.RUnlock()

	types := make([]string, 0, len(eb.handlers))
	for eventType := range eb.handlers {
		types = append(types, eventType)
	}

	return types
}

// Clear removes all event handlers
func (eb *EventBus) Clear() {
	eb.mu.Lock()
	defer eb.mu.Unlock()

	eb.handlers = make(map[string][]EventHandler)

	eb.metrics.mu.Lock()
	eb.metrics.ActiveSubscribers = 0
	eb.metrics.mu.Unlock()

	slog.Info("event bus cleared")
}
