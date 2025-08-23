import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AuthScreen from '../AuthScreen';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, opts?: any) => (opts?.defaultValue as string) ?? k,
  }),
}));

describe('AuthScreen', () => {
  const baseProps = () => ({
    isDarkMode: false,
    showRegister: false,
    setShowRegister: vi.fn(),
    loginForm: { username: '', password: '' },
    setLoginForm: vi.fn(),
    registerForm: { username: '', password: '', email: '' },
    setRegisterForm: vi.fn(),
    authLoading: false,
    loginValidated: false,
    setLoginValidated: vi.fn(),
    registerValidated: false,
    setRegisterValidated: vi.fn(),
    rememberMe: false,
    setRememberMe: vi.fn(),
    onLogin: vi.fn(),
    onRegister: vi.fn(),
    onToggleDarkMode: vi.fn(),
  });

  it('renders login by default and toggles to register', () => {
    const props = baseProps();
    render(<AuthScreen {...props} />);

    // Toggle link should switch screens
    const toggle = screen.getByRole('button', { name: /don't have an account\? create one/i });
    fireEvent.click(toggle);
    expect(props.setShowRegister).toHaveBeenCalledWith(true);
  });

  it('dark mode toggle triggers callback', () => {
    const props = baseProps();
    render(<AuthScreen {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /switch to dark mode|dark/i }));
    expect(props.onToggleDarkMode).toHaveBeenCalled();
  });
});
