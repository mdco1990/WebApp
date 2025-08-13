import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useMonthlyData } from './hooks/useMonthlyData';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useNavigation } from './hooks/useNavigation';
import { useBudgetState } from './hooks/useBudgetState';
import { useManualBudget } from './hooks/useManualBudget';
// Removed PlanningSectionWrapper wrapper to reduce indirection
import ManualBudgetSection from './components/ManualBudgetSection';
import SavingsSection from './components/SavingsSection';
import PasswordModal from './components/PasswordModal';
import HeaderControls from './components/HeaderControls';
import AuthScreen from './components/AuthScreen';
import AnalyticsChartsSection from './components/AnalyticsChartsSection';
import PlanningSection from './components/PlanningSection';
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
import type { IncomeSource, OutcomeSource } from './types/budget';

// Lightweight sub components to reduce App complexity
type PageHeaderProps = { title: string; loading: boolean; HeaderControlsComp: React.ReactNode };
const PageHeader: React.FC<PageHeaderProps> = ({ title, loading, HeaderControlsComp }) => (
  <div className="page-header d-print-none">
    <div className="container-xl">
      <div className="row g-2 align-items-center">
        <div className="col">
          <div className="page-pretitle">Personal Finance</div>
          <h2 className="page-title d-flex align-items-center gap-2">
            {title}
            {loading && <span className="spinner-border spinner-border-sm text-light" aria-live="polite" aria-label="Loading"></span>}
          </h2>
        </div>
        <div className="col-auto ms-auto d-print-none">{HeaderControlsComp}</div>
      </div>
    </div>
  </div>
);

