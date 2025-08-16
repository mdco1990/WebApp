// Package reactive implements reactive programming patterns.
package reactive

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"
)

// Observer is a function type that receives data and handles it.
type Observer[T any] func(T) error

// Observable represents a stream of data that can be observed.
type Observable[T any] struct {
	observers map[string]Observer[T]
	mu        sync.RWMutex
	closed    bool
	ctx       context.Context
	cancel    context.CancelFunc
}

// NewObservable creates a new observable with the given context.
func NewObservable[T any](ctx context.Context) *Observable[T] {
	ctx, cancel := context.WithCancel(ctx)
	return &Observable[T]{
		observers: make(map[string]Observer[T]),
		ctx:       ctx,
		cancel:    cancel,
	}
}

// Subscribe adds an observer to the observable.
func (o *Observable[T]) Subscribe(id string, observer Observer[T]) error {
	o.mu.Lock()
	defer o.mu.Unlock()

	if o.closed {
		return fmt.Errorf("observable is closed")
	}

	o.observers[id] = observer
	slog.Debug("Observer subscribed", "id", id, "observable", fmt.Sprintf("%T", o))
	return nil
}

// Unsubscribe removes an observer from the observable.
func (o *Observable[T]) Unsubscribe(id string) {
	o.mu.Lock()
	defer o.mu.Unlock()

	delete(o.observers, id)
	slog.Debug("Observer unsubscribed", "id", id, "observable", fmt.Sprintf("%T", o))
}

// Next sends data to all observers.
func (o *Observable[T]) Next(data T) error {
	o.mu.RLock()
	defer o.mu.RUnlock()

	if o.closed {
		return fmt.Errorf("observable is closed")
	}

	var errors []error
	for id, observer := range o.observers {
		select {
		case <-o.ctx.Done():
			return o.ctx.Err()
		default:
			if err := observer(data); err != nil {
				errors = append(errors, fmt.Errorf("observer %s: %w", id, err))
			}
		}
	}

	if len(errors) > 0 {
		return fmt.Errorf("errors in observers: %v", errors)
	}

	return nil
}

// Close closes the observable and cancels all observers.
func (o *Observable[T]) Close() {
	o.mu.Lock()
	defer o.mu.Unlock()

	if !o.closed {
		o.closed = true
		o.cancel()
		slog.Debug("Observable closed", "observable", fmt.Sprintf("%T", o))
	}
}

// IsClosed returns true if the observable is closed.
func (o *Observable[T]) IsClosed() bool {
	o.mu.RLock()
	defer o.mu.RUnlock()
	return o.closed
}

// ObserverCount returns the number of active observers.
func (o *Observable[T]) ObserverCount() int {
	o.mu.RLock()
	defer o.mu.RUnlock()
	return len(o.observers)
}

// Subject is both an Observable and an Observer.
type Subject[T any] struct {
	*Observable[T]
	observers map[string]Observer[T]
	mu        sync.RWMutex
}

// NewSubject creates a new subject.
func NewSubject[T any](ctx context.Context) *Subject[T] {
	return &Subject[T]{
		Observable: NewObservable[T](ctx),
		observers:  make(map[string]Observer[T]),
	}
}

// Next implements Observer interface for Subject.
func (s *Subject[T]) Next(data T) error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var errors []error
	for id, observer := range s.observers {
		select {
		case <-s.ctx.Done():
			return s.ctx.Err()
		default:
			if err := observer(data); err != nil {
				errors = append(errors, fmt.Errorf("observer %s: %w", id, err))
			}
		}
	}

	if len(errors) > 0 {
		return fmt.Errorf("errors in observers: %v", errors)
	}

	return nil
}

// Subscribe adds an observer to the subject.
func (s *Subject[T]) Subscribe(id string, observer Observer[T]) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		return fmt.Errorf("subject is closed")
	}

	s.observers[id] = observer
	slog.Debug("Observer subscribed to subject", "id", id)
	return nil
}

// Unsubscribe removes an observer from the subject.
func (s *Subject[T]) Unsubscribe(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.observers, id)
	slog.Debug("Observer unsubscribed from subject", "id", id)
}

// ObserverCount returns the number of active observers.
func (s *Subject[T]) ObserverCount() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.observers)
}

// BehaviorSubject is a Subject that stores the latest value and emits it to new subscribers.
type BehaviorSubject[T any] struct {
	*Subject[T]
	value T
	mu    sync.RWMutex
}

// NewBehaviorSubject creates a new behavior subject with an initial value.
func NewBehaviorSubject[T any](ctx context.Context, initialValue T) *BehaviorSubject[T] {
	return &BehaviorSubject[T]{
		Subject: NewSubject[T](ctx),
		value:   initialValue,
	}
}

// Next updates the value and notifies all observers.
func (bs *BehaviorSubject[T]) Next(data T) error {
	bs.mu.Lock()
	bs.value = data
	bs.mu.Unlock()

	return bs.Subject.Next(data)
}

