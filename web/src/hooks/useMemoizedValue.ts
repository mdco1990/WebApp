// Type-safe memoization hooks for performance optimization
// This file provides comprehensive memoization patterns with proper typing

import { useMemo, useCallback, useRef, useEffect, useReducer } from 'react';

// ============================================================================
// BASIC MEMOIZATION HOOKS
// ============================================================================

// Hook return type for basic memoization
export type UseMemoizedValueReturn<T> = {
  value: T;
  dependencies: any[];
  isStale: boolean;
  refresh: () => void;
  clear: () => void;
};

// Basic memoization hook with dependency tracking
export function useMemoizedValue<T>(
  factory: () => T,
  dependencies: any[],
  options: MemoizationOptions = {}
): UseMemoizedValueReturn<T> {
  const {
    maxAge = 5 * 60 * 1000, // 5 minutes default
    comparisonFn = defaultComparison,
    enableStaleWhileRevalidate = false,
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
  }, [dependencies, dependenciesChanged]);

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

// Memoization options
export type MemoizationOptions = {
  maxAge?: number; // Maximum age in milliseconds
  comparisonFn?: (a: any, b: any) => boolean; // Custom comparison function
  enableStaleWhileRevalidate?: boolean; // Allow stale values while refreshing
  cacheKey?: string; // Custom cache key
};

// Default comparison function
function defaultComparison(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => defaultComparison(item, b[index]));
    }
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => defaultComparison(a[key], b[key]));
  }
  
  return false;
}

// Memoization state
type MemoizationState<T> = {
  value: T;
  dependencies: any[];
  lastUpdate: number;
  isStale: boolean;
};

// Memoization actions
type MemoizationAction<T> =
  | { type: 'UPDATE_VALUE'; payload: { value: T; dependencies: any[]; lastUpdate: number } }
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
      return {
        ...state,
        isStale: action.payload,
      };
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

// ============================================================================
// ADVANCED MEMOIZATION HOOKS
// ============================================================================

// Hook for memoizing expensive calculations
export function useMemoizedCalculation<T>(
  calculation: () => T,
  dependencies: any[],
  options: CalculationOptions = {}
): UseMemoizedCalculationReturn<T> {
  const {
    maxAge = 10 * 60 * 1000, // 10 minutes for calculations
    enableBackgroundRefresh = true,
    refreshThreshold = 0.8, // Refresh when 80% of maxAge has passed
  } = options;

  const [state, dispatch] = useReducer(calculationReducer<T>, {
    value: calculation(),
    dependencies: dependencies,
    lastUpdate: Date.now(),
    isCalculating: false,
    error: null,
  });

  const calculationRef = useRef(calculation);
  const backgroundRefreshTimeoutRef = useRef<NodeJS.Timeout>();

  // Update ref when calculation changes
  useEffect(() => {
    calculationRef.current = calculation;
  }, [calculation]);

  // Check if dependencies have changed
  const dependenciesChanged = useMemo(() => {
    if (state.dependencies.length !== dependencies.length) return true;
    return dependencies.some((dep, index) => !defaultComparison(dep, state.dependencies[index]));
  }, [dependencies, state.dependencies]);

  // Check if value is stale
  const isStale = useMemo(() => {
    return Date.now() - state.lastUpdate > maxAge;
  }, [state.lastUpdate, maxAge]);

  // Check if refresh is needed
  const shouldRefresh = useMemo(() => {
    if (dependenciesChanged) return true;
    if (isStale) return true;
    
    const timeSinceUpdate = Date.now() - state.lastUpdate;
    return timeSinceUpdate > maxAge * refreshThreshold;
  }, [dependenciesChanged, isStale, state.lastUpdate, maxAge, refreshThreshold]);

  // Memoize value with dependencies
  const memoizedValue = useMemo(() => {
    if (dependenciesChanged) {
      try {
        const newValue = calculationRef.current();
        dispatch({
          type: 'CALCULATION_SUCCESS',
          payload: { value: newValue, dependencies, lastUpdate: Date.now() },
        });
        return newValue;
      } catch (error) {
        dispatch({
          type: 'CALCULATION_ERROR',
          payload: error as Error,
        });
        return state.value;
      }
    }
    return state.value;
  }, [dependencies, dependenciesChanged]);

  // Background refresh logic
  useEffect(() => {
    if (enableBackgroundRefresh && shouldRefresh && !state.isCalculating) {
      backgroundRefreshTimeoutRef.current = setTimeout(() => {
        dispatch({ type: 'START_CALCULATION' });
        
        try {
          const newValue = calculationRef.current();
          dispatch({
            type: 'CALCULATION_SUCCESS',
            payload: { value: newValue, dependencies, lastUpdate: Date.now() },
          });
        } catch (error) {
          dispatch({
            type: 'CALCULATION_ERROR',
            payload: error as Error,
          });
        }
      }, 100); // Small delay to avoid blocking UI
    }

    return () => {
      if (backgroundRefreshTimeoutRef.current) {
        clearTimeout(backgroundRefreshTimeoutRef.current);
      }
    };
  }, [shouldRefresh, state.isCalculating, enableBackgroundRefresh]);

  // Refresh function
  const refresh = useCallback(() => {
    dispatch({ type: 'START_CALCULATION' });
    
    try {
      const newValue = calculationRef.current();
      dispatch({
        type: 'CALCULATION_SUCCESS',
        payload: { value: newValue, dependencies, lastUpdate: Date.now() },
      });
    } catch (error) {
      dispatch({
        type: 'CALCULATION_ERROR',
        payload: error as Error,
      });
    }
  }, [dependencies]);

  // Clear function
  const clear = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  return {
    value: memoizedValue,
    dependencies: state.dependencies,
    isStale,
    isCalculating: state.isCalculating,
    error: state.error,
    refresh,
    clear,
  };
}