interface SectionTabsProps { active: string; t: (k:string, opts?:Record<string,unknown>)=>string }
const SectionTabs: React.FC<SectionTabsProps> = ({ active, t }) => (
  <div className="page-header-tabs">
    <div className="container-xl">
      <ul className="nav nav-tabs nav-pills nav-fill" aria-label="Sections">
        {['planning','tracking','savings','analytics'].map(id => (
          <li key={id} className="nav-item">
            <a href={`#${id}`} className={`nav-link ${active===id?'active':''}`} aria-current={active===id? 'page': undefined}>
              {t(`nav.${id}`, { defaultValue: id.charAt(0).toUpperCase()+id.slice(1) })}
            </a>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { push } = useToast();

  // Custom hooks
  const auth = useAuth();
  const theme = useTheme();
  const navigation = useNavigation();
  const budgetState = useBudgetState();
  const manualBudget = useManualBudget(navigation.currentDate);

  // Local state
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', password: '', email: '' });
  const [showRegister, setShowRegister] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loginValidated, setLoginValidated] = useState(false);
  const [registerValidated, setRegisterValidated] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoUpdate] = useState(false); // Disabled to prevent interference with editing

  // Helper to merge server list with any unsaved client-only items (id missing or 0)
  const mergeSources = useCallback(
    <T extends { id?: number; name: string; amount_cents: number }>(
      prevList: T[],
      incomingList: T[]
    ) => {
      const incoming = Array.isArray(incomingList) ? incomingList : [];
      const unsaved = (prevList || []).filter((s) => !s.id || s.id === 0);
      const dedupUnsaved = unsaved.filter(
        (u) => !incoming.some((s) => s.name === u.name && s.amount_cents === u.amount_cents)
      );
      return [
        ...incoming.map((s) => ({ ...s })),
        ...dedupUnsaved.map((u) => ({ ...u })), // keep client_id
      ];
    },
    []
  );

  // Helper functions
  const formatCurrency = useCallback(
    (cents: number) => {
      const locale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: theme.currency,
      }).format(cents / 100);
    },
    [i18n.language, theme.currency]
  );
  const currencySymbol = theme.currency === 'EUR' ? '€' : '$';

  const formatMonth = useCallback(
    (date: Date, length: 'long' | 'short' = 'long') => {
      const locale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';
      return new Intl.DateTimeFormat(locale, { month: length }).format(date);
    },
    [i18n.language]
  );

  const getPageTitle = useCallback(() => {
    const monthName = formatMonth(navigation.currentDate, 'long');
    return t('app.title', { month: monthName, year: navigation.currentDate.getFullYear() });
  }, [navigation.currentDate, t, formatMonth]);

  const parseLocaleAmount = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    
    // Remove everything except digits, comma, dot, and minus/plus
    let cleaned = value.trim().replace(/[^0-9,.\-+]/g, '');
    
    // Handle sign
    const isNegative = cleaned.startsWith('-');
    const isPositive = cleaned.startsWith('+');
    if (isNegative || isPositive) {
      cleaned = cleaned.substring(1);
    }
    
    // Count separators
    const commaCount = (cleaned.match(/,/g) || []).length;
    const dotCount = (cleaned.match(/\./g) || []).length;
    
    let normalized = cleaned;
    
    if (commaCount === 0 && dotCount <= 1) {
      // Simple case: "12.56" or "12"
      normalized = cleaned;
    } else if (dotCount === 0 && commaCount === 1) {
      // European format: "12,56"  
      normalized = cleaned.replace(',', '.');
    } else if (commaCount > 0 && dotCount > 0) {
      // Mixed separators: determine which is decimal
      const lastComma = cleaned.lastIndexOf(',');
      const lastDot = cleaned.lastIndexOf('.');
      
      if (lastDot > lastComma) {
        // Dot is decimal separator: "1,234.56"
        normalized = cleaned.replace(/,/g, '');
      } else {
        // Comma is decimal separator: "1.234,56"
        normalized = cleaned.replace(/\./g, '').replace(',', '.');
      }
    } else if (commaCount > 1 || dotCount > 1) {
      // Multiple separators of same type: keep last as decimal
      if (commaCount > 1) {
        const lastCommaIndex = cleaned.lastIndexOf(',');
        normalized = cleaned.substring(0, lastCommaIndex).replace(/,/g, '') + 
                     '.' + cleaned.substring(lastCommaIndex + 1);
      } else if (dotCount > 1) {
        const lastDotIndex = cleaned.lastIndexOf('.');
        normalized = cleaned.substring(0, lastDotIndex).replace(/\./g, '') + 
                     '.' + cleaned.substring(lastDotIndex + 1);
      }
    }
    
    const parsed = Number.parseFloat(normalized);
    const result = Number.isFinite(parsed) ? parsed : 0;
    
    return (isNegative && result !== 0) ? -result : result;
  };

  // Hook: monthly data (budget sources) for current year-month
  const curYear = navigation.currentDate.getFullYear();
  const curMonth = navigation.currentDate.getMonth() + 1;
  const ym = useMemo(() => ({ year: curYear, month: curMonth }), [curYear, curMonth]);
  const {
    data: monthly,
    loading: monthlyLoading,
    reload,
    addDefaultData: addDefaultsHook,
    autoSaveIncomeSource: saveIncomeHook,
    autoSaveOutcomeSource: saveOutcomeHook,
    deleteIncome,
    deleteOutcome,
  } = useMonthlyData(auth.sessionId ? ym : null);

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      push('New passwords do not match!', 'error');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      push('New password must be at least 6 characters long!', 'error');
      return;
    }
    auth.updatePassword(passwordForm.currentPassword, passwordForm.newPassword).then((success) => {
      if (success) {
        setShowPasswordForm(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    });
  };

  // Sync predictedBudget from hook data
  useEffect(() => {
    setLoading(monthlyLoading);
    if (monthly) {
      const totalIncome = monthly.total_income_cents || 0;
      const totalOutcome = monthly.total_budget_cents || 0;
      budgetState.setPredictedBudget((prev) => {
        return {
          ...prev,
          incomeSources: mergeSources(prev.incomeSources, monthly.income_sources || []),
          outcomeSources: mergeSources(prev.outcomeSources, monthly.budget_sources || []),
          totalIncome,
          totalOutcome,
          difference: totalIncome - totalOutcome,
        };
      });
      setDataLoaded(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthly, monthlyLoading, mergeSources]);

  // Add default data if none exists
  const addDefaultData = useCallback(async () => {
    try {
      await addDefaultsHook();
    } catch {
      push('Failed to add default data', 'error');
    }
  }, [addDefaultsHook, push]);

  // Auto-save functions
  const autoSaveIncomeSource = async (source: IncomeSource) => {
    try {
      await saveIncomeHook(source, ym);
    } catch {
      push('Failed to save income source', 'error');
    }
  };

  const autoSaveOutcomeSource = async (source: OutcomeSource) => {
    try {
      await saveOutcomeHook(source, ym);
    } catch {
      push('Failed to save budget source', 'error');
    }
  };

  // Effects
  useEffect(() => {
    document.title = getPageTitle();
  }, [navigation.currentDate, t, getPageTitle]);

  // Reload monthly data on login
  useEffect(() => {
    if (auth.sessionId) reload();
  }, [auth.sessionId, reload]);

  useEffect(() => {
    // Add default data only when BOTH lists are empty to avoid overwriting freshly added items
    if (auth.sessionId && dataLoaded) {
      const noIncome = budgetState.predictedBudget.incomeSources.length === 0;
      const noOutcome = budgetState.predictedBudget.outcomeSources.length === 0;
      if (noIncome && noOutcome) {
        addDefaultData();
      }
    }
  }, [
    auth.sessionId,
    dataLoaded,
    budgetState.predictedBudget.incomeSources.length,
    budgetState.predictedBudget.outcomeSources.length,
    addDefaultData,
  ]);

  useEffect(() => {
    let interval: number | undefined;
    if (autoUpdate) {
      interval = window.setInterval(() => {
        reload();
      }, 30000); // Update every 30 seconds
    }
    return () => {
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [autoUpdate, reload]);

  // Login/Register UI
  if (auth.showLogin) {
    return (
      <AuthScreen
        isDarkMode={theme.isDarkMode}
        showRegister={showRegister}
        setShowRegister={setShowRegister}
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        registerForm={registerForm}
        setRegisterForm={setRegisterForm}
        authLoading={auth.authLoading}
        loginValidated={loginValidated}
        setLoginValidated={setLoginValidated}
        registerValidated={registerValidated}
        setRegisterValidated={setRegisterValidated}
        rememberMe={rememberMe}
        setRememberMe={setRememberMe}
        onLogin={async (u, p) => {
          const success = await auth.login(u, p);
          if (success) reload();
        }}
        onRegister={async (u, p, e) => {
          const success = await auth.register(u, p, e);
          if (success) setShowRegister(false);
        }}
        onToggleDarkMode={() => theme.setIsDarkMode(!theme.isDarkMode)}
      />
    );
  }

  // Main application UI
  return (
    <div className="min-vh-100">
      {/* Password Update Modal */}
      <PasswordModal
        show={showPasswordForm}
        isDarkMode={theme.isDarkMode}
        values={passwordForm}
        onChange={setPasswordForm}
        onClose={() => setShowPasswordForm(false)}
        onSubmit={handlePasswordUpdate}
      />
      {/* Page Header */}
  <PageHeader title={getPageTitle()} loading={loading} HeaderControlsComp={<HeaderControls
                isDarkMode={theme.isDarkMode}
                onToggleDarkMode={() => theme.setIsDarkMode(!theme.isDarkMode)}
                currency={theme.currency}
                onSetCurrency={theme.setCurrency}
                navigateMonth={navigation.navigateMonth}
                goToToday={navigation.goToToday}
                monthInputValue={navigation.monthInputValue}
                onMonthChange={navigation.onMonthChange}
                user={auth.user}
                onChangePasswordClick={() => setShowPasswordForm(true)}
                onLogout={auth.logout}
              />} />
      <SectionTabs active={navigation.activeSection} t={t} />

      {/* Predicted Budget */}
      <div id="planning" className="section-anchor"></div>
      <div className="container-fluid py-4" style={{ padding: '1rem', margin: '0 auto', maxWidth: '100%' }}>
        <PlanningSection
          isDarkMode={theme.isDarkMode}
          monthLabel={`${formatMonth(navigation.currentDate, 'long')} ${navigation.currentDate.getFullYear()}`}
          incomeSources={budgetState.predictedBudget.incomeSources}
          outcomeSources={budgetState.predictedBudget.outcomeSources}
              parseLocaleAmount={parseLocaleAmount}
              formatCurrency={formatCurrency}
              onIncomeUpdate={(index: number, next: IncomeSource) => {
                const updated = [...budgetState.predictedBudget.incomeSources];
                updated[index] = next;
                budgetState.setPredictedBudget((prev) => ({ ...prev, incomeSources: updated }));
              }}
              onIncomeBlurSave={(index: number) => autoSaveIncomeSource({ ...budgetState.predictedBudget.incomeSources[index] })}
              onIncomeRemoveUnsaved={(index: number) => {
                const updated = budgetState.predictedBudget.incomeSources.filter((_, i) => i !== index);
                budgetState.setPredictedBudget((prev) => ({ ...prev, incomeSources: updated }));
              }}
              onIncomeDeletePersisted={async (id: number) => { await deleteIncome(id); }}
              onIncomeAddEmpty={() => budgetState.setPredictedBudget((prev) => ({ ...prev, incomeSources: [...prev.incomeSources, { id: 0, client_id: `tmp_inc_${Date.now()}_${Math.random().toString(36).slice(2)}`, name: '', amount_cents: 0 }] }))}
              onOutcomeUpdate={(index: number, next: OutcomeSource) => {
                const updated = [...budgetState.predictedBudget.outcomeSources];
                updated[index] = next;
                budgetState.setPredictedBudget((prev) => ({ ...prev, outcomeSources: updated }));
              }}
              onOutcomeBlurSave={(index: number) => autoSaveOutcomeSource({ ...budgetState.predictedBudget.outcomeSources[index] })}
              onOutcomeRemoveUnsaved={(index: number) => {
                const updated = budgetState.predictedBudget.outcomeSources.filter((_, i) => i !== index);
                budgetState.setPredictedBudget((prev) => ({ ...prev, outcomeSources: updated }));
              }}
              onOutcomeDeletePersisted={async (id: number) => { await deleteOutcome(id); }}
              onOutcomeAddEmpty={() => budgetState.setPredictedBudget((prev) => ({ ...prev, outcomeSources: [...prev.outcomeSources, { id: 0, client_id: `tmp_out_${Date.now()}_${Math.random().toString(36).slice(2)}`, name: '', amount_cents: 0 }] }))}
              totalIncome={budgetState.predictedBudget.totalIncome}
              totalOutcome={budgetState.predictedBudget.totalOutcome}
              difference={budgetState.predictedBudget.difference}
              totalIncomeLabel={t('label.totalIncomes')}
              totalOutcomeLabel={t('label.totalOutcomes')}
              differenceLabel={t('label.difference')}
              incomeHelp={t('section.predictedIncome.desc')}
          outcomeHelp={t('section.predictedOutcome.desc')}
        />
      </div>

      {/* Manual Current Month Budget (Bank and planned deductions) */}
      <div id="tracking" className="section-anchor"></div>
      <ManualBudgetSection
        isDarkMode={theme.isDarkMode}
        title={t('section.manualBudget', {
          defaultValue: 'Manual Budget (Bank and Planned Deductions)',
        })}
        monthLabel={`${formatMonth(navigation.currentDate, 'long')} ${navigation.currentDate.getFullYear()}`}
        currencySymbol={currencySymbol}
        manualBudget={manualBudget.manualBudget}
        setManualBudget={manualBudget.setManualBudget}
        parseLocaleAmount={parseLocaleAmount}
        formatCurrency={formatCurrency}
        resetLabel={t('btn.reset', { defaultValue: 'Reset' })}
        bankLabel={t('label.bankAmount')}
        plannedLabel={t('label.plannedExpenses')}
        formulaHint={t('label.formula')}
        toggleTitle={t('btn.toggleSign') ?? 'Toggle sign'}
        deleteLabel={t('btn.delete')}
        addItemLabel={t('btn.addItem')}
        remainingLabel={t('label.remaining')}
        positiveNegativeHint={
          t('label.positiveNegativeHint') ??
          'Tip: positive values add to remaining; negative values subtract.'
        }
      />

      {/* Savings Section */}
      <div id="savings" className="section-anchor"></div>
      <SavingsSection
        isDarkMode={theme.isDarkMode}
        dataLoaded={dataLoaded}
        savingsTracker={budgetState.savingsTracker}
        setSavingsTracker={budgetState.setSavingsTracker}
        formatCurrency={formatCurrency}
      />

      {/* Additional Charts Row */}
      <div id="analytics" className="section-anchor"></div>
      <AnalyticsChartsSection
        isDarkMode={theme.isDarkMode}
        dataLoaded={dataLoaded}
        predictedBudget={budgetState.predictedBudget}
        savingsTracker={budgetState.savingsTracker}
        currentDate={navigation.currentDate}
        manualBudget={manualBudget.manualBudget}
        formatCurrency={formatCurrency}
      />

      {/* Back to top */}
      {navigation.showBackToTop && (
        <button
          type="button"
          className="btn btn-primary position-fixed"
          style={{
            right: '1rem',
            bottom: '1.25rem',
            borderRadius: '999px',
            boxShadow: '0 0.5rem 1rem rgba(0,0,0,0.15)',
          }}
          onClick={navigation.scrollToTop}
          aria-label="Back to top"
        >
          ↑
        </button>
      )}
    </div>
  );
};

export default App;
