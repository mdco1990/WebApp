import { useMemo, useCallback, useRef, useEffect, useReducer } from 'react';
import { MemoizationOptions, defaultComparison } from './useMemoizedValueBasic';

// ============================================================================
// CALCULATION MEMOIZATION HOOKS
// ============================================================================

// Calculation options extending basic memoization
export type CalculationOptions = MemoizationOptions & {
  enableCache?: boolean;
  cacheSize?: number;
  enableProfiling?: boolean;
};

// Hook return type for calculation memoization
export type UseMemoizedCalculationReturn<T> = {
  value: T;
  dependencies: Array<unknown>;
  isStale: boolean;
  refresh: () => void;
  clear: () => void;
  executionTime: number;
  cacheHits: number;
  cacheMisses: number;
};

// Calculation state
type CalculationState<T> = {
  value: T;
  dependencies: Array<unknown>;
  lastUpdate: number;
  isStale: boolean;
  executionTime: number;
  cacheHits: number;
  cacheMisses: number;
};

// Calculation actions
type CalculationAction<T> =
  | { type: 'UPDATE_VALUE'; payload: { value: T; dependencies: Array<unknown>; lastUpdate: number; executionTime: number } }
  | { type: 'SET_STALE'; payload: boolean }
  | { type: 'CLEAR' }
  | { type: 'INCREMENT_CACHE_HITS' }
  | { type: 'INCREMENT_CACHE_MISSES' };

// Calculation reducer
function calculationReducer<T>(state: CalculationState<T>, action: CalculationAction<T>): CalculationState<T> {
  switch (action.type) {
    case 'UPDATE_VALUE':
      return {
        ...state,
        value: action.payload.value,
        dependencies: action.payload.dependencies,
        lastUpdate: action.payload.lastUpdate,
        executionTime: action.payload.executionTime,
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
        executionTime: 0,
        cacheHits: 0,
        cacheMisses: 0,
      };
    case 'INCREMENT_CACHE_HITS':
      return { ...state, cacheHits: state.cacheHits + 1 };
    case 'INCREMENT_CACHE_MISSES':
      return { ...state, cacheMisses: state.cacheMisses + 1 };
    default:
      return state;
  }
}

// Calculation memoization hook with performance tracking
export function useMemoizedCalculation<T>(
  factory: () => T,
  dependencies: Array<unknown>,
  options: CalculationOptions = {}
): UseMemoizedCalculationReturn<T> {
  const {
    maxAge = 5 * 60 * 1000, // 5 minutes default
    comparisonFn = defaultComparison,
    enableProfiling = false,
  } = options;

  const [state, dispatch] = useReducer(calculationReducer<T>, {
    value: factory(),
    dependencies: dependencies,
    lastUpdate: Date.now(),
    isStale: false,
    executionTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
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
      const startTime = enableProfiling ? performance.now() : 0;
      const newValue = factoryRef.current();
      const executionTime = enableProfiling ? performance.now() - startTime : 0;
      
      dispatch({
        type: 'UPDATE_VALUE',
        payload: { value: newValue, dependencies, lastUpdate: Date.now(), executionTime },
      });
      
      if (enableProfiling) {
        dispatch({ type: 'INCREMENT_CACHE_MISSES' });
      }
      
      return newValue;
    } else {
      if (enableProfiling) {
        dispatch({ type: 'INCREMENT_CACHE_HITS' });
      }
    }
    return state.value;
  }, [dependencies, dependenciesChanged, state.value, enableProfiling]);

  // Update stale status
  useEffect(() => {
    if (isStale !== state.isStale) {
      dispatch({ type: 'SET_STALE', payload: isStale });
    }
  }, [isStale, state.isStale]);

  // Refresh function
  const refresh = useCallback(() => {
    const startTime = enableProfiling ? performance.now() : 0;
    const newValue = factoryRef.current();
    const executionTime = enableProfiling ? performance.now() - startTime : 0;
    
    dispatch({
      type: 'UPDATE_VALUE',
      payload: { value: newValue, dependencies, lastUpdate: Date.now(), executionTime },
    });
  }, [dependencies, enableProfiling]);

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
    executionTime: state.executionTime,
    cacheHits: state.cacheHits,
    cacheMisses: state.cacheMisses,
  };
}
