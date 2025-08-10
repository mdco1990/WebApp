import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
} from 'chart.js';
import { Spinner } from 'react-bootstrap';
import { getManualBudget, saveManualBudget } from './services/api';
import { useMonthlyData } from './hooks/useMonthlyData';
import PlanningSection from './components/PlanningSection';
import ManualBudgetSection from './components/ManualBudgetSection';
import PasswordModal from './components/PasswordModal';
import HeaderControls from './components/HeaderControls';
import BudgetOverviewChart from './components/BudgetOverviewChart';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import SavingsProgressChart from './components/SavingsProgressChart';
import KpiTrendChart from './components/KpiTrendChart';
import ManualBudgetDailyChart from './components/ManualBudgetDailyChart';
import IncomeBreakdownChart from './components/IncomeBreakdownChart';
import OutcomeBreakdownChart from './components/OutcomeBreakdownChart';
import { useToast } from './shared/toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement
);

// Types
import type { IncomeSource, OutcomeSource, User, LoginData } from './types/budget'

interface PredictedBudget {
  incomeSources: IncomeSource[];
  outcomeSources: OutcomeSource[];
  totalIncome: number;
  totalOutcome: number;
  difference: number;
}

// Removed unused Expense interface; expenses UI is not implemented in this view

interface SavingsTracker {
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  monthsToTarget: number;
}

interface ManualBudgetItem {
  id: string;
  name: string;
  amount: number; // currency units
}

interface ManualBudgetState {
  bankAmount: number; // currency units
  items: ManualBudgetItem[];
}

// using shared types for User, LoginData, MonthlyData

