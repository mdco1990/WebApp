import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, afterAll } from 'vitest';
import { useAuth } from '../useAuth';

const push = vi.fn();
vi.mock('../../shared/toast', () => {
  return { useToast: () => ({ push }) };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

declare const global: any;

describe('useAuth', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    localStorage.clear();
    global.fetch = vi.fn();
  });

  it('hydrates user from /auth/me when session exists', async () => {
    localStorage.setItem('session_id', 's123');

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 'u1', name: 'A' } }),
    });

    const { result } = renderHook(() => useAuth());

    // should call /auth/me
    await waitFor(() => expect(result.current.user).toEqual({ id: 'u1', name: 'A' }));
    expect(result.current.showLogin).toBe(false);
    expect((global.fetch as any).mock.calls[0][0]).toBe('/auth/me');
    expect((global.fetch as any).mock.calls[0][1].headers.Authorization).toBe('Bearer s123');
  });

  it('login success stores session and user, hides login', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true, session_id: 'abc', user: { id: 'u2', name: 'B' } }),
    });

    const { result } = renderHook(() => useAuth());

    const ok = await act(async () => result.current.login('bob', 'pw'));
    expect(ok).toBe(true);
    expect(result.current.sessionId).toBe('abc');
    expect(localStorage.getItem('session_id')).toBe('abc');
    expect(result.current.user).toEqual({ id: 'u2', name: 'B' });
    expect(result.current.showLogin).toBe(false);
  });

  it('login failure pushes error and returns false', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: false, message: 'bad' }),
    });

    const { result } = renderHook(() => useAuth());

    const ok = await act(async () => result.current.login('x', 'y'));
    expect(ok).toBe(false);
    expect(push).toHaveBeenCalled();
  });

  it('login network error pushes generic error', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('fail'));
    const { result } = renderHook(() => useAuth());

    const ok = await act(async () => result.current.login('x', 'y'));
    expect(ok).toBe(false);
    expect(push).toHaveBeenCalled();
  });

  it('logout posts and clears local state/session', async () => {
    // set an existing session and mock logout
    localStorage.setItem('session_id', 'sess');
    (global.fetch as any).mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() => useAuth());

    await act(async () => result.current.logout());

    expect(result.current.sessionId).toBeNull();
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('session_id')).toBeNull();
    expect(result.current.showLogin).toBe(true);
    // first call is hydration '/auth/me'; ensure '/auth/logout' was called subsequently
    const urls = (global.fetch as any).mock.calls.map((c: any[]) => c[0]);
    expect(urls).toContain('/auth/logout');
  });

  it('register success pushes success and returns true', async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: true });
    const { result } = renderHook(() => useAuth());

    const ok = await act(async () => result.current.register('u', 'p', 'e@e.com'));
    expect(ok).toBe(true);
    expect(push).toHaveBeenCalledWith('auth.success.register', 'success');
  });

  it('register failure reads json error and pushes', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'nope' }),
    });
    const { result } = renderHook(() => useAuth());

    const ok = await act(async () => result.current.register('u', 'p', 'e@e.com'));
    expect(ok).toBe(false);
    expect(push).toHaveBeenCalledWith('nope', 'error');
  });

  it('updatePassword success pushes success and returns true', async () => {
    localStorage.setItem('session_id', 'sess');
    // hydration call
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 'u', name: 'N' } }),
    });
    // update-password call
    (global.fetch as any).mockResolvedValueOnce({ ok: true });
    const { result } = renderHook(() => useAuth());

    const ok = await act(async () => result.current.updatePassword('a', 'b'));
    expect(ok).toBe(true);
    expect(push).toHaveBeenCalledWith('btn.updatePassword' + ' ✓', 'success');
  });

  it('updatePassword failure pushes text message and returns false', async () => {
    localStorage.setItem('session_id', 'sess');
    // hydration call
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 'u', name: 'N' } }),
    });
    // update-password call failure
    (global.fetch as any).mockResolvedValueOnce({ ok: false, text: async () => 'oops' });
    const { result } = renderHook(() => useAuth());

    const ok = await act(async () => result.current.updatePassword('a', 'b'));
    expect(ok).toBe(false);
    expect(push).toHaveBeenCalledWith('Password update failed: oops', 'error');
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });
});
