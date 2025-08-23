import { useMemo, useCallback, useRef, useEffect, useReducer } from 'react';

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
        value: undefined as T,
        dependencies: [],
        lastUpdate: 0,
        isStale: false,
      };
    default:
      return state;
  }
}

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
  });

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

  // Check if value is stale
  const isStale = useMemo(() => {
    return Date.now() - state.lastUpdate > maxAge;
  }, [state.lastUpdate, maxAge]);

  // Memoize value with dependencies
  const memoizedValue = useMemo(() => {
    if (dependenciesChanged) {
      const newValue = factoryRef.current();
      dispatch({
        type: 'UPDATE_VALUE',
        payload: { value: newValue, dependencies, lastUpdate: Date.now() },
      });
      return newValue;
    }
    return state.value;
  }, [dependencies, dependenciesChanged, state.value]);

  // Update stale status
  useEffect(() => {
    if (isStale !== state.isStale) {
      dispatch({ type: 'SET_STALE', payload: isStale });
    }
  }, [isStale, state.isStale]);

  // Refresh function
  const refresh = useCallback(() => {
    const newValue = factoryRef.current();
    dispatch({
      type: 'UPDATE_VALUE',
      payload: { value: newValue, dependencies, lastUpdate: Date.now() },
    });
  }, [dependencies]);

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