// Calculation options
export type CalculationOptions = {
  maxAge?: number;
  enableBackgroundRefresh?: boolean;
  refreshThreshold?: number; // 0.0 to 1.0
};

// Calculation hook return type
export type UseMemoizedCalculationReturn<T> = {
  value: T;
  dependencies: any[];
  isStale: boolean;
  isCalculating: boolean;
  error: Error | null;
  refresh: () => void;
  clear: () => void;
};

// Calculation state
type CalculationState<T> = {
  value: T;
  dependencies: any[];
  lastUpdate: number;
  isCalculating: boolean;
  error: Error | null;
};

// Calculation actions
type CalculationAction<T> =
  | { type: 'CALCULATION_SUCCESS'; payload: { value: T; dependencies: any[]; lastUpdate: number } }
  | { type: 'CALCULATION_ERROR'; payload: Error }
  | { type: 'START_CALCULATION' }
  | { type: 'CLEAR' };

// Calculation reducer
function calculationReducer<T>(
  state: CalculationState<T>,
  action: CalculationAction<T>
): CalculationState<T> {
  switch (action.type) {
    case 'CALCULATION_SUCCESS':
      return {
        ...state,
        value: action.payload.value,
        dependencies: action.payload.dependencies,
        lastUpdate: action.payload.lastUpdate,
        isCalculating: false,
        error: null,
      };
    case 'CALCULATION_ERROR':
      return {
        ...state,
        isCalculating: false,
        error: action.payload,
      };
    case 'START_CALCULATION':
      return {
        ...state,
        isCalculating: true,
        error: null,
      };
    case 'CLEAR':
      return {
        ...state,
        value: undefined as T,
        dependencies: [],
        lastUpdate: 0,
        isCalculating: false,
        error: null,
      };
    default:
      return state;
  }
}

// ============================================================================
// API MEMOIZATION HOOKS
// ============================================================================

// Hook for memoizing API calls
export function useMemoizedApiCall<T>(
  apiCall: () => Promise<T>,
  dependencies: any[],
  options: ApiMemoizationOptions = {}
): UseMemoizedApiCallReturn<T> {
  const {
    maxAge = 2 * 60 * 1000, // 2 minutes for API calls
    enableStaleWhileRevalidate = true,
    retryCount = 3,
    retryDelay = 1000,
  } = options;

  const [state, dispatch] = useReducer(apiCallReducer<T>, {
    value: null,
    dependencies: dependencies,
    lastUpdate: 0,
    isStale: false,
    isLoading: false,
    error: null,
    retryCount: 0,
  });

  const apiCallRef = useRef(apiCall);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // Update ref when apiCall changes
  useEffect(() => {
    apiCallRef.current = apiCall;
  }, [apiCall]);

  // Check if dependencies have changed
  const dependenciesChanged = useMemo(() => {
    if (state.dependencies.length !== dependencies.length) return true;
    return dependencies.some((dep, index) => !defaultComparison(dep, state.dependencies[index]));
  }, [dependencies, state.dependencies]);

  // Check if value is stale
  const isStale = useMemo(() => {
    if (state.lastUpdate === 0) return true;
    return Date.now() - state.lastUpdate > maxAge;
  }, [state.lastUpdate, maxAge]);

  // Memoize value with dependencies
  const memoizedValue = useMemo(() => {
    if (dependenciesChanged || state.value === null) {
      // Trigger API call
      if (!state.isLoading) {
        dispatch({ type: 'START_LOADING' });
        
        apiCallRef.current()
          .then(result => {
            dispatch({
              type: 'API_SUCCESS',
              payload: { value: result, dependencies, lastUpdate: Date.now() },
            });
          })
          .catch(error => {
            dispatch({
              type: 'API_ERROR',
              payload: error,
            });
          });
      }
      return state.value;
    }
    return state.value;
  }, [dependencies, dependenciesChanged, state.value, state.isLoading]);

  // Background refresh for stale data
  useEffect(() => {
    if (enableStaleWhileRevalidate && isStale && !state.isLoading && state.value !== null) {
      // Return stale value immediately, refresh in background
      dispatch({ type: 'START_LOADING' });
      
      apiCallRef.current()
        .then(result => {
          dispatch({
            type: 'API_SUCCESS',
            payload: { value: result, dependencies, lastUpdate: Date.now() },
          });
        })
        .catch(error => {
          dispatch({
            type: 'API_ERROR',
            payload: error,
          });
        });
    }
  }, [isStale, state.isLoading, state.value, enableStaleWhileRevalidate]);

  // Refresh function
  const refresh = useCallback(() => {
    dispatch({ type: 'START_LOADING' });
    
    apiCallRef.current()
      .then(result => {
        dispatch({
          type: 'API_SUCCESS',
          payload: { value: result, dependencies, lastUpdate: Date.now() },
        });
      })
      .catch(error => {
        dispatch({
          type: 'API_ERROR',
          payload: error,
        });
      });
  }, [dependencies]);

  // Retry function
  const retry = useCallback(() => {
    if (state.retryCount < retryCount) {
      dispatch({ type: 'INCREMENT_RETRY' });
      
      retryTimeoutRef.current = setTimeout(() => {
        refresh();
      }, retryDelay);
    }
  }, [state.retryCount, retryCount, retryDelay, refresh]);

  // Clear function
  const clear = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  // Cleanup retry timeout
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    value: memoizedValue,
    dependencies: state.dependencies,
    isStale,
    isLoading: state.isLoading,
    error: state.error,
    retryCount: state.retryCount,
    refresh,
    retry,
    clear,
  };
}

