import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useApi } from '../useApi';

describe('useApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('performs GET on demand and sets data on success', async () => {
    const mockData = { ok: true };
    const fetchSpy = vi.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => mockData,
    } as Response);

    const onSuccess = vi.fn();

    const { result } = renderHook(() => useApi<{ ok: boolean }>({ url: '', onSuccess }));

    await act(async () => {
      await result.current.get('/api/test', { method: 'GET' });
    });

    expect(fetchSpy).toHaveBeenCalledWith('/api/test', expect.objectContaining({ method: 'GET' }));
    expect(result.current.state.status).toBe('success');
    expect(result.current.data).toEqual(mockData);
    expect(onSuccess).toHaveBeenCalledWith(mockData);
  });

  it('sets error state on non-ok response and calls onError', async () => {
    vi.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: async () => ({}),
    } as Response);

    const onError = vi.fn();
    const { result } = renderHook(() => useApi({ url: '', onError }));
    await act(async () => {
      await result.current.get('/api/fail', { method: 'GET' });
    });

    expect(result.current.state.status).toBe('error');
    expect(result.current.error).toContain('HTTP 500');
    expect(onError).toHaveBeenCalled();
  });

  it('retries failed request based on retryCount and succeeds', async () => {
    vi.useFakeTimers();

    const fetchSpy = vi
      .spyOn(global, 'fetch' as any)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Err',
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ value: 1 }),
      } as Response);

    const { result } = renderHook(() =>
      useApi<{ value: number }>({ url: '', retryCount: 1, retryDelay: 1000 })
    );
    // Trigger request explicitly and keep the promise
    await act(async () => {
      const p = result.current.get('/api/retry', { method: 'GET' });
      await vi.advanceTimersByTimeAsync(1000);
      await p;
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.current.state.status).toBe('success');
    expect(result.current.data).toEqual({ value: 1 });

    vi.useRealTimers();
  });

  it('aborts on timeout and sets error to Request timeout', async () => {
    vi.useFakeTimers();

    const fetchSpy = vi.spyOn(global, 'fetch' as any).mockImplementation((...args: unknown[]) => {
      const init = args[1] as RequestInit | undefined;
      // Return a promise that rejects when aborted
      return new Promise((_resolve, reject) => {
        const signal = init?.signal as AbortSignal | undefined;
        if (signal) {
          signal.addEventListener('abort', () => {
            const err = new Error('Aborted');
            (err as any).name = 'AbortError';
            reject(err);
          });
        }
      }) as any;
    });

    const { result } = renderHook(() => useApi({ url: '' }));
    // Trigger request explicitly and let timeout fire
    await act(async () => {
      const p = result.current.get('/api/slow', { method: 'GET', timeout: 100 });
      await vi.advanceTimersByTimeAsync(150);
      await p;
    });

    expect(fetchSpy).toHaveBeenCalled();
    expect(result.current.state.status).toBe('error');
    expect(result.current.error).toBe('Request timeout');

    vi.useRealTimers();
  });

  it('caches GET responses when cache enabled and reuses cache', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ n: 1 }),
    } as Response);

    const { result } = renderHook(() =>
      useApi<{ n: number }>({ url: '', cache: true, cacheTime: 5000 })
    );
    await act(async () => {
      await result.current.get('/api/cache', { method: 'GET' });
    });
    expect(result.current.data).toEqual({ n: 1 });

    // Now call get() again - should hit cache, not fetch
    await act(async () => {
      await result.current.get('/api/cache', { method: 'GET' });
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ n: 1 });
  });

  it('mutate updates data and cache when enabled', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ value: 'server' }),
    } as Response);

    const { result } = renderHook(() =>
      useApi<{ value: string }>({ url: '', cache: true, cacheTime: 5000 })
    );
    await act(async () => {
      await result.current.get('/api/mutate', { method: 'GET' });
    });

    // Mutate value
    act(() => {
      result.current.mutate({ value: 'local' });
    });

    expect(result.current.data).toEqual({ value: 'local' });

    // Call get again; should use cache (no extra fetch) and return mutated value
    await act(async () => {
      await result.current.get('/api/mutate', { method: 'GET' });
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ value: 'local' });
  });
});
