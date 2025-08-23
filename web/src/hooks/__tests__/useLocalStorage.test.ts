import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useLocalStorage,
  useLocalStorageString,
  useLocalStorageNumber,
  useLocalStorageBoolean,
  useLocalStorageTTL,
} from '../useLocalStorage';

describe('useLocalStorage - core', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default when key missing', () => {
    const { result } = renderHook(() =>
      useLocalStorage<{ a: number }>('missing', { defaultValue: { a: 1 } })
    );
    expect(result.current[0]).toEqual({ a: 1 });
  });

  it('sets value and persists to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage<{ x: string }>('key'));
    act(() => {
      result.current[1]({ x: 'hello' });
    });
    expect(result.current[0]).toEqual({ x: 'hello' });
    expect(JSON.parse(localStorage.getItem('key')!)).toEqual({ x: 'hello' });
  });

  it('setting null removes item and sets state to null', () => {
    localStorage.setItem('k', JSON.stringify({ p: 1 }));
    const { result } = renderHook(() => useLocalStorage<any>('k'));

    act(() => {
      result.current[1](null);
    });
    expect(result.current[0]).toBeNull();
    expect(localStorage.getItem('k')).toBeNull();
  });

  it('removeValue removes from storage and sets state to null', () => {
    localStorage.setItem('k2', JSON.stringify({ y: 2 }));
    const { result } = renderHook(() => useLocalStorage<any>('k2'));

    act(() => {
      result.current[2]();
    });
    expect(result.current[0]).toBeNull();
    expect(localStorage.getItem('k2')).toBeNull();
  });

  it('calls onError when deserializer fails and returns default', () => {
    const onError = vi.fn();
    localStorage.setItem('bad', 'not-json');
    const { result } = renderHook(() =>
      useLocalStorage('bad', { defaultValue: { ok: true }, onError })
    );
    expect(onError).toHaveBeenCalled();
    expect(result.current[0]).toEqual({ ok: true });
  });

  it('responds to storage events (same key)', () => {
    const { result } = renderHook(() => useLocalStorage<any>('shared'));
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'shared',
          newValue: JSON.stringify({ z: 9 }),
        })
      );
    });
    expect(result.current[0]).toEqual({ z: 9 });

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'shared',
          newValue: null,
        })
      );
    });
    expect(result.current[0]).toBeNull();
  });
});

describe('useLocalStorage - primitives', () => {
  beforeEach(() => localStorage.clear());

  it('string variant stores raw strings', () => {
    const { result } = renderHook(() => useLocalStorageString('s', 'def'));
    expect(result.current[0]).toBe('def');
    act(() => result.current[1]('hello'));
    expect(localStorage.getItem('s')).toBe('hello');
  });

  it('number variant parses/serializes correctly', () => {
    const { result } = renderHook(() => useLocalStorageNumber('n', 7));
    expect(result.current[0]).toBe(7);
    act(() => result.current[1](42));
    expect(localStorage.getItem('n')).toBe('42');
  });

  it('boolean variant serializes to "true"/"false"', () => {
    const { result } = renderHook(() => useLocalStorageBoolean('b', true));
    expect(result.current[0]).toBe(true);
    act(() => result.current[1](false));
    expect(localStorage.getItem('b')).toBe('false');
  });
});

describe('useLocalStorageTTL', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores value with expiry and returns it before expiry', () => {
    const { result } = renderHook(() =>
      useLocalStorageTTL('ttl-key', { ttl: 1000, defaultValue: { a: 1 } })
    );
    act(() => result.current[1]({ a: 2 }));
    const raw = JSON.parse(localStorage.getItem('ttl-key')!);
    expect(raw.value).toEqual({ a: 2 });
    expect(typeof raw.expiresAt).toBe('number');
    expect(result.current[0]).toEqual({ a: 2 });
  });

  it('expires after ttl and returns default on fresh mount', () => {
    const { result, unmount } = renderHook(() =>
      useLocalStorageTTL('ttl2', { ttl: 10, defaultValue: { d: 0 } })
    );
    act(() => result.current[1]({ d: 5 }));

    // Advance time beyond ttl
    vi.advanceTimersByTime(20);

    // Re-mount to simulate new read from storage
    unmount();
    const { result: result2 } = renderHook(() =>
      useLocalStorageTTL('ttl2', { ttl: 10, defaultValue: { d: 0 } })
    );

    expect(localStorage.getItem('ttl2')).toBeNull();
    expect(result2.current[0]).toEqual({ d: 0 });
  });
});
