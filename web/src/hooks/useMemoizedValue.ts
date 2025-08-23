// Type-safe memoization hooks for performance optimization
// This file provides comprehensive memoization patterns with proper typing

import { useMemo, useCallback, useRef, useEffect, useReducer } from 'react';

// ============================================================================
// BASIC MEMOIZATION HOOKS
// ============================================================================

// Hook return type for basic memoization
export type UseMemoizedValueReturn<T> = {
  value: T;
  dependencies: Array<unknown>;
  isStale: boolean;
  refresh: () => void;
  clear: () => void;
};

// Memoization options
export type MemoizationOptions = {
  maxAge?: number;
  comparisonFn?: (a: unknown, b: unknown) => boolean;
};

// Default comparison function
export const defaultComparison = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== (b as Array<unknown>).length) return false;
      return a.every((item, index) => defaultComparison(item, (b as Array<unknown>)[index]));
    }
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) =>
      defaultComparison((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
    );
  }
  return false;
};

// Memoization state
type MemoizationState<T> = {
  value: T;
  dependencies: Array<unknown>;
  lastUpdate: number;
  isStale: boolean;
};

// Memoization actions
type MemoizationAction<T> =
  | {
      type: 'UPDATE_VALUE';
      payload: { value: T; dependencies: Array<unknown>; lastUpdate: number };
    }
  | { type: 'SET_STALE'; payload: boolean }
  | { type: 'CLEAR' };

// Memoization reducer
function memoizationReducer<T>(
  state: MemoizationState<T>,
  action: MemoizationAction<T>
): MemoizationState<T> {
  switch (action.type) {
    case 'UPDATE_VALUE':
      return {
        ...state,
        value: action.payload.value,
        dependencies: action.payload.dependencies,
        lastUpdate: action.payload.lastUpdate,
        isStale: false,
      };
    case 'SET_STALE':
      return { ...state, isStale: action.payload };
    case 'CLEAR':
      return {
        ...state,
        // Intentionally set to undefined to indicate cleared state; caller tests expect undefined
        value: undefined as unknown as T,
        dependencies: [],
        lastUpdate: 0,
        isStale: false,
      };
    default:
      return state;
  }
}

// Test-only export to enable direct unit testing of reducer branches (e.g., default case)
export { memoizationReducer as __memoizationReducerForTest };

// Basic memoization hook with dependency tracking
export function useMemoizedValue<T>(
  factory: () => T,
  dependencies: Array<unknown>,
  options: MemoizationOptions = {}
): UseMemoizedValueReturn<T> {
  const {
    maxAge = 5 * 60 * 1000, // 5 minutes default
    comparisonFn = defaultComparison,
  } = options;

  const [state, dispatch] = useReducer(memoizationReducer<T>, {
    value: factory(),
    dependencies: dependencies,
    lastUpdate: Date.now(),
    isStale: false,
  } as MemoizationState<T>);

  const factoryRef = useRef(factory);
  const optionsRef = useRef(options);

  // Update refs when they change
  useEffect(() => {
    factoryRef.current = factory;
    optionsRef.current = options;
  });

  // Check if dependencies have changed
  const dependenciesChanged = useMemo(() => {
    if (state.dependencies.length !== dependencies.length) return true;
    return dependencies.some((dep, index) => !comparisonFn(dep, state.dependencies[index]));
  }, [dependencies, state.dependencies, comparisonFn]);

  // Check if value is stale (compute directly so changes in system time are observed on re-render)
  const isStale = Date.now() - state.lastUpdate > maxAge;

  // Memoize value with dependencies
  const memoizedValue = useMemo(() => {
    if (dependenciesChanged) {
      // Use the factory directly so we pick up the latest function from props during render
      const newValue = factory();
      dispatch({
        type: 'UPDATE_VALUE',
        payload: { value: newValue, dependencies, lastUpdate: Date.now() },
      });
      return newValue;
    }
    return state.value;
  }, [dependencies, dependenciesChanged, state.value, factory]);

  // Update stale status
  useEffect(() => {
    if (isStale !== state.isStale) {
      dispatch({ type: 'SET_STALE', payload: isStale });
    }
  }, [isStale, state.isStale]);

  // Refresh function
  const refresh = useCallback(() => {
    const newValue = factory();
    dispatch({
      type: 'UPDATE_VALUE',
      payload: { value: newValue, dependencies, lastUpdate: Date.now() },
    });
  }, [dependencies, factory]);

  // Clear function
  const clear = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  return {
    value: memoizedValue,
    dependencies: state.dependencies,
    isStale,
    refresh,
    clear,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

// Hook for maintaining stable references
export function useStableReference<T>(value: T): T {
  const ref = useRef<T>(value);
  if (!Object.is(ref.current, value)) {
    ref.current = value;
  }
  return ref.current;
}

// Hook for maintaining stable callbacks
export function useStableCallback<T extends (...args: Array<unknown>) => unknown>(callback: T): T {
  const ref = useRef<T>(callback);
  ref.current = callback;
  return useCallback((...args: Parameters<T>) => ref.current(...args), []) as T;
}
