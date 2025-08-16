package reactive

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestObservable(t *testing.T) {
	ctx := context.Background()
	observable := NewObservable[int](ctx)

	t.Run("Subscribe and Next", func(t *testing.T) {
		var receivedValue int
		var receivedError error

		err := observable.Subscribe("test", func(value int) error {
			receivedValue = value
			return nil
		})
		require.NoError(t, err)

		err = observable.Next(42)
		require.NoError(t, err)

		assert.Equal(t, 42, receivedValue)
		assert.Nil(t, receivedError)
	})

	t.Run("Multiple Observers", func(t *testing.T) {
		observable := NewObservable[string](ctx)
		values1 := []string{}
		values2 := []string{}

		observable.Subscribe("observer1", func(value string) error {
			values1 = append(values1, value)
			return nil
		})

		observable.Subscribe("observer2", func(value string) error {
			values2 = append(values2, value)
			return nil
		})

		observable.Next("hello")
		observable.Next("world")

		assert.Equal(t, []string{"hello", "world"}, values1)
		assert.Equal(t, []string{"hello", "world"}, values2)
	})

	t.Run("Observer Error Handling", func(t *testing.T) {
		observable := NewObservable[int](ctx)
		errorCount := 0

		observable.Subscribe("error_observer", func(value int) error {
			errorCount++
			return assert.AnError
		})

		err := observable.Next(1)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "observer error_observer")
		assert.Equal(t, 1, errorCount)
	})

	t.Run("Unsubscribe", func(t *testing.T) {
		observable := NewObservable[int](ctx)
		callCount := 0

		observable.Subscribe("test", func(value int) error {
			callCount++
			return nil
		})

		observable.Next(1)
		assert.Equal(t, 1, callCount)

		observable.Unsubscribe("test")
		observable.Next(2)
		assert.Equal(t, 1, callCount) // Should not be called again
	})

	t.Run("Close", func(t *testing.T) {
		observable := NewObservable[int](ctx)
		callCount := 0

		observable.Subscribe("test", func(value int) error {
			callCount++
			return nil
		})

		observable.Close()
		err := observable.Next(1)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "observable is closed")
		assert.Equal(t, 0, callCount)
	})

	t.Run("Observer Count", func(t *testing.T) {
		observable := NewObservable[int](ctx)
		assert.Equal(t, 0, observable.ObserverCount())

		observable.Subscribe("test1", func(value int) error { return nil })
		assert.Equal(t, 1, observable.ObserverCount())

		observable.Subscribe("test2", func(value int) error { return nil })
		assert.Equal(t, 2, observable.ObserverCount())

		observable.Unsubscribe("test1")
		assert.Equal(t, 1, observable.ObserverCount())
	})
}

func TestSubject(t *testing.T) {
	ctx := context.Background()
	subject := NewSubject[int](ctx)

	t.Run("Subject as Observable and Observer", func(t *testing.T) {
		receivedValues := []int{}

		subject.Subscribe("test", func(value int) error {
			receivedValues = append(receivedValues, value)
			return nil
		})

		subject.Next(1)
		subject.Next(2)

		assert.Equal(t, []int{1, 2}, receivedValues)
	})

	t.Run("Subject Observer Count", func(t *testing.T) {
		subject := NewSubject[string](ctx)
		assert.Equal(t, 0, subject.ObserverCount())

		subject.Subscribe("test1", func(value string) error { return nil })
		assert.Equal(t, 1, subject.ObserverCount())

		subject.Subscribe("test2", func(value string) error { return nil })
		assert.Equal(t, 2, subject.ObserverCount())
	})
}

func TestBehaviorSubject(t *testing.T) {
	ctx := context.Background()

	t.Run("Initial Value", func(t *testing.T) {
		subject := NewBehaviorSubject[int](ctx, 42)
		assert.Equal(t, 42, subject.GetValue())
	})

	t.Run("Subscribe Gets Current Value", func(t *testing.T) {
		subject := NewBehaviorSubject[string](ctx, "initial")
		receivedValues := []string{}

		subject.Subscribe("test", func(value string) error {
			receivedValues = append(receivedValues, value)
			return nil
		})

		assert.Equal(t, []string{"initial"}, receivedValues)
	})

	t.Run("Next Updates Value", func(t *testing.T) {
		subject := NewBehaviorSubject[int](ctx, 0)
		receivedValues := []int{}

		subject.Subscribe("test", func(value int) error {
			receivedValues = append(receivedValues, value)
			return nil
		})

		subject.Next(10)
		subject.Next(20)

		assert.Equal(t, []int{0, 10, 20}, receivedValues)
		assert.Equal(t, 20, subject.GetValue())
	})

	t.Run("Multiple Subscribers", func(t *testing.T) {
		subject := NewBehaviorSubject[string](ctx, "start")
		values1 := []string{}
		values2 := []string{}

		subject.Subscribe("observer1", func(value string) error {
			values1 = append(values1, value)
			return nil
		})

		subject.Next("update1")

		subject.Subscribe("observer2", func(value string) error {
			values2 = append(values2, value)
			return nil
		})

		subject.Next("update2")

		assert.Equal(t, []string{"start", "update1", "update2"}, values1)
		assert.Equal(t, []string{"update1", "update2"}, values2)
	})
}

