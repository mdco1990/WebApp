import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { FetchState, createInitialFetchState } from '../types/state';

// API request options
export type UseApiOptions<TBody = never, TData = unknown> = {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: TBody;
  headers?: Record<string, string>;
  cache?: boolean;
  cacheTime?: number; // milliseconds
  retryCount?: number;
  retryDelay?: number; // milliseconds
  timeout?: number; // milliseconds
  onSuccess?: (data: TData) => void;
  onError?: (error: string) => void;
  transformResponse?: (response: unknown) => TData;
  transformError?: (error: unknown) => string;
};

// API response type
export type ApiResponse<T> = {
  data: T;
  message?: string;
  success: boolean;
  timestamp: string;
  statusCode: number;
};

// Cache entry type
type CacheEntry<T> = {
  data: T;
  timestamp: number;
  expiresAt: number;
};

// Cache storage
const apiCache = new Map<string, CacheEntry<unknown>>();

// Hook return type
export type UseApiReturn<TData, TBody = never> = {
  data: TData | null;
  loading: boolean;
  error: string | null;
  state: FetchState<TData>;
  refetch: () => Promise<void>;
  mutate: (data: TData) => void;
  clearError: () => void;
  reset: () => Promise<void>;
  executeRequest: (requestOptions: UseApiOptions<TBody>) => Promise<void>;
  // Request methods
  get: (url?: string, options?: Partial<UseApiOptions<TBody>>) => Promise<void>;
  post: (url?: string, body?: TBody, options?: Partial<UseApiOptions<TBody>>) => Promise<void>;
  put: (url?: string, body?: TBody, options?: Partial<UseApiOptions<TBody>>) => Promise<void>;
  delete: (url?: string, options?: Partial<UseApiOptions<TBody>>) => Promise<void>;
  patch: (url?: string, body?: TBody, options?: Partial<UseApiOptions<TBody>>) => Promise<void>;
};

// Default options
const defaultOptions: Required<UseApiOptions<unknown, unknown>> = {
  url: '',
  method: 'GET',
  body: undefined,
  headers: {},
  cache: false,
  cacheTime: 5 * 60 * 1000, // 5 minutes
  retryCount: 0,
  retryDelay: 1000, // 1 second
  timeout: 30000, // 30 seconds
  onSuccess: () => {},
  onError: () => {},
  transformResponse: (data) => data,
  transformError: (error: unknown) =>
    typeof error === 'object' && error && 'message' in error
      ? (error as { message?: string }).message || 'An error occurred'
      : String(error) || 'An error occurred',
};

