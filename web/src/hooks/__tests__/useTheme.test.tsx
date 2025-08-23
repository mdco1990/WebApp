import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { ThemeProvider, useTheme } from '../useTheme';

// simple localStorage sandbox per test
const store: Record<string, string> = {};
const ls = {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => {
    store[k] = v;
  },
  removeItem: (k: string) => {
    delete store[k];
  },
  clear: () => {
    for (const k of Object.keys(store)) delete store[k];
  },
};

describe('useTheme', () => {
  beforeEach(() => {
    ls.clear();
    Object.defineProperty(window, 'localStorage', { value: ls, configurable: true });
  });

  it('throws if used outside provider', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => renderHook(() => useTheme())).toThrow(
        'useTheme must be used within a ThemeProvider'
      );
    } finally {
      errSpy.mockRestore();
    }
  });

  it('provides defaults and persists changes', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    // defaults
    expect(result.current.isDarkMode).toBe(false);
    expect(result.current.currency).toBe('EUR');

    // toggle dark mode and check persistence
    act(() => {
      result.current.setIsDarkMode(true);
    });
    expect(window.localStorage.getItem('darkMode')).toBe('true');
    expect(result.current.isDarkMode).toBe(true);

    // change currency and check persistence
    act(() => {
      result.current.setCurrency('USD');
    });
    expect(window.localStorage.getItem('currency')).toBe('USD');
    expect(result.current.currency).toBe('USD');
  });

  it('falls back for non-JSON darkMode values (catch branch)', () => {
    // set an invalid JSON string so JSON.parse throws and catch path runs
    window.localStorage.setItem('darkMode', 'not-json');

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    // fallback compares raw === 'true' -> false for 'not-json'
    expect(result.current.isDarkMode).toBe(false);
  });

  it('reads initial values from localStorage', () => {
    window.localStorage.setItem('darkMode', 'true');
    window.localStorage.setItem('currency', 'USD');

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    expect(result.current.isDarkMode).toBe(true);
    expect(result.current.currency).toBe('USD');
  });
});
