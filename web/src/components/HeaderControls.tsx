import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminControls from './AdminControls';
import { getPendingUsers, getAllUsers, approveUser, deleteUser, rejectUser } from '../services/api';
import { useToast } from '../shared/toast';
import type { User } from '../types/budget';

export type HeaderControlsProps = {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  currency: 'EUR' | 'USD';
  onSetCurrency: (c: 'EUR' | 'USD') => void;
  navigateMonth: (d: 'prev' | 'next') => void;
  goToToday: () => void;
  monthInputValue: string;
  onMonthChange: (v: string) => void;
  user: User | null;
  onChangePasswordClick: () => void;
  onLogout: () => void;
};

const HeaderControls: React.FC<HeaderControlsProps> = ({
  isDarkMode,
  onToggleDarkMode,
  currency,
  onSetCurrency,
  navigateMonth,
  goToToday,
  monthInputValue,
  onMonthChange,
  user,
  onChangePasswordClick,
  onLogout,
}) => {
  const { t, i18n } = useTranslation();
  const [pendingUsers, setPendingUsers] = useState<Array<{ id: number; username: string; email: string; created_at: string }>>([]);
  const [allUsers, setAllUsers] = useState<Array<{ id: number; username: string; email: string; created_at: string; is_admin: boolean; is_approved: boolean; status?: string }>>([]);
  const [userActionLoading, setUserActionLoading] = useState(false);
  const { push } = useToast();

  // Load pending users and all users if admin
  useEffect(() => {
    if (user?.is_admin) {
      Promise.all([
        getPendingUsers().catch(() => []),
        getAllUsers().catch(() => [])
      ]).then(([pending, all]) => {
        setPendingUsers(pending);
        setAllUsers(all);
      });
    }
  }, [user?.is_admin]);

  const handleApproveUser = async (userId: number) => {
    try {
      setUserActionLoading(true);
      await approveUser(userId);
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      // Refresh all users list
      if (user?.is_admin) {
        getAllUsers().then(setAllUsers).catch(() => setAllUsers([]));
      }
      push(t('toast.userApproved', { defaultValue: 'User approved' }), 'success');
    } catch {
      push(t('toast.errorApprove', { defaultValue: 'Failed to approve user' }), 'error');
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      setUserActionLoading(true);
      await deleteUser(userId);
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      setAllUsers(prev => prev.filter(u => u.id !== userId));
      push(t('toast.userDeleted', { defaultValue: 'User deleted' }), 'success');
    } catch {
      push(t('toast.errorDelete', { defaultValue: 'Failed to delete user' }), 'error');
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleRejectUser = async (userId: number) => {
    try {
      setUserActionLoading(true);
      await rejectUser(userId);
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      // Refresh full list to capture status change
      if (user?.is_admin) {
        getAllUsers().then(setAllUsers).catch(() => setAllUsers([]));
      }
      push(t('toast.userRejected', { defaultValue: 'User rejected' }), 'success');
    } catch {
      push(t('toast.errorReject', { defaultValue: 'Failed to reject user' }), 'error');
    } finally {
      setUserActionLoading(false);
    }
  };

  // Helper to style toggle buttons with better contrast
  const activeBtnClass = isDarkMode ? 'btn-light text-dark' : 'btn-dark text-light';
  const inactiveBtnClass = 'btn-outline-secondary';
  const langBtnClass = (lang: string) => `btn ${i18n.language === lang ? activeBtnClass : inactiveBtnClass}`;
  const currencyBtnClass = (c: 'USD' | 'EUR') => `btn ${currency === c ? activeBtnClass : inactiveBtnClass}`;

  return (
    <div className="btn-list">
      {/* Month navigation */}
      <div
        className="btn-group"
        aria-label={t('nav.monthNav', { defaultValue: 'Month navigation' })}
      >
        <button
          className="btn btn-primary btn-sm"
          style={{ backgroundColor: '#007bff', borderColor: '#0056b3', color: '#ffffff' }}
          onClick={() => navigateMonth('prev')}
          aria-label={t('nav.prev', { defaultValue: 'Previous month' })}
        >
          {t('nav.prev')}
        </button>
        <button
          className="btn btn-primary btn-sm"
          style={{ backgroundColor: '#007bff', borderColor: '#0056b3', color: '#ffffff' }}
          onClick={() => navigateMonth('next')}
          aria-label={t('nav.next', { defaultValue: 'Next month' })}
        >
          {t('nav.next')}
        </button>
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={goToToday}
          aria-label={t('nav.today', { defaultValue: 'Go to current month' })}
          title={t('nav.today', { defaultValue: 'Today' })}
        >
          {t('nav.today', { defaultValue: 'Today' })}
        </button>
        <div className="ms-2 d-none d-md-inline">
          <label htmlFor="monthPicker" className="visually-hidden">
            {t('nav.pickMonth', { defaultValue: 'Pick month' })}
          </label>
          <input
            id="monthPicker"
            type="month"
            className={`form-control form-control-sm ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
            value={monthInputValue}
            onChange={(e) => onMonthChange(e.target.value)}
            aria-label={t('nav.month', { defaultValue: 'Month' })}
          />
        </div>
      </div>

      {/* Language switcher */}
      <div className="btn-group btn-group-sm" aria-label="Language Switcher">
        <button
          className={langBtnClass('en')}
          onClick={() => {
            i18n.changeLanguage('en');
            localStorage.setItem('lang', 'en');
          }}
        >
          {t('lang.english')}
        </button>
        <button
          className={langBtnClass('fr')}
          onClick={() => {
            i18n.changeLanguage('fr');
            localStorage.setItem('lang', 'fr');
          }}
        >
          {t('lang.french')}
        </button>
      </div>

      {/* Currency switcher */}
      <div className="btn-group btn-group-sm" aria-label="Currency Switcher">
        <button
          className={currencyBtnClass('USD')}
          onClick={() => onSetCurrency('USD')}
          aria-label="Switch to USD"
        >
          $ USD
        </button>
        <button
          className={currencyBtnClass('EUR')}
          onClick={() => onSetCurrency('EUR')}
          aria-label="Switch to EUR"
        >
          € EUR
        </button>
      </div>

      {/* Theme, password, logout */}
      <button
        className="btn btn-outline-secondary btn-sm"
        onClick={onToggleDarkMode}
        aria-label={
          isDarkMode
            ? t('nav.light', { defaultValue: 'Switch to light mode' })
            : t('nav.dark', { defaultValue: 'Switch to dark mode' })
        }
      >
        {isDarkMode ? t('nav.light') : t('nav.dark')}
      </button>

      <button
        className="btn btn-outline-warning btn-sm"
        onClick={onChangePasswordClick}
        title={t('nav.password', { defaultValue: 'Change Password' })}
        aria-label={t('nav.password', { defaultValue: 'Change password' })}
      >
        {t('nav.password')}
      </button>

  <AdminControls 
        isDarkMode={isDarkMode}
        user={user}
        pendingUsers={pendingUsers}
        allUsers={allUsers}
        onApproveUser={handleApproveUser}
        onRejectUser={handleRejectUser}
        onDeleteUser={handleDeleteUser}
      />
  {userActionLoading && <span className="spinner-border spinner-border-sm text-info" role="status" aria-hidden="true"></span>}

      <button
        className="btn btn-outline-danger btn-sm"
        onClick={onLogout}
        aria-label={t('nav.logout', { defaultValue: 'Log out' })}
      >
        {t('nav.logout')} {user?.username ? `(${user.username})` : ''}
      </button>
    </div>
  );
};

export default HeaderControls;