// GetValue returns the current value.
func (bs *BehaviorSubject[T]) GetValue() T {
	bs.mu.RLock()
	defer bs.mu.RUnlock()
	return bs.value
}

// Subscribe adds an observer and immediately emits the current value.
func (bs *BehaviorSubject[T]) Subscribe(id string, observer Observer[T]) error {
	bs.mu.RLock()
	currentValue := bs.value
	bs.mu.RUnlock()

	// Emit current value immediately
	if err := observer(currentValue); err != nil {
		return fmt.Errorf("initial value emission failed: %w", err)
	}

	return bs.Subject.Subscribe(id, observer)
}

// ReplaySubject is a Subject that stores and replays a buffer of values to new subscribers.
type ReplaySubject[T any] struct {
	*Subject[T]
	buffer     []T
	bufferSize int
	mu         sync.RWMutex
}

// NewReplaySubject creates a new replay subject with the specified buffer size.
func NewReplaySubject[T any](ctx context.Context, bufferSize int) *ReplaySubject[T] {
	return &ReplaySubject[T]{
		Subject:    NewSubject[T](ctx),
		buffer:     make([]T, 0, bufferSize),
		bufferSize: bufferSize,
	}
}

// Next adds the value to the buffer and notifies all observers.
func (rs *ReplaySubject[T]) Next(data T) error {
	rs.mu.Lock()

	// Add to buffer
	rs.buffer = append(rs.buffer, data)

	// Maintain buffer size
	if len(rs.buffer) > rs.bufferSize {
		rs.buffer = rs.buffer[1:]
	}

	rs.mu.Unlock()

	return rs.Subject.Next(data)
}

// Subscribe adds an observer and replays the buffer.
func (rs *ReplaySubject[T]) Subscribe(id string, observer Observer[T]) error {
	rs.mu.RLock()
	buffer := make([]T, len(rs.buffer))
	copy(buffer, rs.buffer)
	rs.mu.RUnlock()

	// Replay buffer
	for _, value := range buffer {
		if err := observer(value); err != nil {
			return fmt.Errorf("buffer replay failed: %w", err)
		}
	}

	return rs.Subject.Subscribe(id, observer)
}

// GetBuffer returns a copy of the current buffer.
func (rs *ReplaySubject[T]) GetBuffer() []T {
	rs.mu.RLock()
	defer rs.mu.RUnlock()

	buffer := make([]T, len(rs.buffer))
	copy(buffer, rs.buffer)
	return buffer
}

// AsyncSubject is a Subject that only emits the last value when completed.
type AsyncSubject[T any] struct {
	*Subject[T]
	lastValue *T
	completed bool
	mu        sync.RWMutex
}

// NewAsyncSubject creates a new async subject.
func NewAsyncSubject[T any](ctx context.Context) *AsyncSubject[T] {
	return &AsyncSubject[T]{
		Subject: NewSubject[T](ctx),
	}
}

// Next stores the value but doesn't emit it yet.
func (as *AsyncSubject[T]) Next(data T) error {
	as.mu.Lock()
	as.lastValue = &data
	as.mu.Unlock()
	return nil
}

// Complete emits the last value to all observers and marks the subject as completed.
func (as *AsyncSubject[T]) Complete() error {
	as.mu.Lock()
	as.completed = true
	lastValue := as.lastValue
	as.mu.Unlock()

	if lastValue != nil {
		return as.Subject.Next(*lastValue)
	}
	return nil
}

// Subscribe adds an observer and emits the last value if completed.
func (as *AsyncSubject[T]) Subscribe(id string, observer Observer[T]) error {
	as.mu.RLock()
	completed := as.completed
	lastValue := as.lastValue
	as.mu.RUnlock()

	if completed && lastValue != nil {
		if err := observer(*lastValue); err != nil {
			return fmt.Errorf("last value emission failed: %w", err)
		}
	}

	return as.Subject.Subscribe(id, observer)
}

// IsCompleted returns true if the subject is completed.
func (as *AsyncSubject[T]) IsCompleted() bool {
	as.mu.RLock()
	defer as.mu.RUnlock()
	return as.completed
}

