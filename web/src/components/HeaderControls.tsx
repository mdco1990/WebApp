import React from 'react'
import { useTranslation } from 'react-i18next'
import type { User } from '../types/budget'

export type HeaderControlsProps = {
  isDarkMode: boolean
  onToggleDarkMode: () => void
  currency: 'EUR' | 'USD'
  onSetCurrency: (c: 'EUR' | 'USD') => void
  navigateMonth: (d: 'prev' | 'next') => void
  goToToday: () => void
  monthInputValue: string
  onMonthChange: (v: string) => void
  user: User | null
  onChangePasswordClick: () => void
  onLogout: () => void
}

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
  const { t, i18n } = useTranslation()

  return (
    <div className="btn-list">
      {/* Month navigation */}
      <div className="btn-group" aria-label={t('nav.monthNav', { defaultValue: 'Month navigation' })}>
        <button
          className="btn btn-outline-primary btn-sm"
          onClick={() => navigateMonth('prev')}
          aria-label={t('nav.prev', { defaultValue: 'Previous month' })}
        >
          {t('nav.prev')}
        </button>
        <button
          className="btn btn-outline-primary btn-sm"
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
          className={`btn btn-outline-secondary ${i18n.language === 'en' ? 'active' : ''}`}
          onClick={() => { i18n.changeLanguage('en'); localStorage.setItem('lang', 'en'); }}
        >
          {t('lang.english')}
        </button>
        <button
          className={`btn btn-outline-secondary ${i18n.language === 'fr' ? 'active' : ''}`}
          onClick={() => { i18n.changeLanguage('fr'); localStorage.setItem('lang', 'fr'); }}
        >
          {t('lang.french')}
        </button>
      </div>

      {/* Currency switcher */}
      <div className="btn-group btn-group-sm" aria-label="Currency Switcher">
        <button
          className={`btn btn-outline-secondary ${currency === 'EUR' ? 'active' : ''}`}
          onClick={() => onSetCurrency('EUR')}
          aria-label="Switch to EUR"
        >
          € EUR
        </button>
        <button
          className={`btn btn-outline-secondary ${currency === 'USD' ? 'active' : ''}`}
          onClick={() => onSetCurrency('USD')}
          aria-label="Switch to USD"
        >
          $ USD
        </button>
      </div>

      {/* Theme, password, logout */}
      <button
        className="btn btn-outline-secondary btn-sm"
        onClick={onToggleDarkMode}
        aria-label={isDarkMode ? t('nav.light', { defaultValue: 'Switch to light mode' }) : t('nav.dark', { defaultValue: 'Switch to dark mode' })}
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

      <button className="btn btn-outline-danger btn-sm" onClick={onLogout} aria-label={t('nav.logout', { defaultValue: 'Log out' })}>
        {t('nav.logout')} {user?.username ? `(${user.username})` : ''}
      </button>

      {/* Admin links */}
      {user?.is_admin ? (
        <>
          <a
            href="/api/"
            target="_blank"
            className="btn btn-outline-info btn-sm"
            title="API Documentation"
            rel="noreferrer"
          >
            {t('nav.apiDocs', { defaultValue: 'API Docs' })}
          </a>
          <a
            href="/db-admin/"
            target="_blank"
            className="btn btn-outline-success btn-sm"
            title="SQLite DB Admin"
            rel="noreferrer"
          >
            DB Admin
          </a>
        </>
      ) : null}
    </div>
  )
}

export default HeaderControls
