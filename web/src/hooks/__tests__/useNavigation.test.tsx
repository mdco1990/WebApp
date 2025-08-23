import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNavigation } from '../useNavigation';

// Mock browser APIs used by the hook
beforeEach(() => {
  // scrollTo
  (window as any).scrollTo = vi.fn();

  // IntersectionObserver
  class IO {
    constructor(public cb: any) {
      (window as any).__io_cb__ = cb;
    }
    observe() {}
    disconnect() {}
  }
  (window as any).IntersectionObserver = IO as any;

  // requestAnimationFrame
  (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
    cb(0);
    return 1 as any;
  };
});

describe('useNavigation', () => {
  it('navigates months prev/next and preserves scroll', () => {
    const { result } = renderHook(() => useNavigation());

    const initial = result.current.currentDate;
    act(() => result.current.navigateMonth('next'));
    expect(result.current.currentDate.getMonth()).toBe((initial.getMonth() + 1) % 12);

    act(() => result.current.navigateMonth('prev'));
    // Should be back to initial month (modulo year wrap is not strictly tested here)
    expect(window.scrollTo as any).toHaveBeenCalled();
  });

  it('changes month from input and goToToday resets date', () => {
    const { result } = renderHook(() => useNavigation());

    // Change via input value
    act(() => result.current.onMonthChange('2030-04'));
    expect(result.current.monthInputValue).toBe('2030-04');

    // Go to today
    const now = new Date();
    act(() => result.current.goToToday());
    expect(result.current.currentDate.getFullYear()).toBe(now.getFullYear());
  });

  it('updates activeSection based on IntersectionObserver entries', () => {
    // Provide elements in DOM
    const ids = ['planning', 'tracking', 'savings', 'analytics'];
    ids.forEach((id) => {
      const el = document.createElement('div');
      el.id = id;
      document.body.appendChild(el);
    });

    const { result, unmount } = renderHook(() => useNavigation());

    // Trigger IO callback with tracking most visible
    const cb = (window as any).__io_cb__ as (entries: any[]) => void;
    act(() => {
      cb([
        { isIntersecting: true, intersectionRatio: 0.3, target: { id: 'planning' } },
        { isIntersecting: true, intersectionRatio: 0.9, target: { id: 'tracking' } },
      ]);
    });
    expect(result.current.activeSection).toBe('tracking');

    // Now savings is most visible
    act(() => {
      cb([
        { isIntersecting: true, intersectionRatio: 0.95, target: { id: 'savings' } },
        { isIntersecting: true, intersectionRatio: 0.1, target: { id: 'analytics' } },
      ]);
    });
    expect(result.current.activeSection).toBe('savings');

    unmount();
  });

  it('toggles back-to-top visibility on scroll and scrollToTop scrolls smoothly', () => {
    const { result } = renderHook(() => useNavigation());

    // start at top
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current.showBackToTop).toBe(false);

    // beyond threshold
    Object.defineProperty(window, 'scrollY', { value: 450, configurable: true });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current.showBackToTop).toBe(true);

    // scrollToTop uses smooth behavior
    act(() => result.current.scrollToTop());
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('ignores invalid month input values', () => {
    const { result } = renderHook(() => useNavigation());
    const before = result.current.monthInputValue;
    act(() => result.current.onMonthChange('invalid'));
    expect(result.current.monthInputValue).toBe(before);
  });
});