// Event represents an event with a type and data.
type Event struct {
	Type      string                 `json:"type"`
	Data      interface{}            `json:"data"`
	Timestamp time.Time              `json:"timestamp"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// NewEvent creates a new event.
func NewEvent(eventType string, data interface{}) *Event {
	return &Event{
		Type:      eventType,
		Data:      data,
		Timestamp: time.Now(),
		Metadata:  make(map[string]interface{}),
	}
}

// WithMetadata adds metadata to the event.
func (e *Event) WithMetadata(key string, value interface{}) *Event {
	e.Metadata[key] = value
	return e
}

// EventBus is a central event bus for reactive communication.
type EventBus struct {
	subjects map[string]*Subject[*Event]
	mu       sync.RWMutex
	ctx      context.Context
	cancel   context.CancelFunc
}

// NewEventBus creates a new event bus.
func NewEventBus(ctx context.Context) *EventBus {
	ctx, cancel := context.WithCancel(ctx)
	return &EventBus{
		subjects: make(map[string]*Subject[*Event]),
		ctx:      ctx,
		cancel:   cancel,
	}
}

// Subscribe subscribes to events of a specific type.
func (eb *EventBus) Subscribe(eventType string, id string, observer Observer[*Event]) error {
	eb.mu.Lock()
	defer eb.mu.Unlock()

	subject, exists := eb.subjects[eventType]
	if !exists {
		subject = NewSubject[*Event](eb.ctx)
		eb.subjects[eventType] = subject
	}

	return subject.Subscribe(id, observer)
}

// Unsubscribe unsubscribes from events of a specific type.
func (eb *EventBus) Unsubscribe(eventType string, id string) {
	eb.mu.RLock()
	subject, exists := eb.subjects[eventType]
	eb.mu.RUnlock()

	if exists {
		subject.Unsubscribe(id)
	}
}

// Publish publishes an event to all subscribers of that event type.
func (eb *EventBus) Publish(event *Event) error {
	eb.mu.RLock()
	subject, exists := eb.subjects[event.Type]
	eb.mu.RUnlock()

	if exists {
		return subject.Next(event)
	}
	return nil
}

// Close closes the event bus and all subjects.
func (eb *EventBus) Close() {
	eb.mu.Lock()
	defer eb.mu.Unlock()

	eb.cancel()
	for _, subject := range eb.subjects {
		subject.Close()
	}
	eb.subjects = make(map[string]*Subject[*Event])
}

// GetSubjectCount returns the number of active subjects.
func (eb *EventBus) GetSubjectCount() int {
	eb.mu.RLock()
	defer eb.mu.RUnlock()
	return len(eb.subjects)
}

// GetObserverCount returns the total number of observers across all subjects.
func (eb *EventBus) GetObserverCount() int {
	eb.mu.RLock()
	defer eb.mu.RUnlock()

	total := 0
	for _, subject := range eb.subjects {
		total += subject.ObserverCount()
	}
	return total
}

// Reactive utilities

// Map transforms values in an observable stream.
func Map[T, R any](observable *Observable[T], mapper func(T) R) *Observable[R] {
	result := NewObservable[R](observable.ctx)

	observable.Subscribe("map", func(data T) error {
		return result.Next(mapper(data))
	})

	return result
}

// Filter filters values in an observable stream.
func Filter[T any](observable *Observable[T], predicate func(T) bool) *Observable[T] {
	result := NewObservable[T](observable.ctx)

	observable.Subscribe("filter", func(data T) error {
		if predicate(data) {
			return result.Next(data)
		}
		return nil
	})

	return result
}

// Debounce delays emissions by a specified duration.
func Debounce[T any](observable *Observable[T], duration time.Duration) *Observable[T] {
	result := NewObservable[T](observable.ctx)

	var timer *time.Timer
	observable.Subscribe("debounce", func(data T) error {
		if timer != nil {
			timer.Stop()
		}

		timer = time.AfterFunc(duration, func() {
			result.Next(data)
		})

		return nil
	})

	return result
}

// Throttle limits emissions to a maximum frequency.
func Throttle[T any](observable *Observable[T], duration time.Duration) *Observable[T] {
	result := NewObservable[T](observable.ctx)

	var lastEmission time.Time
	observable.Subscribe("throttle", func(data T) error {
		now := time.Now()
		if now.Sub(lastEmission) >= duration {
			lastEmission = now
			return result.Next(data)
		}
		return nil
	})

	return result
}

// Merge combines multiple observables into one.
func Merge[T any](ctx context.Context, observables ...*Observable[T]) *Observable[T] {
	result := NewObservable[T](ctx)

	for i, observable := range observables {
		observable.Subscribe(fmt.Sprintf("merge_%d", i), func(data T) error {
			return result.Next(data)
		})
	}

	return result
}

// CombineLatest combines the latest values from multiple observables.
func CombineLatest[T, U, R any](ctx context.Context, obs1 *Observable[T], obs2 *Observable[U], combiner func(T, U) R) *Observable[R] {
	result := NewObservable[R](ctx)

	var latest1 *T
	var latest2 *U

	obs1.Subscribe("combine_1", func(data T) error {
		latest1 = &data
		if latest2 != nil {
			return result.Next(combiner(*latest1, *latest2))
		}
		return nil
	})

	obs2.Subscribe("combine_2", func(data U) error {
		latest2 = &data
		if latest1 != nil {
			return result.Next(combiner(*latest1, *latest2))
		}
		return nil
	})

	return result
}
