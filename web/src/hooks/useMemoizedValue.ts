import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// Types for memoization options
interface MemoizationOptions<T> {
  maxAge?: number;
  compareFn?: (prev: T, current: T) => boolean;
  cacheSize?: number;
}

// Performance metrics interface
interface PerformanceMetrics {
  memoizationHits: number;
  memoizationMisses: number;
  averageComputeTime: number;
  lastComputeTime: number;
}

/**
 * Core hook for memoizing values with custom comparison and caching
 */
export function useMemoizedValue<T>(
  value: T,
  dependencies: React.DependencyList,
  options: MemoizationOptions<T> = {}
): T {
  const { compareFn, maxAge = 10000 } = options;
  const prevValueRef = useRef<T>(value);
  const prevDepsRef = useRef<React.DependencyList>(dependencies);
  const lastUpdateRef = useRef<number>(Date.now());
  const [memoizedValue, setMemoizedValue] = useState<T>(value);

  // Memoize the comparison function to prevent unnecessary re-renders
  const stableCompareFn = useCallback((prev: T, current: T) => {
    if (compareFn) {
      return compareFn(prev, current);
    }
    return prev === current;
  }, [compareFn]);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    
    // Check if dependencies have changed
    const depsChanged = dependencies.some((dep, index) => 
      prevDepsRef.current[index] !== dep
    );
    
    // Check if value has changed using custom comparison
    const valueChanged = !stableCompareFn(prevValueRef.current, value);
    
    // Check if max age has been exceeded
    const ageExceeded = timeSinceLastUpdate > maxAge;
    
    if (depsChanged || valueChanged || ageExceeded) {
      setMemoizedValue(value);
      prevValueRef.current = value;
      prevDepsRef.current = [...dependencies];
      lastUpdateRef.current = now;
    }
  }, [value, dependencies, stableCompareFn, maxAge]);

  return memoizedValue;
}

/**
 * Hook for memoizing API calls with authentication strategy support
 */
export function useMemoizedApiCall<T>(
  apiCall: () => Promise<T>,
  dependencies: React.DependencyList,
  authStrategy: 'session' | 'token' = 'session',
  options: MemoizationOptions<T> = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const memoizedApiCall = useMemoizedValue(
    apiCall as T,
    [authStrategy, ...dependencies],
    options
  );

  const executeCall = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await (memoizedApiCall as () => Promise<T>)();
      setData(result);
      setLastFetch(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [memoizedApiCall]);

  return {
    data,
    loading,
    error,
    executeCall,
    lastFetch,
  };
}

/**
 * Hook for memoizing expensive calculations with caching
 */
export function useMemoizedCalculation<T, R>(
  calculation: (input: T) => R,
  input: T,
  dependencies: React.DependencyList,
  options: MemoizationOptions<R> = {}
): R {
  const cache = useRef<Map<string, { result: R; timestamp: number }>>(new Map());
  const { maxAge = 10000 } = options;

  return useMemo(() => {
    const cacheKey = JSON.stringify(input);
    const cached = cache.current.get(cacheKey);
    const now = Date.now();

    // Check if we have a valid cached result
    if (cached && (now - cached.timestamp) < maxAge) {
      return cached.result;
    }

    // Perform calculation and cache result
    const result = calculation(input);
    cache.current.set(cacheKey, { result, timestamp: now });

    // Clean up old cache entries
    if (cache.current.size > 100) {
      const entries = Array.from(cache.current.entries());
      const sortedEntries = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = sortedEntries.slice(0, 50);
      toDelete.forEach(([key]) => cache.current.delete(key));
    }

    return result;
  }, [calculation, input, maxAge]);
}

/**
 * Hook for memoizing filtered and sorted data
 */
export function useMemoizedData<T extends Record<string, unknown>>(
  data: T[],
  filters: {
    search?: string;
    category?: string;
    minAmount?: number;
    maxAmount?: number;
    sortBy?: keyof T;
    sortOrder?: 'asc' | 'desc';
  },
  dependencies: React.DependencyList = []
): T[] {
  return useMemoizedCalculation(
    (input: { data: T[]; filters: typeof filters }) => {
      const { data: initialItems, filters: filterConfig } = input;
      let items = [...initialItems];
      
      // Apply search filter
      if (filterConfig.search) {
        const searchLower = filterConfig.search.toLowerCase();
        items = items.filter(item => 
          Object.values(item).some(value => 
            String(value).toLowerCase().includes(searchLower)
          )
        );
      }

      // Apply category filter
      if (filterConfig.category) {
        items = items.filter(item => 
          (item as Record<string, unknown>).category === filterConfig.category
        );
      }

      // Apply amount filters
      if (filterConfig.minAmount !== undefined) {
        items = items.filter(item => {
          const amount = (item as Record<string, unknown>).amount_cents;
          return typeof amount === 'number' && amount >= filterConfig.minAmount!;
        });
      }

      if (filterConfig.maxAmount !== undefined) {
        items = items.filter(item => {
          const amount = (item as Record<string, unknown>).amount_cents;
          return typeof amount === 'number' && amount <= filterConfig.maxAmount!;
        });
      }

      // Apply sorting
      if (filterConfig.sortBy) {
        items = [...items].sort((a, b) => {
          const aVal = (a as Record<string, unknown>)[filterConfig.sortBy as string];
          const bVal = (b as Record<string, unknown>)[filterConfig.sortBy as string];
          
          // Type guard for comparison
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            if (aVal < bVal) return filterConfig.sortOrder === 'desc' ? 1 : -1;
            if (aVal > bVal) return filterConfig.sortOrder === 'desc' ? -1 : 1;
          } else if (typeof aVal === 'string' && typeof bVal === 'string') {
            if (aVal < bVal) return filterConfig.sortOrder === 'desc' ? 1 : -1;
            if (aVal > bVal) return filterConfig.sortOrder === 'desc' ? -1 : 1;
          }
          return 0;
        });
      }

      return items;
    },
    { data, filters },
    dependencies
  );
}