const App: React.FC = () => {
  const { push } = useToast()
  // State management
  const [activeSection, setActiveSection] = useState<'planning' | 'tracking' | 'analytics'>('planning');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const raw = localStorage.getItem('darkMode');
    if (raw === null) return false;
    try { return JSON.parse(raw) as boolean } catch { return raw === 'true'; }
  });
  const [predictedBudget, setPredictedBudget] = useState<PredictedBudget>({
    incomeSources: [],
    outcomeSources: [],
    totalIncome: 0,
    totalOutcome: 0,
    difference: 0
  });
  const [savingsTracker, setSavingsTracker] = useState<SavingsTracker>({
    targetAmount: 10000,
    currentAmount: 2500,
    monthlyContribution: 500,
    monthsToTarget: 15
  });
  // Removed unused expenses state (not rendered in UI)
  const [manualBudget, setManualBudget] = useState<ManualBudgetState>(() => ({
    bankAmount: 0,
    items: []
  }));
  // Prevent overwriting saved manualBudget on first mount before load runs
  const manualBudgetLoadedRef = useRef(false);
  // Debounce timer for server saves
  const manualBudgetSaveTimer = useRef<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(localStorage.getItem('session_id'));
  const [showLogin, setShowLogin] = useState(!sessionId);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', password: '', email: '' });
  const [showRegister, setShowRegister] = useState(false);
  const [autoUpdate] = useState(true); // Enabled by default
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [dataLoaded, setDataLoaded] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [loginValidated, setLoginValidated] = useState(false);
  const [registerValidated, setRegisterValidated] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const { t, i18n } = useTranslation();
  const [currency, setCurrency] = useState<'EUR' | 'USD'>(() => (localStorage.getItem('currency') as 'EUR' | 'USD') || 'EUR');
  // baseURL not needed; services/api.ts uses absolute paths

  // Helper functions
  const formatCurrency = (cents: number) => {
    const locale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    }).format(cents / 100);
  };
  const currencySymbol = currency === 'EUR' ? '€' : '$';

  // Year/Month derived from currentDate is provided to the monthly-data hook (see ym below)

  const getMonthName = (month: number) => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[month - 1] || 'Unknown';
  };

  const getPageTitle = () => {
    const monthName = getMonthName(currentDate.getMonth() + 1);
    return t('app.title', { month: monthName, year: currentDate.getFullYear() });
  };  // API calls with authentication

  const parseLocaleAmount = (value: string): number => {
    if (!value) return 0;
    const normalized = value.replace(/\s+/g, '').replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  };
  // Centralized API is in src/api.ts

  // Hook: monthly data (budget sources) for current year-month
  const ym = { year: currentDate.getFullYear(), month: currentDate.getMonth() + 1 };
  const {
    data: monthly,
    loading: monthlyLoading,
    reload,
    addDefaultData: addDefaultsHook,
    autoSaveIncomeSource: saveIncomeHook,
    autoSaveOutcomeSource: saveOutcomeHook,
    deleteIncome,
    deleteOutcome,
  } = useMonthlyData(sessionId ? ym : null);

  // Authentication functions
  const login = async (username: string, password: string) => {
    try {
  setAuthLoading(true);
      const response = await fetch(`/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data: LoginData = await response.json();

      if (data.success && data.session_id && data.user) {
        setSessionId(data.session_id);
        setUser(data.user);
        localStorage.setItem('session_id', data.session_id);
        setShowLogin(false);
        reload();
      } else {
        push(data.message || t('auth.error.login'), 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      push(t('auth.error.login'), 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (sessionId) {
        await fetch(`/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${sessionId}` }
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

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const response = await fetch(`/auth/update-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (response.ok) {
        push(t('btn.updatePassword') + ' ✓', 'success');
        setShowPasswordForm(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const error = await response.text();
        push(`Password update failed: ${error}`,'error');
      }
    } catch (error) {
      console.error('Password update error:', error);
      push('Password update failed. Please try again.','error');
    }
  };

  const register = async (username: string, password: string, email: string) => {
    try {
  setAuthLoading(true);
      const response = await fetch(`/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email })
      });

      if (response.ok) {
        push(t('auth.success.register'), 'success');
        setShowRegister(false);
      } else {
        const error = await response.json();
        push(error.error || 'Registration failed','error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      push('Registration failed. Please try again.','error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      push('New passwords do not match!','error');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      push('New password must be at least 6 characters long!','error');
      return;
    }
    updatePassword(passwordForm.currentPassword, passwordForm.newPassword);
  };

  // Sync predictedBudget from hook data
  useEffect(() => {
    setLoading(monthlyLoading);
    if (monthly) {
      const totalIncome = monthly.total_income_cents || 0;
      const totalOutcome = monthly.total_budget_cents || 0;
      setPredictedBudget(prev => ({
        ...prev,
        incomeSources: monthly.income_sources || [],
        outcomeSources: monthly.budget_sources || [],
        totalIncome,
        totalOutcome,
        difference: totalIncome - totalOutcome,
      }));
      setDataLoaded(true);
    }
  }, [monthly, monthlyLoading]);

  // Add default data if none exists
  const addDefaultData = async () => {
    try {
      await addDefaultsHook();
    } catch (error) {
      console.error('Failed to add default data:', error);
    }
  };

  // Auto-save functions
  const autoSaveIncomeSource = async (source: IncomeSource) => {
    try {
      await saveIncomeHook(source, ym);
    } catch (error) {
      console.error('Failed to save income source:', error);
    }
  };

  const autoSaveOutcomeSource = async (source: OutcomeSource) => {
    try {
      await saveOutcomeHook(source, ym);
    } catch (error) {
      console.error('Failed to save budget source:', error);
    }
  };

  // Month navigation
  const navigateMonth = (direction: 'prev' | 'next') => {
  const prevScroll = window.scrollY;
  setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  // Preserve scroll position on month change
  requestAnimationFrame(() => window.scrollTo({ top: prevScroll }));
  };

  // Effects
  useEffect(() => {
    document.title = getPageTitle();
  }, [currentDate]);

  useEffect(() => {
    // Toggle, don't overwrite existing classes
    document.body.classList.toggle('bg-dark', isDarkMode)
    document.body.classList.toggle('text-light', isDarkMode)
    document.body.classList.toggle('bg-light', !isDarkMode)
    document.body.classList.toggle('text-dark', !isDarkMode)
    // Bootstrap theme variable for components
    document.documentElement.setAttribute('data-bs-theme', isDarkMode ? 'dark' : 'light')
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
  }, [isDarkMode]);

  // Reload monthly data on login
  useEffect(() => {
    if (sessionId) reload();
  }, [sessionId, reload]);

  // Observe sections to update active tab on scroll
  useEffect(() => {
    const ids: Array<typeof activeSection> = ['planning', 'tracking', 'analytics'];
    const elements = ids
      .map(id => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        // Pick the most visible entry
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio - a.intersectionRatio))[0];
        if (visible?.target?.id && ids.includes(visible.target.id as any)) {
          setActiveSection(visible.target.id as typeof activeSection);
        }
      },
      {
        root: null,
        threshold: [0.25, 0.5, 0.75],
        rootMargin: '-10% 0px -70% 0px',
      }
    );

    elements.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Persist and load manual budget per month
  useEffect(() => {
    const key = `manualBudget:${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;
    // Avoid saving until we've attempted to load once for this month
    if (!manualBudgetLoadedRef.current) return;
    try {
      localStorage.setItem(key, JSON.stringify(manualBudget));
    } catch { }
    // Also attempt to save to backend (best-effort)
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const payload = {
      year,
      month,
      bank_amount_cents: Math.round(manualBudget.bankAmount * 100),
      items: manualBudget.items.map(it => ({ id: it.id, name: it.name, amount_cents: Math.round(it.amount * 100) }))
    };
    // debounce to reduce network chatter
    if (manualBudgetSaveTimer.current) window.clearTimeout(manualBudgetSaveTimer.current);
    manualBudgetSaveTimer.current = window.setTimeout(async () => {
          try {
            await saveManualBudget(payload);
          } catch {
        // ignore - backend may not implement this yet; localStorage remains the fallback
      }
    }, 400);
  }, [manualBudget]);

  useEffect(() => {
    // We're changing month: block saves until load completes
    manualBudgetLoadedRef.current = false;
    const key = `manualBudget:${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;
    const load = async () => {
      // Try server first
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const data = await getManualBudget({ year, month });
        if (data && typeof data.bank_amount_cents === 'number' && Array.isArray(data.items)) {
          const fromServer: ManualBudgetState = {
            bankAmount: (data.bank_amount_cents || 0) / 100,
            items: data.items.map((it: any) => ({
              id: String(it.id ?? it.client_id ?? Math.random().toString(36).slice(2)),
              name: String(it.name ?? ''),
              amount: (it.amount_cents || 0) / 100
            }))
          };
          setManualBudget(fromServer);
          // cache locally as well
          try { localStorage.setItem(key, JSON.stringify(fromServer)); } catch {}
          manualBudgetLoadedRef.current = true;
          return;
        }
      } catch {
        // fall back to localStorage
      }

      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as ManualBudgetState;
          setManualBudget(parsed);
        } catch { }
      } else {
        // default zero state for months without saved data
        setManualBudget({ bankAmount: 0, items: [] });
      }
      manualBudgetLoadedRef.current = true;
    };
    load();
    // Mark as loaded so subsequent manualBudget changes can be saved
  }, [currentDate]);

  // Recompute totals immediately when sources change to reflect UI without waiting for reload
  useEffect(() => {
    const totalIncome = predictedBudget.incomeSources.reduce((sum, s) => sum + (s.amount_cents || 0), 0);
    const totalOutcome = predictedBudget.outcomeSources.reduce((sum, s) => sum + (s.amount_cents || 0), 0);
    setPredictedBudget(prev => ({
      ...prev,
      totalIncome,
      totalOutcome,
      difference: totalIncome - totalOutcome,
    }));
  }, [predictedBudget.incomeSources, predictedBudget.outcomeSources]);

  useEffect(() => {
    // Add default data after an initial load if needed (avoid racing before load completes)
    if (sessionId && dataLoaded) {
      if (predictedBudget.incomeSources.length === 0 || predictedBudget.outcomeSources.length === 0) {
        addDefaultData();
      }
    }
  }, [sessionId, dataLoaded, predictedBudget.incomeSources.length, predictedBudget.outcomeSources.length]);

  useEffect(() => {
    let interval: any;
    if (autoUpdate) {
      interval = setInterval(() => {
        reload();
      }, 30000); // Update every 30 seconds
    }
    return () => {
          if (interval) window.clearInterval(interval);
    };
  }, [autoUpdate, reload]);

  // Back-to-top visibility
  const [showBackToTop, setShowBackToTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const goToToday = () => setCurrentDate(new Date());
  const monthInputValue = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const onMonthChange = (value: string) => {
    // value is in format YYYY-MM
    const [y, m] = value.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m)) {
      const d = new Date(currentDate);
      d.setFullYear(y);
      d.setMonth(m - 1);
      d.setDate(1);
      setCurrentDate(d);
    }
  };

  // Chart data
  // KPI time series (Income vs Outcomes Trend) — last point reflects current totals
  const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const kpiLabels = monthShort.slice(0, Math.max(8, (currentDate.getMonth() + 1))); // show up to current month or 8 months minimum
  const kpiIncomeSeries = [...Array(kpiLabels.length)].map((_, idx) => idx < kpiLabels.length - 1 ? [4200, 4150, 4300, 4250, 4180, 4220, 4280][idx % 7] : predictedBudget.totalIncome / 100);
  const kpiOutcomeSeries = [...Array(kpiLabels.length)].map((_, idx) => idx < kpiLabels.length - 1 ? [2800, 2950, 3100, 2875, 2920, 3050, 2980][idx % 7] : predictedBudget.totalOutcome / 100);
  // KPI data is now provided to KpiTrendChart via props
  // Removed inline budgetChartData in favor of BudgetOverviewChart component

  // Savings chart data now provided by SavingsProgressChart component

  // Login/Register UI
  if (showLogin) {
    return (
      <div className={`min-vh-100 d-flex align-items-center justify-content-center ${isDarkMode ? 'bg-dark' : 'bg-light'}`}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-6 col-lg-4">
              <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
                <div className="card-body">
                  <h2 className="card-title text-center mb-4">
                    {showRegister ? t('auth.register') : t('auth.login')}
                  </h2>

                  {!showRegister ? (
                    <LoginForm
                      isDarkMode={isDarkMode}
                      values={loginForm}
                      onChange={setLoginForm}
                      loading={authLoading}
                      validated={loginValidated}
                      onValidatedChange={setLoginValidated}
                      rememberMe={rememberMe}
                      onRememberMeChange={setRememberMe}
                      onSubmit={(u, p) => login(u, p)}
                    />
                  ) : (
                    <RegisterForm
                      isDarkMode={isDarkMode}
                      values={registerForm}
                      onChange={setRegisterForm}
                      loading={authLoading}
                      validated={registerValidated}
                      onValidatedChange={setRegisterValidated}
                      onSubmit={(u, p, e) => register(u, p, e)}
                    />
                  )}

                  <div className="text-center">
                    <button
                      className="btn btn-link"
                      onClick={() => setShowRegister(!showRegister)}
                      aria-label={showRegister ? t('auth.already', { defaultValue: 'Already have an account? Sign in' }) : t('auth.need', { defaultValue: "Don't have an account? Create one" })}
                    >
                      {showRegister ? t('auth.already', { defaultValue: 'Already have an account? Sign in' }) : t('auth.need', { defaultValue: "Don't have an account? Create one" })}
                    </button>
                  </div>

                  <div className="text-center mt-3">
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setIsDarkMode(!isDarkMode)}
                    >
                      {isDarkMode ? t('nav.light') : t('nav.dark')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main application UI
  return (
    <div className={`min-vh-100 ${isDarkMode ? 'bg-dark text-light' : 'bg-light text-dark'}`}>
      {/* Password Update Modal */}
      <PasswordModal
        show={showPasswordForm}
        isDarkMode={isDarkMode}
        values={passwordForm}
        onChange={setPasswordForm}
        onClose={() => setShowPasswordForm(false)}
        onSubmit={handlePasswordUpdate}
      />
      {/* Page Header */}
      <div className="page-header d-print-none">
        <div className="container-xl">
          <div className="row g-2 align-items-center">
            <div className="col">
              <div className="page-pretitle">Personal Finance</div>
              <h2 className="page-title d-flex align-items-center gap-2">
                {getPageTitle()}
                {loading && (
                  <span className="spinner-border spinner-border-sm text-light" aria-live="polite" aria-label={t('label.loading', { defaultValue: 'Loading' })}></span>
                )}
              </h2>
            </div>
            <div className="col-auto ms-auto d-print-none">
              <HeaderControls
                isDarkMode={isDarkMode}
                onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
                currency={currency}
                onSetCurrency={(c) => { setCurrency(c); localStorage.setItem('currency', c); }}
                navigateMonth={navigateMonth}
                goToToday={goToToday}
                monthInputValue={monthInputValue}
                onMonthChange={onMonthChange}
                user={user}
                onChangePasswordClick={() => setShowPasswordForm(true)}
                onLogout={logout}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Nav Tabs */}
      <div className="page-header-tabs">
        <div className="container-xl">
          <ul className="nav nav-tabs nav-pills nav-fill" aria-label="Sections">
            <li className="nav-item">
              <a
                href="#planning"
                className={`nav-link ${activeSection === 'planning' ? 'active' : ''}`}
                role="tab"
                aria-current={activeSection === 'planning' ? 'page' : undefined}
              >
                Planning
              </a>
            </li>
            <li className="nav-item">
              <a
                href="#tracking"
                className={`nav-link ${activeSection === 'tracking' ? 'active' : ''}`}
                role="tab"
                aria-current={activeSection === 'tracking' ? 'page' : undefined}
              >
                Tracking
              </a>
            </li>
            <li className="nav-item">
              <a
                href="#analytics"
                className={`nav-link ${activeSection === 'analytics' ? 'active' : ''}`}
                role="tab"
                aria-current={activeSection === 'analytics' ? 'page' : undefined}
              >
                Analytics
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="container-fluid py-4">

        {/* Anchor: Planning */}
        <div id="planning" className="section-anchor"></div>

        <PlanningSection
          isDarkMode={isDarkMode}
          title={t('section.predictedBudget', { month: getMonthName(currentDate.getMonth() + 1), year: currentDate.getFullYear() })}
          monthLabel={`${getMonthName(currentDate.getMonth() + 1)} ${currentDate.getFullYear()}`}
          incomeSources={predictedBudget.incomeSources}
          outcomeSources={predictedBudget.outcomeSources}
          parseLocaleAmount={parseLocaleAmount}
          formatCurrency={formatCurrency}
          onIncomeUpdate={(index, next) => {
            const updated = [...predictedBudget.incomeSources]
            updated[index] = next
            setPredictedBudget(prev => ({ ...prev, incomeSources: updated }))
          }}
          onIncomeBlurSave={(index) => autoSaveIncomeSource({ ...predictedBudget.incomeSources[index] })}
          onIncomeRemoveUnsaved={(index) => {
            const updated = predictedBudget.incomeSources.filter((_, i) => i !== index)
            setPredictedBudget(prev => ({ ...prev, incomeSources: updated }))
          }}
          onIncomeDeletePersisted={async (id) => { await deleteIncome(id); }}
          onIncomeAddEmpty={() => setPredictedBudget(prev => ({ ...prev, incomeSources: [...prev.incomeSources, { id: 0, name: '', amount_cents: 0 }] }))}
          onOutcomeUpdate={(index, next) => {
            const updated = [...predictedBudget.outcomeSources]
            updated[index] = next
            setPredictedBudget(prev => ({ ...prev, outcomeSources: updated }))
          }}
          onOutcomeBlurSave={(index) => autoSaveOutcomeSource({ ...predictedBudget.outcomeSources[index] })}
          onOutcomeRemoveUnsaved={(index) => {
            const updated = predictedBudget.outcomeSources.filter((_, i) => i !== index)
            setPredictedBudget(prev => ({ ...prev, outcomeSources: updated }))
          }}
          onOutcomeDeletePersisted={async (id) => { await deleteOutcome(id); }}
          onOutcomeAddEmpty={() => setPredictedBudget(prev => ({ ...prev, outcomeSources: [...prev.outcomeSources, { id: 0, name: '', amount_cents: 0 }] }))}
          totalIncome={predictedBudget.totalIncome}
          totalOutcome={predictedBudget.totalOutcome}
          difference={predictedBudget.difference}
          totalIncomeLabel={t('label.totalIncomes')}
          totalOutcomeLabel={t('label.totalOutcomes')}
          differenceLabel={t('label.difference')}
          incomeHelp={t('section.predictedIncome.desc')}
          outcomeHelp={t('section.predictedOutcome.desc')}
        />

        {/* Manual Current Month Budget (Bank and planned deductions) */}
        <div id="tracking" className="section-anchor"></div>
        <ManualBudgetSection
          isDarkMode={isDarkMode}
          monthLabel={`${getMonthName(currentDate.getMonth() + 1)} ${currentDate.getFullYear()}`}
          currencySymbol={currencySymbol}
          manualBudget={manualBudget}
          setManualBudget={setManualBudget}
          parseLocaleAmount={parseLocaleAmount}
          formatCurrency={formatCurrency}
          resetLabel={t('btn.reset') ?? 'Reset'}
          bankLabel={t('label.bankAmount')}
          plannedLabel={t('label.plannedExpenses')}
          formulaHint={t('label.formula')}
          toggleTitle={t('btn.toggleSign') ?? 'Toggle sign'}
          deleteLabel={t('btn.delete')}
          addItemLabel={t('btn.addItem')}
          remainingLabel={t('label.remaining')}
          positiveNegativeHint={t('label.positiveNegativeHint') ?? 'Tip: positive values add to remaining; negative values subtract.'}
        />

        {/* Additional Charts Row */}
        <div id="analytics" className="section-anchor"></div>
        <div className="row">

          {/* Budget Overview Chart */}
          <div className="col-lg-6 mb-4">
            <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
              <div className="card-header">
                <h3>{t('section.budgetOverview')}</h3>
              </div>
              <div className="card-body">
                <div style={{ height: '300px' }}>
                  {!dataLoaded ? (
                    <div className="d-flex justify-content-center align-items-center h-100" aria-busy="true" aria-live="polite">
                      <Spinner animation="border" />
                    </div>
                  ) : (
                    <BudgetOverviewChart
                      isDarkMode={isDarkMode}
                      labels={[t('label.totalIncomes'), t('label.totalOutcomes')]}
                      data={[predictedBudget.totalIncome / 100, predictedBudget.totalOutcome / 100]}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Savings Tracker */}
          <div className="col-xl-6 col-lg-12 mb-4">
            <div className={`card h-100 ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
              <div className="card-header">
                <h3>{t('section.savings')}</h3>
              </div>
              <div className="card-body">
                <div className="row g-3 mb-3">
                  <div className="col-md-6 col-12">
                    <label className="form-label">{t('label.targetAmount')}</label>
                    <input
                      type="number"
                      className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                      value={savingsTracker.targetAmount}
                      onChange={(e) => setSavingsTracker({ ...savingsTracker, targetAmount: parseFloat(e.target.value) || 0 })}
                      inputMode="decimal" step="0.01"
                    />
                  </div>
                  <div className="col-md-6 col-12">
                    <label className="form-label">{t('label.currentAmount')}</label>
                    <input
                      type="number"
                      className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                      value={savingsTracker.currentAmount}
                      onChange={(e) => setSavingsTracker({ ...savingsTracker, currentAmount: parseFloat(e.target.value) || 0 })}
                      inputMode="decimal" step="0.01"
                    />
                  </div>
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-md-6 col-12">
                    <label className="form-label">{t('label.monthlyContribution')}</label>
                    <input
                      type="number"
                      className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                      value={savingsTracker.monthlyContribution}
                      onChange={(e) => setSavingsTracker({ ...savingsTracker, monthlyContribution: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="col-md-6 col-12">
                    <div className="form-label">{t('label.monthsToTarget')}</div>
                    <div className="form-control-plaintext">
                      {Math.ceil((savingsTracker.targetAmount - savingsTracker.currentAmount) / Math.max(savingsTracker.monthlyContribution, 1))} months
                    </div>
                  </div>
                </div>
                <div style={{ height: '200px' }}>
                  {!dataLoaded ? (
                    <div className="d-flex justify-content-center align-items-center h-100" aria-busy="true" aria-live="polite">
                      <Spinner animation="border" />
                    </div>
                  ) : (
                    <SavingsProgressChart
                      isDarkMode={isDarkMode}
                      currentAmount={savingsTracker.currentAmount}
                      targetAmount={savingsTracker.targetAmount}
                      formatCurrency={formatCurrency}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* KPI: Income vs Outcomes Trend */}
          <div className="col-12 mb-4">
            <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
              <div className="card-header">
                <h3>{t('section.kpiTrend', { defaultValue: 'Income vs Outcomes Trend' })}</h3>
              </div>
              <div className="card-body">
                <div style={{ height: '300px' }}>
                  {!dataLoaded ? (
                    <div className="d-flex justify-content-center align-items-center h-100">
                      <Spinner animation="border" />
                    </div>
                  ) : (
                    <KpiTrendChart
                      isDarkMode={isDarkMode}
                      labels={kpiLabels}
                      incomeSeries={kpiIncomeSeries}
                      outcomeSeries={kpiOutcomeSeries}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Manual Budget Daily Series */}
          <div className="col-12 mb-4">
            <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
              <div className="card-header">
                <h3>{t('section.manualBudgetDaily', { defaultValue: 'Manual Budget (Daily Series)' })}</h3>
              </div>
              <div className="card-body">
                <div style={{ height: '300px' }}>
                  {!dataLoaded ? (
                    <div className="d-flex justify-content-center align-items-center h-100" aria-busy="true" aria-live="polite">
                      <Spinner animation="border" />
                    </div>
                  ) : (
                    <ManualBudgetDailyChart
                      isDarkMode={isDarkMode}
                      year={currentDate.getFullYear()}
                      monthIndex0={currentDate.getMonth()}
                      bankAmount={manualBudget.bankAmount}
                      itemsTotal={manualBudget.items.reduce((s, i) => s + (i.amount || 0), 0)}
                    />
                  )}
                </div>
                <div className="text-muted small mt-2">
                  {t('label.noteDailySeries') ?? 'Note: series are plotted per day. Items are planned totals (no dates), so lines are flat unless values change.'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Income Sources Pie Chart */}
          <div className="col-lg-6 mb-4">
            <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
              <div className="card-header">
                <h3>{t('section.incomeBreakdown')}</h3>
              </div>
              <div className="card-body">
                <div style={{ height: '300px' }}>
                  {predictedBudget.incomeSources.length > 0 ? (
                    <IncomeBreakdownChart
                      isDarkMode={isDarkMode}
                      items={predictedBudget.incomeSources}
                      formatCurrency={formatCurrency}
                    />
                  ) : (
                    <div className="text-center text-muted pt-5">
                      <p>No income sources available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Outcome Sources Pie Chart */}
          <div className="col-lg-6 mb-4">
            <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
              <div className="card-header">
                <h3>Outcome Sources Breakdown</h3>
              </div>
              <div className="card-body">
                <div style={{ height: '300px' }}>
                  {predictedBudget.outcomeSources.length > 0 ? (
                    <OutcomeBreakdownChart
                      isDarkMode={isDarkMode}
                      items={predictedBudget.outcomeSources}
                      formatCurrency={formatCurrency}
                    />
                  ) : (
                    <div className="text-center text-muted pt-5">
                      <p>No outcome sources available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Back to top */}
      {showBackToTop && (
        <button
          type="button"
          className="btn btn-primary position-fixed"
          style={{ right: '1rem', bottom: '1.25rem', borderRadius: '999px', boxShadow: '0 0.5rem 1rem rgba(0,0,0,0.15)' }}
          onClick={scrollToTop}
          aria-label="Back to top"
        >
          ↑
        </button>
      )}
    </div>
  );
};

export default App;