// API memoization options
export type ApiMemoizationOptions = {
  maxAge?: number;
  enableStaleWhileRevalidate?: boolean;
  retryCount?: number;
  retryDelay?: number;
};

// API call hook return type
export type UseMemoizedApiCallReturn<T> = {
  value: T | null;
  dependencies: any[];
  isStale: boolean;
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
  refresh: () => void;
  retry: () => void;
  clear: () => void;
};

// API call state
type ApiCallState<T> = {
  value: T | null;
  dependencies: any[];
  lastUpdate: number;
  isStale: boolean;
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
};

// API call actions
type ApiCallAction<T> =
  | { type: 'API_SUCCESS'; payload: { value: T; dependencies: any[]; lastUpdate: number } }
  | { type: 'API_ERROR'; payload: Error }
  | { type: 'START_LOADING' }
  | { type: 'INCREMENT_RETRY' }
  | { type: 'CLEAR' };

// API call reducer
function apiCallReducer<T>(
  state: ApiCallState<T>,
  action: ApiCallAction<T>
): ApiCallState<T> {
  switch (action.type) {
    case 'API_SUCCESS':
      return {
        ...state,
        value: action.payload.value,
        dependencies: action.payload.dependencies,
        lastUpdate: action.payload.lastUpdate,
        isStale: false,
        isLoading: false,
        error: null,
        retryCount: 0,
      };
    case 'API_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };
    case 'START_LOADING':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'INCREMENT_RETRY':
      return {
        ...state,
        retryCount: state.retryCount + 1,
      };
    case 'CLEAR':
      return {
        ...state,
        value: null,
        dependencies: [],
        lastUpdate: 0,
        isStale: false,
        isLoading: false,
        error: null,
        retryCount: 0,
      };
    default:
      return state;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Create a stable reference for objects
export function useStableReference<T>(value: T): T {
  const ref = useRef<T>(value);
  
  if (!defaultComparison(ref.current, value)) {
    ref.current = value;
  }
  
  return ref.current;
}

// Create a stable callback
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const ref = useRef<T>(callback);
  
  if (ref.current !== callback) {
    ref.current = callback;
  }
  
  return ref.current;
}

// Memoize with custom comparison function
export function useMemoWithComparison<T>(
  factory: () => T,
  dependencies: any[],
  comparisonFn: (a: any, b: any) => boolean
): T {
  const prevDepsRef = useRef<any[]>(dependencies);
  const valueRef = useRef<T>();
  
  const depsChanged = useMemo(() => {
    if (prevDepsRef.current.length !== dependencies.length) return true;
    return dependencies.some((dep, index) => !comparisonFn(dep, prevDepsRef.current[index]));
  }, [dependencies, comparisonFn]);
  
  if (depsChanged || valueRef.current === undefined) {
    valueRef.current = factory();
    prevDepsRef.current = dependencies;
  }
  
  return valueRef.current;
}

// ============================================================================
// EXPORT ALL HOOKS AND TYPES
// ============================================================================

export {
  useMemoizedValue,
  useMemoizedCalculation,
  useMemoizedApiCall,
  useStableReference,
  useStableCallback,
  useMemoWithComparison,
  defaultComparison,
};