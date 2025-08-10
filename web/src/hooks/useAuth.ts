import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { User, LoginData } from '../types/budget';
import { useToast } from '../shared/toast';

export const useAuth = () => {
  const { t } = useTranslation();
  const { push } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(localStorage.getItem('session_id'));
  const [showLogin, setShowLogin] = useState(!sessionId);
  const [authLoading, setAuthLoading] = useState(false);

  const login = async (username: string, password: string) => {
    try {
      setAuthLoading(true);
      const response = await fetch(`/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data: LoginData = await response.json();

      if (data.success && data.session_id && data.user) {
        setSessionId(data.session_id);
        setUser(data.user);
        localStorage.setItem('session_id', data.session_id);
        setShowLogin(false);
        return true;
      } else {
        push(data.message || t('auth.error.login'), 'error');
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      push(t('auth.error.login'), 'error');
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (sessionId) {
        await fetch(`/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${sessionId}` },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setSessionId(null);
      setUser(null);
      localStorage.removeItem('session_id');
      setShowLogin(true);
    }
  };

  const register = async (username: string, password: string, email: string) => {
    try {
      setAuthLoading(true);
      const response = await fetch(`/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email }),
      });

      if (response.ok) {
        push(t('auth.success.register'), 'success');
        return true;
      } else {
        const error = await response.json();
        push(error.error || 'Registration failed', 'error');
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
      push('Registration failed. Please try again.', 'error');
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const response = await fetch(`/auth/update-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionId}`,
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });

      if (response.ok) {
        push(t('btn.updatePassword') + ' ✓', 'success');
        return true;
      } else {
        const error = await response.text();
        push(`Password update failed: ${error}`, 'error');
        return false;
      }
    } catch (error) {
      console.error('Password update error:', error);
      push('Password update failed. Please try again.', 'error');
      return false;
    }
  };

  return {
    user,
    sessionId,
    showLogin,
    authLoading,
    login,
    logout,
    register,
    updatePassword,
  };
};