// Main useApi hook
export function useApi<TData = unknown, TBody = never>(
  initialOptions: UseApiOptions<TBody> = { url: '' }
): UseApiReturn<TData, TBody> {
  const options = useMemo(() => ({ ...defaultOptions, ...initialOptions }), [initialOptions]);

  const [state, setState] = useState<FetchState<TData>>(createInitialFetchState<TData>());
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const cacheKeyRef = useRef<string>('');

  // Generate cache key
  const generateCacheKey = useCallback((url: string, method: string, body?: unknown) => {
    return `${method}:${url}:${body ? JSON.stringify(body) : ''}`;
  }, []);

  // Clear cache entry
  const clearCache = useCallback((key: string) => {
    apiCache.delete(key);
  }, []);

  // Get from cache
  const getFromCache = useCallback(
    (key: string): TData | null => {
      const entry = apiCache.get(key);
      if (!entry) return null;

      if (Date.now() > entry.expiresAt) {
        clearCache(key);
        return null;
      }

      return entry.data as TData;
    },
    [clearCache]
  );

  // Set cache entry
  const setCache = useCallback((key: string, data: TData, cacheTime: number) => {
    const expiresAt = Date.now() + cacheTime;
    apiCache.set(key, { data, timestamp: Date.now(), expiresAt });
  }, []);

  // Make API request
  const makeRequest = useCallback(
    async (requestOptions: UseApiOptions<TBody>): Promise<TData> => {
      const {
        url,
        method,
        body,
        headers,
        cache,
        cacheTime,
        timeout,
        transformResponse,
        transformError,
      } = { ...options, ...requestOptions };

      // Check cache first
      if (cache && method === 'GET') {
        const cacheKey = generateCacheKey(url, method);
        cacheKeyRef.current = cacheKey;
        const cachedData = getFromCache(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }

      // Create abort controller for timeout
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Create timeout
      const timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, timeout);

      try {
        const requestHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          ...headers,
        };

        const requestBody = body ? JSON.stringify(body) : undefined;

        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: requestBody,
          signal: abortControllerRef.current.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json();

        // Transform response
        const transformedData = transformResponse(responseData) as TData;

        // Cache the response if caching is enabled
        if (cache && method === 'GET') {
          setCache(cacheKeyRef.current, transformedData, cacheTime);
        }

        return transformedData;
      } catch (err) {
        clearTimeout(timeoutId);

        // Handle abort (timeout or manual cancellation)
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error('Request timeout');
        }

        // Transform error
        const errorMessage = transformError(err);
        throw new Error(errorMessage);
      }
    },
    [options, generateCacheKey, getFromCache, setCache]
  );

  // Execute request with retry logic
  const executeRequest = useCallback(
    async (requestOptions: UseApiOptions<TBody>): Promise<void> => {
      try {
        setLoading(true);
        setError(null);
        setState({ status: 'loading' });

        const result = await makeRequest(requestOptions);

        setData(result);
        setState({ status: 'success', data: result });
        options.onSuccess?.(result);

        // Reset retry count on success
        retryCountRef.current = 0;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';

        // Retry logic
        if (retryCountRef.current < options.retryCount) {
          retryCountRef.current++;

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, options.retryDelay));

          // Retry the request
          return executeRequest(requestOptions);
        }

        setError(errorMessage);
        setState({ status: 'error', error: errorMessage });
        options.onError?.(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [makeRequest, options]
  );

  // Request methods
  const get = useCallback(
    async (url?: string, options?: Partial<UseApiOptions<TBody>>) => {
      await executeRequest({
        ...options,
        url: url || options?.url || '',
        method: 'GET',
      });
    },
    [executeRequest]
  );

  const post = useCallback(
    async (url?: string, body?: TBody, options?: Partial<UseApiOptions<TBody>>) => {
      await executeRequest({
        ...options,
        url: url || options?.url || '',
        method: 'POST',
        body: body ?? options?.body,
      });
    },
    [executeRequest]
  );

  const put = useCallback(
    async (url?: string, body?: TBody, options?: Partial<UseApiOptions<TBody>>) => {
      await executeRequest({
        ...options,
        url: url || options?.url || '',
        method: 'PUT',
        body: body ?? options?.body,
      });
    },
    [executeRequest]
  );

  const deleteMethod = useCallback(
    async (url?: string, options?: Partial<UseApiOptions<TBody>>) => {
      await executeRequest({
        ...options,
        url: url || options?.url || '',
        method: 'DELETE',
      });
    },
    [executeRequest]
  );

  const patch = useCallback(
    async (url?: string, body?: TBody, options?: Partial<UseApiOptions<TBody>>) => {
      await executeRequest({
        ...options,
        url: url || options?.url || '',
        method: 'PATCH',
        body: body ?? options?.body,
      });
    },
    [executeRequest]
  );

  // Utility methods
  const refetch = useCallback(async () => {
    if (options.url) {
      // Cast body to TBody to satisfy type constraint
      await executeRequest({ ...options, body: options.body as TBody });
    }
  }, [executeRequest, options]);

  const mutate = useCallback(
    (newData: TData) => {
      setData(newData);
      setState({ status: 'success', data: newData });

      // Update cache if caching is enabled
      if (options.cache && cacheKeyRef.current) {
        setCache(cacheKeyRef.current, newData, options.cacheTime);
      }
    },
    [options.cache, options.cacheTime, setCache]
  );

  const clearError = useCallback(() => {
    setError(null);
    setState((prev) => (prev.status === 'error' ? { status: 'idle' } : prev));
  }, []);

  const reset = useCallback(async () => {
    setData(null);
    setError(null);
    setState({ status: 'idle' });
    setLoading(false);
    retryCountRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Auto-execute on mount if URL is provided
  useEffect(() => {
    if (options.url && options.method === 'GET') {
      // Cast body to TBody to satisfy type constraint
      executeRequest({ ...options, body: options.body as TBody });
    }
  }, [options, executeRequest]);

  return {
    data,
    loading,
    error,
    state,
    refetch,
    mutate,
    clearError,
    reset,
    get,
    post,
    put,
    delete: deleteMethod,
    patch,
    executeRequest,
  };
}

// Specialized hooks for common HTTP methods
export function useGet<TData = unknown>(url: string, options?: Partial<UseApiOptions>) {
  return useApi<TData>({ ...options, url, method: 'GET' });
}

export function usePost<TData = unknown, TBody = unknown>(
  url: string,
  options?: Partial<UseApiOptions<TBody>>
) {
  return useApi<TData, TBody>({ ...options, url, method: 'POST' });
}

export function usePut<TData = unknown, TBody = unknown>(
  url: string,
  options?: Partial<UseApiOptions<TBody>>
) {
  return useApi<TData, TBody>({ ...options, url, method: 'PUT' });
}

export function useDelete<TData = unknown>(url: string, options?: Partial<UseApiOptions>) {
  return useApi<TData>({ ...options, url, method: 'DELETE' });
}

export function usePatch<TData = unknown, TBody = unknown>(
  url: string,
  options?: Partial<UseApiOptions<TBody>>
) {
  return useApi<TData, TBody>({ ...options, url, method: 'PATCH' });
}

// Hook for optimistic updates
export function useOptimisticApi<TData = unknown, TBody = never>(
  options: UseApiOptions<TBody> = { url: '' }
) {
  const api = useApi<TData, TBody>(options);

  const optimisticUpdate = useCallback(
    async (optimisticData: TData, requestOptions: UseApiOptions<TBody>) => {
      // Set optimistic data immediately
      api.mutate(optimisticData);

      try {
        // Make the actual request
        await api.executeRequest(requestOptions);
      } catch (error) {
        // Revert on error
        api.reset();
        throw error;
      }
    },
    [api]
  );

  return {
    ...api,
    optimisticUpdate,
  };
}

// Hook for infinite queries (pagination)
export function useInfiniteApi<TData = unknown, TBody = never>(
  options: UseApiOptions<TBody> & {
    getNextPageParam?: (lastPage: TData, allPages: TData[]) => unknown;
    getPreviousPageParam?: (firstPage: TData, allPages: TData[]) => unknown;
  } = { url: '' }
) {
  const [pages] = useState<TData[]>([]);
  const [pageParams] = useState<unknown[]>([]);

  const api = useApi<TData, TBody>(options);

  const fetchNextPage = useCallback(async () => {
    if (options.getNextPageParam && pages.length > 0) {
      const nextPageParam = options.getNextPageParam(pages[pages.length - 1], pages);
      if (nextPageParam !== undefined) {
        // Fetch next page logic here
        // This would need to be implemented based on your pagination strategy
      }
    }
  }, [options, pages]);

  const fetchPreviousPage = useCallback(async () => {
    if (options.getPreviousPageParam && pages.length > 0) {
      const previousPageParam = options.getPreviousPageParam(pages[0], pages);
      if (previousPageParam !== undefined) {
        // Fetch previous page logic here
        // This would need to be implemented based on your pagination strategy
      }
    }
  }, [options, pages]);

  return {
    ...api,
    pages,
    pageParams,
    fetchNextPage,
    fetchPreviousPage,
    hasNextPage: options.getNextPageParam
      ? options.getNextPageParam(pages[pages.length - 1], pages) !== undefined
      : false,
    hasPreviousPage: options.getPreviousPageParam
      ? options.getPreviousPageParam(pages[0], pages) !== undefined
      : false,
  };
}