/**
 * Hook for memoizing computed values with performance tracking
 */
export function useMemoizedComputed<T>(
  computeFn: () => T,
  dependencies: React.DependencyList,
  _options: MemoizationOptions<T> = {}
): { value: T; metrics: PerformanceMetrics } {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memoizationHits: 0,
    memoizationMisses: 0,
    averageComputeTime: 0,
    lastComputeTime: 0,
  });

  const value = useMemo(() => {
    const startTime = performance.now();
    const result = computeFn();
    const computeTime = performance.now() - startTime;

    setMetrics(prev => ({
      ...prev,
      memoizationMisses: prev.memoizationMisses + 1,
      averageComputeTime: (prev.averageComputeTime + computeTime) / 2,
      lastComputeTime: computeTime,
    }));

    return result;
  }, [computeFn]);

  return { value, metrics };
}

/**
 * Hook for memoizing expensive object transformations
 */
export function useMemoizedTransform<T extends R, R>(
  transform: (input: T) => R,
  input: T,
  _dependencies: React.DependencyList = [],
  options: MemoizationOptions<R> = {}
): R {
  const { compareFn } = options;
  const prevInputRef = useRef<T>(input);
  const prevResultRef = useRef<R | null>(null);

  return useMemo(() => {
    // If we have a custom comparison function and previous result
    if (compareFn && prevResultRef.current !== null) {
      if (compareFn(prevInputRef.current, input)) {
        return prevResultRef.current;
      }
    }

    const result = transform(input);
    prevInputRef.current = input;
    prevResultRef.current = result;

    return result;
  }, [transform, input, compareFn]);
}

/**
 * Hook for memoizing async operations with caching
 */
export function useMemoizedAsync<T>(
  asyncFn: () => Promise<T>,
  dependencies: React.DependencyList,
  options: MemoizationOptions<T> = {}
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const cache = useRef<Map<string, { data: T; timestamp: number }>>(new Map());
  const { maxAge = 30000 } = options;

  const memoizedAsyncFn = useMemoizedValue(
    asyncFn as T,
    dependencies,
    options
  );

  const execute = useCallback(async () => {
    const cacheKey = JSON.stringify(dependencies);
    const cached = cache.current.get(cacheKey);
    const now = Date.now();

    // Check cache first
    if (cached && (now - cached.timestamp) < maxAge) {
      setData(cached.data);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await (memoizedAsyncFn as () => Promise<T>)();
      setData(result);
      cache.current.set(cacheKey, { data: result, timestamp: now });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [memoizedAsyncFn, dependencies, maxAge]);

  // Execute on mount and when dependencies change
  useEffect(() => {
    execute();
  }, [execute]);

  return {
    data,
    loading,
    error,
    refetch: execute,
  };
}

/**
 * Hook for memoizing list operations with pagination support
 */
export function useMemoizedList<T>(
  items: T[],
  pageSize: number = 10,
  _dependencies: React.DependencyList = []
): {
  paginatedItems: T[];
  totalPages: number;
  currentPage: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
} {
  const [currentPage, setCurrentPage] = useState(1);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, pageSize, currentPage]);

  const totalPages = useMemo(() => Math.ceil(items.length / pageSize), [items, pageSize]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  }, []);

  // Reset to first page when items change
  useEffect(() => {
    setCurrentPage(1);
  }, [items, pageSize]);

  return {
    paginatedItems,
    totalPages,
    currentPage,
    goToPage,
    nextPage,
    prevPage,
  };
}

/**
 * Hook for memoizing comparison operations
 */
export function useMemoizedComparison<T>(
  value: T,
  compareWith: T,
  _dependencies: React.DependencyList = []
): boolean {
  return useMemo(() => {
    return value === compareWith;
  }, [value, compareWith]);
}

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<{
    renderCount: number;
    averageRenderTime: number;
    lastRenderTime: number;
  }>({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
  });

  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const renderTime = performance.now() - startTime;
      setMetrics(prev => ({
        renderCount: prev.renderCount + 1,
        averageRenderTime: (prev.averageRenderTime + renderTime) / 2,
        lastRenderTime: renderTime,
      }));
    };
  });

  return metrics;
}