func TestReplaySubject(t *testing.T) {
	ctx := context.Background()

	t.Run("Replay Buffer", func(t *testing.T) {
		subject := NewReplaySubject[int](ctx, 3)
		receivedValues := []int{}

		// Add values to buffer
		subject.Next(1)
		subject.Next(2)
		subject.Next(3)
		subject.Next(4) // Should drop the first value (1)

		// Subscribe after values were added
		subject.Subscribe("test", func(value int) error {
			receivedValues = append(receivedValues, value)
			return nil
		})

		// Should receive the last 3 values
		assert.Equal(t, []int{2, 3, 4}, receivedValues)
	})

	t.Run("Buffer Size Limit", func(t *testing.T) {
		subject := NewReplaySubject[string](ctx, 2)
		subject.Next("a")
		subject.Next("b")
		subject.Next("c")

		buffer := subject.GetBuffer()
		assert.Equal(t, []string{"b", "c"}, buffer)
	})

	t.Run("New Values After Subscribe", func(t *testing.T) {
		subject := NewReplaySubject[int](ctx, 2)
		receivedValues := []int{}

		subject.Next(1)
		subject.Next(2)

		subject.Subscribe("test", func(value int) error {
			receivedValues = append(receivedValues, value)
			return nil
		})

		subject.Next(3)
		subject.Next(4)

		assert.Equal(t, []int{1, 2, 3, 4}, receivedValues)
	})
}

func TestAsyncSubject(t *testing.T) {
	ctx := context.Background()

	t.Run("Complete Emits Last Value", func(t *testing.T) {
		subject := NewAsyncSubject[int](ctx)
		receivedValues := []int{}

		subject.Subscribe("test", func(value int) error {
			receivedValues = append(receivedValues, value)
			return nil
		})

		subject.Next(1)
		subject.Next(2)
		subject.Next(3)

		// No values should be emitted yet
		assert.Empty(t, receivedValues)

		subject.Complete()

		// Should emit only the last value
		assert.Equal(t, []int{3}, receivedValues)
	})

	t.Run("Subscribe After Complete", func(t *testing.T) {
		subject := NewAsyncSubject[string](ctx)
		receivedValues := []string{}

		subject.Next("first")
		subject.Next("last")
		subject.Complete()

		// Subscribe after completion
		subject.Subscribe("test", func(value string) error {
			receivedValues = append(receivedValues, value)
			return nil
		})

		// Should receive the last value immediately
		assert.Equal(t, []string{"last"}, receivedValues)
	})

	t.Run("Complete Without Values", func(t *testing.T) {
		subject := NewAsyncSubject[int](ctx)
		receivedValues := []int{}

		subject.Subscribe("test", func(value int) error {
			receivedValues = append(receivedValues, value)
			return nil
		})

		subject.Complete()

		// Should not emit anything
		assert.Empty(t, receivedValues)
	})

	t.Run("IsCompleted", func(t *testing.T) {
		subject := NewAsyncSubject[int](ctx)
		assert.False(t, subject.IsCompleted())

		subject.Complete()
		assert.True(t, subject.IsCompleted())
	})
}

func TestEventBus(t *testing.T) {
	ctx := context.Background()
	eventBus := NewEventBus(ctx)

	t.Run("Subscribe and Publish", func(t *testing.T) {
		receivedEvents := []*Event{}

		err := eventBus.Subscribe("test_event", "test_observer", func(event *Event) error {
			receivedEvents = append(receivedEvents, event)
			return nil
		})
		require.NoError(t, err)

		event := NewEvent("test_event", "test_data")
		err = eventBus.Publish(event)
		require.NoError(t, err)

		assert.Len(t, receivedEvents, 1)
		assert.Equal(t, "test_event", receivedEvents[0].Type)
		assert.Equal(t, "test_data", receivedEvents[0].Data)
	})

	t.Run("Multiple Event Types", func(t *testing.T) {
		event1Count := 0
		event2Count := 0

		eventBus.Subscribe("event1", "observer1", func(event *Event) error {
			event1Count++
			return nil
		})

		eventBus.Subscribe("event2", "observer2", func(event *Event) error {
			event2Count++
			return nil
		})

		eventBus.Publish(NewEvent("event1", nil))
		eventBus.Publish(NewEvent("event2", nil))
		eventBus.Publish(NewEvent("event1", nil))

		assert.Equal(t, 2, event1Count)
		assert.Equal(t, 1, event2Count)
	})

	t.Run("Unsubscribe", func(t *testing.T) {
		callCount := 0

		eventBus.Subscribe("test", "observer", func(event *Event) error {
			callCount++
			return nil
		})

		eventBus.Publish(NewEvent("test", nil))
		assert.Equal(t, 1, callCount)

		eventBus.Unsubscribe("test", "observer")
		eventBus.Publish(NewEvent("test", nil))
		assert.Equal(t, 1, callCount) // Should not be called again
	})

	t.Run("Subject and Observer Counts", func(t *testing.T) {
		eventBus := NewEventBus(ctx)
		assert.Equal(t, 0, eventBus.GetSubjectCount())
		assert.Equal(t, 0, eventBus.GetObserverCount())

		eventBus.Subscribe("event1", "observer1", func(event *Event) error { return nil })
		eventBus.Subscribe("event1", "observer2", func(event *Event) error { return nil })
		eventBus.Subscribe("event2", "observer3", func(event *Event) error { return nil })

		assert.Equal(t, 2, eventBus.GetSubjectCount())
		assert.Equal(t, 3, eventBus.GetObserverCount())
	})

	t.Run("Close", func(t *testing.T) {
		eventBus := NewEventBus(ctx)
		callCount := 0

		eventBus.Subscribe("test", "observer", func(event *Event) error {
			callCount++
			return nil
		})

		eventBus.Close()
		eventBus.Publish(NewEvent("test", nil))

		assert.Equal(t, 0, callCount)
		assert.Equal(t, 0, eventBus.GetSubjectCount())
	})
}

