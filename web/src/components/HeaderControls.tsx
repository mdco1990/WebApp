import React from 'react';
import { useTranslation } from 'react-i18next';
import { getLogs } from '../services/api';
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
  onNavigateToUserManagement?: () => void;
  onNavigateToDBAdmin?: () => void;
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
  onNavigateToUserManagement,
  onNavigateToDBAdmin,
}) => {
  const { t, i18n } = useTranslation();
  const [userActionLoading, setUserActionLoading] = React.useState(false);
  const { push } = useToast();

  // Helper to style toggle buttons with better contrast
  const activeBtnClass = isDarkMode ? 'btn-light text-dark' : 'btn-dark text-light';
  const inactiveBtnClass = 'btn-outline-secondary';
  const langBtnClass = (lang: string) =>
    `btn ${i18n.language === lang ? activeBtnClass : inactiveBtnClass}`;
  const currencyBtnClass = (c: 'USD' | 'EUR') =>
    `btn ${currency === c ? activeBtnClass : inactiveBtnClass}`;

  // Admin tools: logs helpers for unified dropdown
  const openLogsWindow = async () => {
    try {
      setUserActionLoading(true);
      const logs = await getLogs();
      const w = window.open('', '_blank', 'width=800,height=600');
      if (!w) return;
      w.document.documentElement.innerHTML = `<html><head><title>Application Logs</title></head><body style="font-family:monospace;padding:20px;background:#1e1e1e;color:#fff;"><h2>Application Logs</h2><pre style="white-space:pre-wrap;font-size:12px;">${JSON.stringify(logs, null, 2)}</pre></body></html>`;
    } catch {
      push(t('toast.errorLogs', { defaultValue: 'Failed to fetch logs' }), 'error');
    } finally {
      setUserActionLoading(false);
    }
  };

  const downloadLogsJson = async () => {
    try {
      setUserActionLoading(true);
      const logs = await getLogs();
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'application-logs.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      push(t('toast.errorLogsDownload', { defaultValue: 'Failed to download logs' }), 'error');
    } finally {
      setUserActionLoading(false);
    }
  };

  return (
    <div className="btn-list header-controls-container">
      {/* Month navigation - compact design */}
      <div
        className="btn-group btn-group-sm"
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
      </div>

      {/* Month picker - inline */}
      <div className="d-none d-md-inline">
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

      {/* Language switcher - compact */}
      <div className="btn-group btn-group-sm" aria-label="Language Switcher">
        <button
          className={langBtnClass('en')}
          onClick={() => {
            i18n.changeLanguage('en');
            localStorage.setItem('lang', 'en');
          }}
        >
          EN
        </button>
        <button
          className={langBtnClass('fr')}
          onClick={() => {
            i18n.changeLanguage('fr');
            localStorage.setItem('lang', 'fr');
          }}
        >
          FR
        </button>
      </div>

      {/* Currency switcher - compact */}
      <div className="btn-group btn-group-sm" aria-label="Currency Switcher">
        <button
          className={currencyBtnClass('USD')}
          onClick={() => onSetCurrency('USD')}
          aria-label="Switch to USD"
        >
          $
        </button>
        <button
          className={currencyBtnClass('EUR')}
          onClick={() => onSetCurrency('EUR')}
          aria-label="Switch to EUR"
        >
          €
        </button>
      </div>

      {/* Theme toggle - compact */}
      <button
        className="btn btn-outline-secondary btn-sm"
        onClick={onToggleDarkMode}
        aria-label={
          isDarkMode
            ? t('nav.light', { defaultValue: 'Switch to light mode' })
            : t('nav.dark', { defaultValue: 'Switch to dark mode' })
        }
        title={isDarkMode ? t('nav.light') : t('nav.dark')}
      >
        {isDarkMode ? '☀️' : '🌙'}
      </button>

      {/* Unified account dropdown: Password, Admin Panel, Logout */}
      <div className="dropdown">
        <button
          className="btn btn-outline-info btn-sm dropdown-toggle"
          type="button"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          {user?.username ? `${user.username}` : t('nav.account', { defaultValue: 'Account' })}
        </button>
        <ul className={`dropdown-menu dropdown-menu-end ${isDarkMode ? 'dropdown-menu-dark' : ''}`}>
          {/* User Account Section */}
          <li className="dropdown-header">
            {t('nav.userAccount', { defaultValue: 'User Account' })}
          </li>
          <li>
            <button className="dropdown-item" onClick={onChangePasswordClick}>
              <span className="me-2"></span>
              {t('nav.password', { defaultValue: 'Change Password' })}
            </button>
          </li>

          {/* Admin Panel Section - only show if user is admin */}
          {user?.is_admin && (
            <>
              <li>
                <hr className="dropdown-divider" />
              </li>
              <li className="dropdown-header">
                {t('nav.adminPanel', { defaultValue: 'Admin Panel' })}
              </li>
              <li>
                <button className="dropdown-item" onClick={onNavigateToDBAdmin}>
                  <span className="me-2">🗄️</span>
                  {t('nav.dbAdmin', { defaultValue: 'Database Admin' })}
                </button>
              </li>
              <li>
                <button className="dropdown-item" onClick={openLogsWindow}>
                  <span className="me-2">📋</span>
                  {t('nav.applicationLogs', { defaultValue: 'View Logs' })}
                </button>
              </li>
              <li>
                <button className="dropdown-item" onClick={downloadLogsJson}>
                  <span className="me-2">⬇️</span>
                  {t('nav.downloadLogs', { defaultValue: 'Download Logs' })}
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item text-warning"
                  onClick={() => {
                    if (
                      window.confirm(
                        t('confirm.clearCache', { defaultValue: 'Clear application cache?' })
                      )
                    ) {
                      localStorage.clear();
                      sessionStorage.clear();
                      window.location.reload();
                    }
                  }}
                >
                  <span className="me-2">🧹</span>
                  {t('btn.clearCache', { defaultValue: 'Clear Cache' })}
                </button>
              </li>
            </>
          )}

          {/* User Management Section - only show if user is admin */}
          {user?.is_admin && (
            <>
              <li>
                <hr className="dropdown-divider" />
              </li>
              <li className="dropdown-header">
                {t('nav.userManagement', { defaultValue: '👥 User Management' })}
              </li>
              <li>
                <button className="dropdown-item" onClick={onNavigateToUserManagement}>
                  <span className="me-2">👥</span>
                  {t('nav.userManagement', { defaultValue: 'User Management' })}
                </button>
              </li>
            </>
          )}

          {/* Logout Section */}
          <li>
            <hr className="dropdown-divider" />
          </li>
          <li>
            <button className="dropdown-item text-danger" onClick={onLogout}>
              <span className="me-2">🚪</span>
              {t('nav.logout', { defaultValue: 'Log out' })}
            </button>
          </li>
        </ul>
      </div>

      {/* Loading indicator */}
      {userActionLoading && (
        <div className="d-flex align-items-center">
          <span
            className="spinner-border spinner-border-sm text-info me-2"
            aria-hidden="true"
          ></span>
          <span className="text-muted small">
            {t('nav.loading', { defaultValue: 'Loading...' })}
          </span>
        </div>
      )}
    </div>
  );
};

export default HeaderControls;
