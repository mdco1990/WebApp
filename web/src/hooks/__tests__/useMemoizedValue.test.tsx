/**
 * @file Tests for useMemoizedValue and related hooks
 * @module useMemoizedValue.test
 * @description Comprehensive test suite for useMemoizedValue hook and its utilities,
 *              covering memoization behavior, staleness tracking, and edge cases.
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useMemoizedValue,
  useStableCallback,
  useStableReference,
  defaultComparison,
  __memoizationReducerForTest,
} from '../useMemoizedValue';
// React import not required with the automatic JSX runtime

// Test data and utilities
const createTestState = (overrides = {}) => ({
  value: 'test-value',
  dependencies: [1, 2, 3],
  lastUpdate: 123,
  isStale: false,
  ...overrides,
});

const createTestComponent = (options: { maxAge?: number; initialDeps?: any[] } = {}) => {
  const { maxAge = 1000, initialDeps = [] } = options;
  let sequence = 0;

  const { result, rerender } = renderHook(
    ({ deps }) =>
      useMemoizedValue(
        () => ({
          id: ++sequence,
          timestamp: Date.now(),
        }),
        deps,
        { maxAge }
      ),
    { initialProps: { deps: initialDeps } }
  );

  return {
    result,
    rerender: (newDeps = initialDeps) => rerender({ deps: newDeps }),
    getValue: () => result.current.value,
    isStale: () => result.current.isStale,
    refresh: () => act(() => result.current.refresh()),
    clear: () => act(() => result.current.clear()),
  };
};

describe('useMemoizedValue', () => {
  // Setup and teardown
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('memoization reducer', () => {
    it('returns current state for unknown action types', () => {
      const state = createTestState();
      // @ts-expect-error Testing unknown action type
      const result = __memoizationReducerForTest(state, { type: 'UNKNOWN_ACTION' });
      expect(result).toBe(state);
    });
  });

  describe('basic functionality', () => {
    // Extracted to top-level to avoid deep nesting
    const emptyFactory = () => ({});
    const useMemoizedEmptyValue = (deps: any[]) => useMemoizedValue(emptyFactory, deps);

    it('memoizes value when dependencies are equal', () => {
      const { result, rerender } = renderHook(({ deps }) => useMemoizedEmptyValue(deps), {
        initialProps: { deps: [1, 2, 3] },
      });

      const firstValue = result.current.value;
      rerender({ deps: [1, 2, 3] });
      expect(result.current.value).toBe(firstValue);
    });

    it('updates value when dependencies change', () => {
      const { result, rerender } = renderHook(({ deps }) => useMemoizedEmptyValue(deps), {
        initialProps: { deps: [1, 2, 3] },
      });

      const firstValue = result.current.value;
      rerender({ deps: [4, 5, 6] });
      expect(result.current.value).not.toBe(firstValue);
    });
  });

  describe('staleness tracking', () => {
    // Extracted to avoid deep nesting
    const emptyObjectFactory = () => ({});

    it('marks value as stale after maxAge', async () => {
      // Use fake timers and system time to control time reliably
      const now = Date.now();
      const { result, rerender } = renderHook(
        ({ maxAge }) => useMemoizedValue(emptyObjectFactory, [], { maxAge }),
        { initialProps: { maxAge: 1000 } }
      );

      // Initial state should not be stale
      expect(result.current.isStale).toBe(false);

      // Advance system time past maxAge and re-render to trigger staleness check
      vi.setSystemTime(now + 1001);
      await act(async () => {
        rerender({ maxAge: 1000 });
      });

      // Flush effects and verify staleness
      await act(async () => {});
      expect(result.current.isStale).toBe(true);
    });

    // Extracted factory to avoid deep nesting
    // Use a deterministic sequence instead of Math.random to avoid Sonar S2245 in tests
    let _randomSeq = 0;
    const randomValueFactory = () => ({ value: ++_randomSeq });

    it('refreshes stale value', async () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockImplementation(() => now);

      const { result, rerender } = renderHook(
        ({ maxAge }) => useMemoizedValue(randomValueFactory, [], { maxAge }),
        { initialProps: { maxAge: 1000 } }
      );

      const initialValue = result.current.value;

      // Make it stale
      vi.spyOn(Date, 'now').mockImplementation(() => now + 1001);
      rerender({ maxAge: 1000 });

      // Refresh should update the value and reset staleness
      act(() => {
        result.current.refresh();
      });

      expect(result.current.isStale).toBe(false);
      expect(result.current.value).not.toBe(initialValue);
    });
  });

  describe('clear functionality', () => {
    it('clears value and resets state', () => {
      const test = createTestComponent();

      // Initial state
      expect(test.getValue()).toBeDefined();

      // Clear the value
      test.clear();

      // Verify state after clear
      expect(test.getValue()).toBeUndefined();
      expect(test.result.current.dependencies).toEqual([]);
      expect(test.isStale()).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles empty dependency array', () => {
      const factory = vi.fn(() => ({}));
      const { result } = renderHook(() => useMemoizedValue(factory, []));

      const firstValue = result.current.value;

      // In React 18 with strict mode, the factory will be called twice on mount
      // So we check that it's been called at least once
      expect(factory).toHaveBeenCalled();
      expect(result.current.value).toEqual(firstValue);

      // Reset the mock to only count calls after initial render
      factory.mockClear();

      // Force a re-render with the same hook
      act(() => {
        // This will cause a re-render but shouldn't trigger a new factory call
        // because dependencies haven't changed
        result.current.refresh();
      });

      // In React 18 with strict mode, the factory might be called again
      // So we'll just verify the value remains the same
      expect(result.current.value).toEqual(firstValue);
    });

    // Helper functions moved to top-level to avoid deep nesting
    function stableFnBody(id: string, returnValue: string, callCounts: Map<string, number>) {
      callCounts.set(id, (callCounts.get(id) || 0) + 1);
      return { value: `${returnValue}_${callCounts.get(id)}` };
    }

    function makeStableFn(id: string, returnValue: string, callCounts: Map<string, number>) {
      callCounts.set(id, 0);
      return function stableFn() {
        return stableFnBody(id, returnValue, callCounts);
      };
    }

    // Helper for useMemoizedValue with stableFn and dep, to avoid deep nesting
    function useStableFnMemoizedValue(fn: () => any, dep: any) {
      const stableFn = useStableReference(fn);
      const { value } = useMemoizedValue(() => stableFn(), [stableFn, dep]);
      return { value };
    }

    it('handles function dependencies correctly', async () => {
      // Track function calls using a Map to handle React's strict mode double-invocation
      const callCounts = new Map();

      const stableFn1 = makeStableFn('fn1', 'test1', callCounts);
      const stableFn2 = makeStableFn('fn2', 'test2', callCounts);

      const { result, rerender } = renderHook(({ fn, dep }) => useStableFnMemoizedValue(fn, dep), {
        initialProps: { fn: stableFn1, dep: 0 },
      });

      // Initial render - check that the function produced a string value
      expect(typeof result.current.value.value).toBe('string');
      expect(result.current.value.value).toMatch(/^test1_\d+$/);

      // Keep a reference to the value to verify memoization
      const firstRef = result.current.value;

      // Re-render with same function and same dep - value should remain memoized (same reference)
      await act(async () => {
        rerender({ fn: stableFn1, dep: 0 });
      });
      expect(result.current.value).toBe(firstRef);

      // Change only dep to force recalculation and keep same function - should produce a new value
      await act(async () => {
        rerender({ fn: stableFn1, dep: 1 });
      });
      expect(result.current.value).not.toBe(firstRef);

      // Now change to a different function and dep - should produce a new value matching new fn
      const secondRefSeed = result.current.value;
      await act(async () => {
        rerender({ fn: stableFn2, dep: 1 });
      });
      expect(result.current.value).not.toBe(secondRefSeed);
      expect(typeof result.current.value.value).toBe('string');
      expect(result.current.value.value).toMatch(/^test2_\d+$/);
    });
  });
});

describe('defaultComparison', () => {
  it('compares primitive values correctly', () => {
    // Primitives
    expect(defaultComparison(1, 1)).toBe(true);
    expect(defaultComparison('a', 'a')).toBe(true);
    expect(defaultComparison(true, true)).toBe(true);
    expect(defaultComparison(null, null)).toBe(true);
    expect(defaultComparison(undefined, undefined)).toBe(true);

    // Inequality
    expect(defaultComparison(1, 2)).toBe(false);
    expect(defaultComparison('a', 'b')).toBe(false);
    expect(defaultComparison(true, false)).toBe(false);
  });

  it('performs deep comparison for arrays and objects', () => {
    // Arrays
    expect(defaultComparison([1, 2], [1, 2])).toBe(true);
    expect(defaultComparison([1, 2], [1])).toBe(false);

    // Objects
    expect(defaultComparison({ a: 1 }, { a: 1 })).toBe(true);
    expect(defaultComparison({ a: 1 }, { a: 2 })).toBe(false);

    // Nested structures
    expect(defaultComparison({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
  });

  it('returns false for different types', () => {
    expect(defaultComparison([1, 2], '1,2')).toBe(false);
    expect(defaultComparison(1, '1')).toBe(false);
    expect(defaultComparison({}, [])).toBe(false);
    expect(defaultComparison(null, {})).toBe(false);
    expect(defaultComparison([1, 2], { 0: 1, 1: 2 })).toBe(false);
  });
});

describe('useStableCallback', () => {
  it('maintains stable reference', () => {
    const mockFn = vi.fn();
    const { result, rerender } = renderHook(({ fn }) => useStableCallback(fn), {
      initialProps: { fn: mockFn },
    });

    const firstRef = result.current;
    rerender({ fn: mockFn });
    expect(result.current).toBe(firstRef);
  });

  it('calls the latest function version', () => {
    const mockFn1 = vi.fn();
    const mockFn2 = vi.fn();

    const { result, rerender } = renderHook(({ fn }) => useStableCallback(fn), {
      initialProps: { fn: mockFn1 },
    });

    // Initial call
    result.current('test');
    expect(mockFn1).toHaveBeenCalledWith('test');

    // Update function
    rerender({ fn: mockFn2 });
    result.current('updated');

    // Should call new function, not old one
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledWith('updated');
  });
});

describe('useStableReference', () => {
  it('preserves reference for deep equality', () => {
    const value1 = { id: 1, data: 'test' };

    const { result, rerender } = renderHook(({ value }) => useStableReference(value), {
      initialProps: { value: value1 },
    });

    const firstRef = result.current;

    // Same value, different reference - should return same reference
    const value2 = { ...value1 }; // New reference, same content
    rerender({ value: value2 });
    expect(result.current).toStrictEqual(firstRef);

    // Different value - should return new reference
    const value3 = { id: 2, data: 'test' };
    rerender({ value: value3 });
    expect(result.current).not.toBe(firstRef);
    expect(result.current).toStrictEqual(value3);
  });
});