func TestReactiveUtilities(t *testing.T) {
	ctx := context.Background()

	t.Run("Map", func(t *testing.T) {
		source := NewObservable[int](ctx)
		mapped := Map(source, func(value int) string {
			return fmt.Sprintf("value_%d", value)
		})

		receivedValues := []string{}
		mapped.Subscribe("test", func(value string) error {
			receivedValues = append(receivedValues, value)
			return nil
		})

		source.Next(1)
		source.Next(2)

		assert.Equal(t, []string{"value_1", "value_2"}, receivedValues)
	})

	t.Run("Filter", func(t *testing.T) {
		source := NewObservable[int](ctx)
		filtered := Filter(source, func(value int) bool {
			return value%2 == 0
		})

		receivedValues := []int{}
		filtered.Subscribe("test", func(value int) error {
			receivedValues = append(receivedValues, value)
			return nil
		})

		source.Next(1)
		source.Next(2)
		source.Next(3)
		source.Next(4)

		assert.Equal(t, []int{2, 4}, receivedValues)
	})

	t.Run("Debounce", func(t *testing.T) {
		source := NewObservable[string](ctx)
		debounced := Debounce(source, 50*time.Millisecond)

		receivedValues := []string{}
		debounced.Subscribe("test", func(value string) error {
			receivedValues = append(receivedValues, value)
			return nil
		})

		source.Next("first")
		source.Next("second")
		source.Next("third")

		// Wait for debounce
		time.Sleep(100 * time.Millisecond)

		// Should only receive the last value
		assert.Equal(t, []string{"third"}, receivedValues)
	})

	t.Run("Throttle", func(t *testing.T) {
		source := NewObservable[int](ctx)
		throttled := Throttle(source, 50*time.Millisecond)

		receivedValues := []int{}
		throttled.Subscribe("test", func(value int) error {
			receivedValues = append(receivedValues, value)
			return nil
		})

		source.Next(1)
		source.Next(2)
		source.Next(3)

		// Wait for throttle
		time.Sleep(100 * time.Millisecond)

		// Should receive first value only
		assert.Equal(t, []int{1}, receivedValues)
	})

	t.Run("Merge", func(t *testing.T) {
		source1 := NewObservable[string](ctx)
		source2 := NewObservable[string](ctx)
		merged := Merge(ctx, source1, source2)

		receivedValues := []string{}
		merged.Subscribe("test", func(value string) error {
			receivedValues = append(receivedValues, value)
			return nil
		})

		source1.Next("from_source1")
		source2.Next("from_source2")
		source1.Next("from_source1_again")

		assert.Equal(t, []string{"from_source1", "from_source2", "from_source1_again"}, receivedValues)
	})

	t.Run("CombineLatest", func(t *testing.T) {
		source1 := NewObservable[int](ctx)
		source2 := NewObservable[string](ctx)
		combined := CombineLatest(ctx, source1, source2, func(value1 int, value2 string) string {
			return fmt.Sprintf("%d_%s", value1, value2)
		})

		receivedValues := []string{}
		combined.Subscribe("test", func(value string) error {
			receivedValues = append(receivedValues, value)
			return nil
		})

		source1.Next(1)
		source2.Next("a")
		source1.Next(2)
		source2.Next("b")

		assert.Equal(t, []string{"1_a", "2_a", "2_b"}, receivedValues)
	})
}

func TestEvent(t *testing.T) {
	t.Run("NewEvent", func(t *testing.T) {
		event := NewEvent("test_type", "test_data")

		assert.Equal(t, "test_type", event.Type)
		assert.Equal(t, "test_data", event.Data)
		assert.NotZero(t, event.Timestamp)
		assert.NotNil(t, event.Metadata)
	})

	t.Run("WithMetadata", func(t *testing.T) {
		event := NewEvent("test", nil)
		event.WithMetadata("key1", "value1").WithMetadata("key2", "value2")

		assert.Equal(t, "value1", event.Metadata["key1"])
		assert.Equal(t, "value2", event.Metadata["key2"])
	})
}
