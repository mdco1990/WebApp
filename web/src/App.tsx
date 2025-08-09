import React, { useState, useEffect, useCallback } from 'react';
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
import { Bar, Pie, Line } from 'react-chartjs-2';
import 'bootstrap/dist/css/bootstrap.min.css';

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
interface IncomeSource {
  id: number;
  name: string;
  amount_cents: number;
}

interface OutcomeSource {
  id?: number;
  name: string;
  amount_cents: number;
}

interface PredictedBudget {
  incomeSources: IncomeSource[];
  outcomeSources: OutcomeSource[];
  totalIncome: number;
  totalOutcome: number;
  difference: number;
}

interface Expense {
  id: number;
  description: string;
  amount_cents: number;
  category?: string;
}

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

interface User {
  id: number;
  username: string;
  email?: string;
  is_admin?: boolean;
}

interface LoginData {
  success: boolean;
  message: string;
  session_id?: string;
  user?: User;
}

// Backend aggregated payload
interface MonthlyData {
  year: number;
  month: number;
  month_name?: string;
  income_sources: IncomeSource[];
  budget_sources: OutcomeSource[]; // naming: backend returns budget sources; UI calls them outcome sources
  expenses: Expense[];
  total_income_cents: number;
  total_budget_cents: number;
  total_expenses_cents: number;
  remaining_cents: number;
}

const App: React.FC = () => {
  // State management
  const [activeSection, setActiveSection] = useState<'overview' | 'planning' | 'analytics' | 'records'>('overview');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
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
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: '', type: 'expense' });
  const [manualBudget, setManualBudget] = useState<ManualBudgetState>(() => ({
    bankAmount: 321.12,
    items: [
      { id: 'mb1', name: 'Item A', amount: 100.96 },
      { id: 'mb2', name: 'Item B', amount: 146.31 },
      { id: 'mb3', name: 'Item C', amount: 10.99 },
      { id: 'mb4', name: 'Extra', amount: 390.00 }
    ]
  }));
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

  const { t, i18n } = useTranslation();
  // Security: do not hardcode API keys; read from localStorage if needed (dev only)
  const apiKey = localStorage.getItem('api_key') || '';
  const [currency, setCurrency] = useState<'EUR' | 'USD'>(() => (localStorage.getItem('currency') as 'EUR' | 'USD') || 'EUR');
  const baseURL = '/api';

  // Helper functions
  const formatCurrency = (cents: number) => {
    const locale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';
    return new Intl.NumberFormat(locale, { 
      style: 'currency', 
      currency 
    }).format(cents / 100);
  };
  const currencySymbol = currency === 'EUR' ? '€' : '$';

  const getCurrentYearMonth = () => {
    return {
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1
    };
  };

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
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      ...(options.headers as Record<string, string>)
    };

    if (sessionId) {
      headers['Authorization'] = `Bearer ${sessionId}`;
    }

  const url = endpoint.startsWith('/api') ? endpoint : `${baseURL}${endpoint}`;
  const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  };

  // Authentication functions
  const login = async (username: string, password: string) => {
    try {
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
        loadData();
      } else {
        alert(data.message || t('auth.error.login'));
      }
    } catch (error) {
      console.error('Login error:', error);
      alert(t('auth.error.login'));
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
        alert(t('btn.updatePassword') + ' ✓');
        setShowPasswordForm(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const error = await response.text();
        alert(`Password update failed: ${error}`);
      }
    } catch (error) {
      console.error('Password update error:', error);
      alert('Password update failed. Please try again.');
    }
  };

  const register = async (username: string, password: string, email: string) => {
    try {
      const response = await fetch(`/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email })
      });

      if (response.ok) {
        alert(t('auth.success.register'));
        setShowRegister(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Please try again.');
    }
  };

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      alert('New password must be at least 6 characters long!');
      return;
    }
    updatePassword(passwordForm.currentPassword, passwordForm.newPassword);
  };

  // Data loading and management
  const loadData = useCallback(async () => {
    if (!sessionId) return;

    try {
      const { year, month } = getCurrentYearMonth();
      // Load consolidated monthly data in one request
      const data: MonthlyData = await apiCall(`/api/v1/monthly-data?year=${year}&month=${month}`);

      const totalIncome = data?.total_income_cents || 0;
      const totalOutcome = data?.total_budget_cents || 0;

      setPredictedBudget(prev => ({
        ...prev,
        incomeSources: data?.income_sources || [],
        outcomeSources: data?.budget_sources || [],
        totalIncome,
        totalOutcome,
        difference: totalIncome - totalOutcome,
      }));

      setExpenses(data?.expenses || []);
      setDataLoaded(true);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, [sessionId, currentDate]);

  // Add default data if none exists
  const addDefaultData = async () => {
    try {
      const { year, month } = getCurrentYearMonth();
      await apiCall('/api/v1/seed-defaults', {
        method: 'POST',
        body: JSON.stringify({ year, month })
      });
      await loadData();
    } catch (error) {
      console.error('Failed to add default data:', error);
    }
  };

  // Auto-save functions
  const autoSaveIncomeSource = async (source: IncomeSource) => {
    try {
      const { year, month } = getCurrentYearMonth();
      if (source.id) {
        await apiCall(`/api/v1/income-sources/${source.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: source.name,
            amount_cents: source.amount_cents
          })
        });
      } else {
        await apiCall('/api/v1/income-sources', {
          method: 'POST',
          body: JSON.stringify({
            name: source.name,
            year,
            month,
            amount_cents: source.amount_cents
          })
        });
      }
      loadData();
    } catch (error) {
      console.error('Failed to save income source:', error);
    }
  };

  const autoSaveOutcomeSource = async (source: OutcomeSource) => {
    try {
      const { year, month } = getCurrentYearMonth();
      if (source.id) {
        await apiCall(`/api/v1/budget-sources/${source.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: source.name,
            amount_cents: source.amount_cents
          })
        });
      } else {
        await apiCall('/api/v1/budget-sources', {
          method: 'POST',
          body: JSON.stringify({
            name: source.name,
            year,
            month,
            amount_cents: source.amount_cents
          })
        });
      }
      loadData();
    } catch (error) {
      console.error('Failed to save budget source:', error);
    }
  };

  // Month navigation
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Add record (expense or profit)
  const addExpense = async () => {
    if (!newExpense.description || !newExpense.amount) {
      alert('Please enter both description and amount');
      return;
    }

    let amount = parseLocaleAmount(newExpense.amount);
    if (isNaN(amount) || amount === 0) {
      alert('Please enter a valid amount');
      return;
    }

    // Make amount negative for expenses, positive for profits
    if (newExpense.type === 'expense' && amount > 0) {
      amount = -amount;
    } else if (newExpense.type === 'profit' && amount < 0) {
      amount = -amount;
    }

    try {
      const { year, month } = getCurrentYearMonth();
  const response = await apiCall('/api/v1/expenses', {
        method: 'POST',
        body: JSON.stringify({
          year,
          month,
          description: newExpense.description,
          category: newExpense.category || '',
          amount_cents: Math.round(amount * 100)
        })
      });
      
  if (response?.id) {
        setNewExpense({ description: '', amount: '', category: '', type: 'expense' });
        loadData();
        // Optional: Show success message
        // alert('Record added successfully!');
      } else {
        throw new Error('Failed to add record');
      }
    } catch (error) {
      console.error('Failed to add record:', error);
      alert('Failed to add record. Please try again.');
    }
  };

  // Effects
  useEffect(() => {
    document.title = getPageTitle();
  }, [currentDate]);

  useEffect(() => {
    document.body.className = isDarkMode ? 'bg-dark text-light' : 'bg-light text-dark';
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    if (sessionId) {
      loadData();
    }
  }, [sessionId, loadData]);

  // Observe sections to update active tab on scroll
  useEffect(() => {
    const ids: Array<typeof activeSection> = ['overview', 'planning', 'analytics', 'records'];
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
    try {
      localStorage.setItem(key, JSON.stringify(manualBudget));
    } catch {}
  }, [manualBudget, currentDate]);

  useEffect(() => {
    const key = `manualBudget:${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ManualBudgetState;
        setManualBudget(parsed);
      } catch {}
    }
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
        loadData();
      }, 30000); // Update every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoUpdate, loadData]);

  // Back-to-top visibility
  const [showBackToTop, setShowBackToTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // Chart data
  // KPI time series (Income vs Outcomes Trend) — last point reflects current totals
  const monthShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const kpiLabels = monthShort.slice(0, Math.max(8, (currentDate.getMonth()+1))); // show up to current month or 8 months minimum
  const kpiIncomeSeries = [...Array(kpiLabels.length)].map((_, idx) => idx < kpiLabels.length - 1 ? [4200,4150,4300,4250,4180,4220,4280][idx % 7] : predictedBudget.totalIncome / 100);
  const kpiOutcomeSeries = [...Array(kpiLabels.length)].map((_, idx) => idx < kpiLabels.length - 1 ? [2800,2950,3100,2875,2920,3050,2980][idx % 7] : predictedBudget.totalOutcome / 100);
  const kpiTimeSeriesData = {
    labels: kpiLabels,
    datasets: [
      {
        label: 'Predicted Income',
        data: kpiIncomeSeries,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      },
      {
        label: 'Predicted Outcomes',
        data: kpiOutcomeSeries,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1
      }
    ]
  };
  const budgetChartData = {
  labels: [t('label.totalIncomes'), t('label.totalOutcomes')],
    datasets: [
      {
  label: `${t('table.amount')} ($)`,
        data: [
          predictedBudget.totalIncome / 100,
          predictedBudget.totalOutcome / 100
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  const savingsProgressData = {
  labels: [t('label.currentAmount'), t('label.targetAmount')],
    datasets: [
      {
        data: [savingsTracker.currentAmount, savingsTracker.targetAmount - savingsTracker.currentAmount],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)'
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

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
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      login(loginForm.username, loginForm.password);
                    }}>
                      <div className="mb-3">
                        <label htmlFor="username" className="form-label">{t('auth.username')}</label>
                        <input
                          type="text"
                          className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                          id="username"
                          value={loginForm.username}
                          onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="password" className="form-label">{t('auth.password')}</label>
                        <input
                          type="password"
                          className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                          id="password"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-primary w-100 mb-3">{t('auth.login')}</button>
                    </form>
                  ) : (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      register(registerForm.username, registerForm.password, registerForm.email);
                    }}>
                      <div className="mb-3">
                        <label htmlFor="reg-username" className="form-label">{t('auth.username')}</label>
                        <input
                          type="text"
                          className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                          id="reg-username"
                          value={registerForm.username}
                          onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="reg-email" className="form-label">{t('auth.email')}</label>
                        <input
                          type="email"
                          className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                          id="reg-email"
                          value={registerForm.email}
                          onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                        />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="reg-password" className="form-label">{t('auth.password')}</label>
                        <input
                          type="password"
                          className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                          id="reg-password"
                          value={registerForm.password}
                          onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-success w-100 mb-3">{t('auth.register')}</button>
                    </form>
                  )}
                  
                  <div className="text-center">
                    <button 
                      className="btn btn-link"
                      onClick={() => setShowRegister(!showRegister)}
                    >
                      {showRegister ? t('auth.already') : t('auth.need')}
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
      {showPasswordForm && (
        <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className={`modal-content ${isDarkMode ? 'bg-secondary text-light' : ''}`}>
              <div className="modal-header">
                <h5 className="modal-title">{t('modal.changePassword')}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowPasswordForm(false)}
                ></button>
              </div>
              <form onSubmit={handlePasswordUpdate}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="currentPassword" className="form-label">{t('modal.currentPassword')}</label>
                    <input
                      type="password"
                      className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                      id="currentPassword"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newPassword" className="form-label">{t('modal.newPassword')}</label>
                    <input
                      type="password"
                      className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                      id="newPassword"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="confirmPassword" className="form-label">{t('modal.confirmNewPassword')}</label>
                    <input
                      type="password"
                      className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                      id="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowPasswordForm(false)}
                  >
                    {t('btn.cancel')}
                  </button>
                  <button type="submit" className="btn btn-warning">
                    {t('btn.updatePassword')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Page Header */}
      <div className="page-header d-print-none">
        <div className="container-xl">
          <div className="row g-2 align-items-center">
            <div className="col">
              <div className="page-pretitle">Personal Finance</div>
              <h2 className="page-title">{getPageTitle()}</h2>
            </div>
            <div className="col-auto ms-auto d-print-none">
              <div className="btn-list">
                <div className="btn-group">
                  <button 
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => navigateMonth('prev')}
                  >
                    {t('nav.prev')}
                  </button>
                  <button 
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => navigateMonth('next')}
                  >
                    {t('nav.next')}
                  </button>
                </div>
                <div className="btn-group btn-group-sm" aria-label="Language Switcher">
                  <button className="btn btn-outline-secondary" onClick={() => { i18n.changeLanguage('en'); localStorage.setItem('lang', 'en'); }}>{t('lang.english')}</button>
                  <button className="btn btn-outline-secondary" onClick={() => { i18n.changeLanguage('fr'); localStorage.setItem('lang', 'fr'); }}>{t('lang.french')}</button>
                </div>
                <div className="btn-group btn-group-sm" aria-label="Currency Switcher">
                  <button className={`btn btn-outline-secondary ${currency==='EUR'?'active':''}`} onClick={() => { setCurrency('EUR'); localStorage.setItem('currency', 'EUR'); }}>€ EUR</button>
                  <button className={`btn btn-outline-secondary ${currency==='USD'?'active':''}`} onClick={() => { setCurrency('USD'); localStorage.setItem('currency', 'USD'); }}>$ USD</button>
                </div>
                <button 
                  className="btn btn-outline-secondary btn-sm" 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                >
                  {isDarkMode ? t('nav.light') : t('nav.dark')}
                </button>
                <button 
                  className="btn btn-outline-warning btn-sm" 
                  onClick={() => setShowPasswordForm(true)}
                  title="Change Password"
                >
                  {t('nav.password')}
                </button>
                <button className="btn btn-outline-danger btn-sm" onClick={logout}>
                  {t('nav.logout')} ({user?.username})
                </button>
                {user?.is_admin ? (
                  <>
                    <a 
                      href="/api/" 
                      target="_blank" 
                      className="btn btn-outline-info btn-sm"
                      title="API Documentation"
                      rel="noreferrer"
                    >
                      {t('nav.apiDocs')}
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
            </div>
          </div>
        </div>
      </div>

      {/* Quick Nav Tabs */}
      <div className="page-header-tabs">
        <div className="container-xl">
          <ul className="nav nav-tabs nav-pills nav-fill" role="tablist">
            <li className="nav-item">
              <a
                href="#overview"
                className={`nav-link ${activeSection === 'overview' ? 'active' : ''}`}
                role="tab"
                aria-current={activeSection === 'overview' ? 'page' : undefined}
              >
                Overview
              </a>
            </li>
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
                href="#analytics"
                className={`nav-link ${activeSection === 'analytics' ? 'active' : ''}`}
                role="tab"
                aria-current={activeSection === 'analytics' ? 'page' : undefined}
              >
                Analytics
              </a>
            </li>
            <li className="nav-item">
              <a
                href="#records"
                className={`nav-link ${activeSection === 'records' ? 'active' : ''}`}
                role="tab"
                aria-current={activeSection === 'records' ? 'page' : undefined}
              >
                Records
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="container-fluid py-4">
        
  {/* Anchor: Overview */}
  <div id="overview" className="section-anchor"></div>

        <div className="row">
          {/* Predicted Budget Section */}
          <div className="col-xl-6 col-lg-12 mb-4">
            <div className={`card h-100 ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
              <div className="card-header">
                <h3>{t('section.predictedBudget', { month: getMonthName(currentDate.getMonth() + 1), year: currentDate.getFullYear() })}</h3>
              </div>
              <div className="card-body">
                {/* Income Sources */}
                <div className="mb-4">
                  <h5>{t('section.predictedIncome')}</h5>
                  <p className="text-muted small mb-3">{t('section.predictedIncome.desc')}</p>
                  <div className="row g-2">
                    {predictedBudget.incomeSources.map((source, index) => (
                      <div key={source.id || index} className="col-12">
                        <div className="row g-2">
                          <div className="col-sm-6 col-12">
                            <input
                              type="text"
                              className={`form-control form-control-sm ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                              value={source.name}
                              placeholder="Income source name"
                              onChange={(e) => {
                                const updated = [...predictedBudget.incomeSources];
                                const updatedSource = { ...source, name: e.target.value };
                                updated[index] = updatedSource as IncomeSource;
                                setPredictedBudget(prev => ({ ...prev, incomeSources: updated }));
                              }}
                              onBlur={() => autoSaveIncomeSource({ ...predictedBudget.incomeSources[index] })}
                            />
                          </div>
                          <div className="col-sm-4 col-8">
                            <input
                              type="number"
                              className={`form-control form-control-sm ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                              value={source.amount_cents / 100}
                              onChange={(e) => {
                                const updated = [...predictedBudget.incomeSources];
                                const updatedSource = { ...source, amount_cents: Math.round(parseLocaleAmount(e.target.value || '0') * 100) };
                                updated[index] = updatedSource as IncomeSource;
                                setPredictedBudget(prev => ({ ...prev, incomeSources: updated }));
                              }}
                              onBlur={() => autoSaveIncomeSource({ ...predictedBudget.incomeSources[index] })}
                            />
                          </div>
                          <div className="col-sm-2 col-4">
                            <button 
                              className="btn btn-sm btn-outline-danger w-100"
                              onClick={async () => {
                                if (!source.id) {
                                  // Remove unsaved item from local state
                                  const updated = predictedBudget.incomeSources.filter((_, i) => i !== index);
                                  setPredictedBudget(prev => ({ ...prev, incomeSources: updated }));
                                  return;
                                }
                                
                                if (!confirm(`Are you sure you want to delete "${source.name}"?`)) {
                                  return;
                                }
                                
                                try {
                                  await apiCall(`/api/v1/income-sources/${source.id}`, {method: 'DELETE'});
                                  loadData(); // Refresh data from server
                                } catch (error) {
                                  console.error('Error deleting income source:', error);
                                  alert('Failed to delete income source. Please try again.');
                                }
                              }}
                              title="Delete this income source"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button 
                    className="btn btn-sm btn-outline-primary mt-2"
                    onClick={() => {
                      const updated = [...predictedBudget.incomeSources, {id: 0, name: '', amount_cents: 0}];
                      setPredictedBudget(prev => ({ ...prev, incomeSources: updated }));
                    }}
                  >
                    + Add Income Source
                  </button>
                </div>

                {/* Outcome Sources */}
                <div className="mb-4">
                  <h5>{t('section.predictedOutcome')}</h5>
                  <p className="text-muted small mb-3">{t('section.predictedOutcome.desc')}</p>
                  <div className="row g-2">
                    {predictedBudget.outcomeSources.map((source, index) => (
                      <div key={source.id || index} className="col-12">
                        <div className="row g-2">
                          <div className="col-sm-6 col-12">
                            <input
                              type="text"
                              className={`form-control form-control-sm ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                              value={source.name}
                              placeholder="Outcome source name"
                              onChange={(e) => {
                                const updated = [...predictedBudget.outcomeSources];
                                const updatedSource = { ...source, name: e.target.value };
                                updated[index] = updatedSource as OutcomeSource;
                                setPredictedBudget(prev => ({ ...prev, outcomeSources: updated }));
                              }}
                              onBlur={() => autoSaveOutcomeSource({ ...predictedBudget.outcomeSources[index] })}
                            />
                          </div>
                          <div className="col-sm-4 col-8">
                            <input
                              type="number"
                              className={`form-control form-control-sm ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                              value={source.amount_cents / 100}
                              onChange={(e) => {
                                const updated = [...predictedBudget.outcomeSources];
                                const updatedSource = { ...source, amount_cents: Math.round(parseLocaleAmount(e.target.value || '0') * 100) };
                                updated[index] = updatedSource as OutcomeSource;
                                setPredictedBudget(prev => ({ ...prev, outcomeSources: updated }));
                              }}
                              onBlur={() => autoSaveOutcomeSource({ ...predictedBudget.outcomeSources[index] })}
                            />
                          </div>
                          <div className="col-sm-2 col-4">
                            <button 
                              className="btn btn-sm btn-outline-danger w-100"
                              onClick={async () => {
                                if (!source.id) {
                                  // Remove unsaved item from local state
                                  const updated = predictedBudget.outcomeSources.filter((_, i) => i !== index);
                                  setPredictedBudget(prev => ({ ...prev, outcomeSources: updated }));
                                  return;
                                }
                                
                                if (!confirm(`Are you sure you want to delete "${source.name}"?`)) {
                                  return;
                                }
                                
                                try {
                                  await apiCall(`/api/v1/budget-sources/${source.id}`, {method: 'DELETE'});
                                  loadData(); // Refresh data from server
                                } catch (error) {
                                  console.error('Error deleting outcome source:', error);
                                  alert('Failed to delete outcome source. Please try again.');
                                }
                              }}
                              title="Delete this outcome source"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button 
                    className="btn btn-sm btn-outline-primary mt-2"
                    onClick={() => {
                      const updated = [...predictedBudget.outcomeSources, {id: 0, name: '', amount_cents: 0}];
                      setPredictedBudget(prev => ({ ...prev, outcomeSources: updated }));
                    }}
                  >
                    + Add Outcome Source
                  </button>
                </div>

                {/* Summary */}
                <div className="row g-2">
                  <div className="col-md-4 col-12">
                    <div className="text-center">
                      <strong>{t('label.totalIncomes')}</strong>
                      <div className="h5 text-success">{formatCurrency(predictedBudget.totalIncome)}</div>
                    </div>
                  </div>
                  <div className="col-md-4 col-12">
                    <div className="text-center">
                      <strong>{t('label.totalOutcomes')}</strong>
                      <div className="h5 text-warning">{formatCurrency(predictedBudget.totalOutcome)}</div>
                    </div>
                  </div>
                  <div className="col-md-4 col-12">
                    <div className="text-center">
                      <strong>{t('label.difference')}</strong>
                      <div className={`h5 ${predictedBudget.difference >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(predictedBudget.difference)}
                      </div>
                    </div>
                  </div>
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
                      onChange={(e) => setSavingsTracker({...savingsTracker, targetAmount: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="col-md-6 col-12">
                    <label className="form-label">{t('label.currentAmount')}</label>
                    <input
                      type="number"
                      className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                      value={savingsTracker.currentAmount}
                      onChange={(e) => setSavingsTracker({...savingsTracker, currentAmount: parseFloat(e.target.value) || 0})}
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
                      onChange={(e) => setSavingsTracker({...savingsTracker, monthlyContribution: parseFloat(e.target.value) || 0})}
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
                  <Pie 
                    data={savingsProgressData} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { 
                          labels: { 
                            color: isDarkMode ? '#fff' : '#333' 
                          }
                        }
                      }
                    }} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          {/* Budget Overview Chart */}
          <div className="col-lg-8 mb-4">
            <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
              <div className="card-header">
                <h3>{t('section.budgetOverview')}</h3>
              </div>
              <div className="card-body">
                <div style={{ height: '300px' }}>
                  <Bar 
                    data={budgetChartData} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          ticks: { color: isDarkMode ? '#fff' : '#333' },
                          grid: { color: isDarkMode ? '#555' : '#ddd' }
                        },
                        x: {
                          ticks: { color: isDarkMode ? '#fff' : '#333' },
                          grid: { color: isDarkMode ? '#555' : '#ddd' }
                        }
                      },
                      plugins: {
                        legend: { 
                          labels: { 
                            color: isDarkMode ? '#fff' : '#333' 
                          }
                        }
                      }
                    }} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Add Record */}
          <div className="col-lg-4 mb-4">
            <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
              <div className="card-header">
                <h3>Add Record</h3>
              </div>
              <div className="card-body">
                <form onSubmit={(e) => { e.preventDefault(); addExpense(); }}>
                  <div className="mb-3">
                    <label className="form-label">Type</label>
                    <select
                      className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                      value={newExpense.type}
                      onChange={(e) => setNewExpense({...newExpense, type: e.target.value})}
                      required
                    >
                      <option value="expense">Expense</option>
                      <option value="profit">Profit/Refund</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">{t('label.description')}</label>
                    <input
                      type="text"
                      className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                      placeholder="Enter description"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">{t('label.category')}</label>
                    <input
                      type="text"
                      className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                      placeholder="Category (optional)"
                      value={newExpense.category}
                      onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">{t('label.amount')}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                      placeholder="0.00"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                      required
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="btn btn-success w-100"
                    disabled={!newExpense.description || !newExpense.amount}
                  >
                    Add {newExpense.type === 'expense' ? 'Expense' : 'Profit'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

  {/* Additional Charts Row */}
  <div id="analytics" className="section-anchor"></div>
        <div className="row">
          {/* KPI: Income vs Outcomes Trend */}
          <div className="col-12 mb-4">
            <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
              <div className="card-header">
                <h3>Income vs Outcomes Trend</h3>
              </div>
              <div className="card-body">
                <div style={{ height: '320px' }}>
                  <Line
                    data={kpiTimeSeriesData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'top', labels: { color: isDarkMode ? '#fff' : '#333' } }
                      },
                      scales: {
                        x: { ticks: { color: isDarkMode ? '#fff' : '#333' }, grid: { color: isDarkMode ? '#555' : '#ddd' } },
                        y: {
                          beginAtZero: true,
                          ticks: { color: isDarkMode ? '#fff' : '#333', callback: (v: any) => `$${v}` },
                          grid: { color: isDarkMode ? '#555' : '#ddd' }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Monthly Records Trend (Time Series) */}
          <div className="col-lg-6 mb-4">
            <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
              <div className="card-header">
                <h3>Records Trend (Cumulative)</h3>
              </div>
              <div className="card-body">
                <div style={{ height: '300px' }}>
                  <Line
                    data={{
                      labels: expenses.map((_, idx) => `${idx + 1}`),
                      datasets: [
                        {
                          label: 'Expenses (Cumulative)',
                          data: expenses.reduce<number[]>((acc, e, idx) => {
                            const prev = acc[idx - 1] || 0;
                            acc.push(e.amount_cents < 0 ? prev + Math.abs(e.amount_cents) / 100 : prev);
                            return acc;
                          }, []),
                          borderColor: 'rgba(255, 99, 132, 1)',
                          backgroundColor: 'rgba(255, 99, 132, 0.2)',
                          tension: 0.2,
                          fill: false
                        },
                        {
                          label: 'Profits (Cumulative)',
                          data: expenses.reduce<number[]>((acc, e, idx) => {
                            const prev = acc[idx - 1] || 0;
                            acc.push(e.amount_cents > 0 ? prev + e.amount_cents / 100 : prev);
                            return acc;
                          }, []),
                          borderColor: 'rgba(75, 192, 192, 1)',
                          backgroundColor: 'rgba(75, 192, 192, 0.2)',
                          tension: 0.2,
                          fill: false
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { labels: { color: isDarkMode ? '#fff' : '#333' } } },
                      scales: {
                        x: { ticks: { color: isDarkMode ? '#fff' : '#333' }, grid: { color: isDarkMode ? '#555' : '#ddd' } },
                        y: { ticks: { color: isDarkMode ? '#fff' : '#333' }, grid: { color: isDarkMode ? '#555' : '#ddd' } }
                      }
                    }}
                  />
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
                    <Pie 
                      data={{
                        labels: predictedBudget.incomeSources.map(source => source.name),
                        datasets: [{
                          data: predictedBudget.incomeSources.map(source => source.amount_cents / 100),
                          backgroundColor: [
                            'rgba(54, 162, 235, 0.6)',
                            'rgba(255, 99, 132, 0.6)',
                            'rgba(255, 206, 86, 0.6)',
                            'rgba(75, 192, 192, 0.6)',
                            'rgba(153, 102, 255, 0.6)',
                            'rgba(255, 159, 64, 0.6)'
                          ],
                          borderColor: [
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 99, 132, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 159, 64, 1)'
                          ],
                          borderWidth: 2
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: { 
                              color: isDarkMode ? '#fff' : '#333',
                              padding: 10
                            }
                          }
                        }
                      }}
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
                    <Pie 
                      data={{
                        labels: predictedBudget.outcomeSources.map(source => source.name),
                        datasets: [{
                          data: predictedBudget.outcomeSources.map(source => source.amount_cents / 100),
                          backgroundColor: [
                            'rgba(255, 99, 132, 0.6)',
                            'rgba(255, 159, 64, 0.6)',
                            'rgba(255, 206, 86, 0.6)',
                            'rgba(75, 192, 192, 0.6)',
                            'rgba(54, 162, 235, 0.6)',
                            'rgba(153, 102, 255, 0.6)',
                            'rgba(231, 76, 60, 0.6)',
                            'rgba(230, 126, 34, 0.6)',
                            'rgba(241, 196, 15, 0.6)',
                            'rgba(46, 204, 113, 0.6)',
                            'rgba(52, 152, 219, 0.6)',
                            'rgba(155, 89, 182, 0.6)',
                            'rgba(149, 165, 166, 0.6)',
                            'rgba(192, 57, 43, 0.6)',
                            'rgba(211, 84, 0, 0.6)'
                          ],
                          borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(255, 159, 64, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(231, 76, 60, 1)',
                            'rgba(230, 126, 34, 1)',
                            'rgba(241, 196, 15, 1)',
                            'rgba(46, 204, 113, 1)',
                            'rgba(52, 152, 219, 1)',
                            'rgba(155, 89, 182, 1)',
                            'rgba(149, 165, 166, 1)',
                            'rgba(192, 57, 43, 1)',
                            'rgba(211, 84, 0, 1)'
                          ],
                          borderWidth: 2
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: { 
                              color: isDarkMode ? '#fff' : '#333',
                              padding: 10
                            }
                          }
                        }
                      }}
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

          {/* Records by Categories Chart */}
          <div className="col-lg-6 mb-4">
            <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
              <div className="card-header">
                <h3>Records by Categories</h3>
              </div>
              <div className="card-body">
                <div style={{ height: '300px' }}>
                  {expenses.length > 0 ? (
        <Bar
                      data={{
                        labels: [...new Set(expenses.map(expense => expense.category || 'Uncategorized'))],
                        datasets: [
                          {
                            label: 'Expenses',
                            data: [...new Set(expenses.map(expense => expense.category || 'Uncategorized'))].map(category =>
                              Math.abs(expenses
                                .filter(expense => (expense.category || 'Uncategorized') === category && expense.amount_cents < 0)
                                .reduce((sum, expense) => sum + expense.amount_cents, 0) / 100)
                            ),
                            backgroundColor: 'rgba(255, 99, 132, 0.6)',
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderWidth: 1
                          },
                          {
                            label: 'Profits',
                            data: [...new Set(expenses.map(expense => expense.category || 'Uncategorized'))].map(category =>
                              expenses
                                .filter(expense => (expense.category || 'Uncategorized') === category && expense.amount_cents > 0)
                                .reduce((sum, expense) => sum + (expense.amount_cents / 100), 0)
                            ),
                            backgroundColor: 'rgba(75, 192, 192, 0.6)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: { color: isDarkMode ? '#fff' : '#333' },
                            grid: { color: isDarkMode ? '#555' : '#ddd' }
                          },
                          x: {
                            ticks: { color: isDarkMode ? '#fff' : '#333' },
                            grid: { color: isDarkMode ? '#555' : '#ddd' }
                          }
                        },
                        plugins: {
                          legend: {
                            labels: { color: isDarkMode ? '#fff' : '#333' }
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="text-center text-muted pt-5">
                      <p>No records available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Profit Categories Chart */}
          <div className="col-lg-6 mb-4">
            <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
              <div className="card-header">
                <h3>Profit Categories</h3>
              </div>
              <div className="card-body">
                <div style={{ height: '300px' }}>
                  {expenses.filter(e => e.amount_cents > 0).length > 0 ? (
                    <Pie 
                      data={{
                        labels: [...new Set(expenses.filter(e => e.amount_cents > 0).map(expense => expense.category || 'Uncategorized'))],
                        datasets: [{
                          data: [...new Set(expenses.filter(e => e.amount_cents > 0).map(expense => expense.category || 'Uncategorized'))].map(category =>
                            expenses
                              .filter(expense => (expense.category || 'Uncategorized') === category && expense.amount_cents > 0)
                              .reduce((sum, expense) => sum + (expense.amount_cents / 100), 0)
                          ),
                          backgroundColor: [
                            'rgba(75, 192, 192, 0.6)',
                            'rgba(54, 162, 235, 0.6)',
                            'rgba(255, 206, 86, 0.6)',
                            'rgba(153, 102, 255, 0.6)',
                            'rgba(255, 159, 64, 0.6)',
                            'rgba(255, 99, 132, 0.6)'
                          ],
                          borderColor: [
                            'rgba(75, 192, 192, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 159, 64, 1)',
                            'rgba(255, 99, 132, 1)'
                          ],
                          borderWidth: 2
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: { 
                              color: isDarkMode ? '#fff' : '#333',
                              padding: 10
                            }
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="text-center text-muted pt-5">
                      <p>No profit records available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Budget Tracking Row */}
        <div className="row">
          <div className="col-lg-12 mb-4">
            <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
              <div className="card-header">
                <h3>{t('section.currentMonthTracking')}</h3>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-md-3">
                    <div className="text-center">
                      <h5>{t('label.totalIncome')}</h5>
                      <h4 className="text-success">{formatCurrency(predictedBudget.totalIncome)}</h4>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="text-center">
                      <h5>{t('label.predictedOutcomes')}</h5>
                      <h4 className="text-warning">{formatCurrency(predictedBudget.totalOutcome)}</h4>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="text-center">
                      <h5>Total Records</h5>
                      <h4 className="text-danger">{formatCurrency(Math.abs(expenses.reduce((sum, expense) => sum + expense.amount_cents, 0)))}</h4>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="text-center">
                      <h5>{t('label.remaining')}</h5>
                      <h4 className={predictedBudget.totalIncome - expenses.reduce((sum, expense) => sum + expense.amount_cents, 0) >= 0 ? 'text-success' : 'text-danger'}>
                        {formatCurrency(predictedBudget.totalIncome - expenses.reduce((sum, expense) => sum + expense.amount_cents, 0))}
                      </h4>
                    </div>
                  </div>
                </div>
                
                {/* Progress Indicator */}
                <progress
                  className="w-100 mb-2"
                  max={100}
                  value={Math.min((expenses.reduce((sum, expense) => sum + expense.amount_cents, 0) / Math.max(predictedBudget.totalIncome, 1)) * 100, 100)}
                  style={{ height: '30px' }}
                />
                <div className="text-center">
                  {t('label.spentPercent', { percent: Math.round((expenses.reduce((sum, expense) => sum + expense.amount_cents, 0) / Math.max(predictedBudget.totalIncome, 1)) * 100) })}
                </div>
                
                <div className="text-center">
                  {expenses.reduce((sum, expense) => sum + expense.amount_cents, 0) > predictedBudget.totalIncome && (
                    <div className="alert alert-danger">
                      {t('alert.overBudget', { amount: formatCurrency(expenses.reduce((sum, expense) => sum + expense.amount_cents, 0) - predictedBudget.totalIncome) })}
                    </div>
                  )}
                  {expenses.reduce((sum, expense) => sum + expense.amount_cents, 0) <= predictedBudget.totalIncome * 0.8 && (
                    <div className="alert alert-success">
                      {t('alert.underBudget')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

  {/* Manual Current Month Budget (Bank and planned deductions) */}
  <div id="planning" className="section-anchor"></div>
        <div className="row">
          <div className="col-lg-12 mb-4">
            <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
              <div className="card-header d-flex justify-content-between align-items-center">
                <h3 className="mb-0">{t('section.manualBudget')}</h3>
                <div className="small text-muted">{t('label.formula')}</div>
              </div>
              <div className="card-body">
                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <label className="form-label">{t('label.bankAmount')}</label>
                    <input
                      type="text"
                      className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                      value={manualBudget.bankAmount}
                      onChange={(e) => setManualBudget({ ...manualBudget, bankAmount: parseLocaleAmount(e.target.value) })}
                    />
                  </div>
                  <div className="col-md-8">
                    <label className="form-label">{t('label.plannedExpenses')}</label>
                    <div className="row g-2">
                      {manualBudget.items.map((it, idx) => (
                        <div className="col-12" key={it.id}>
                          <div className="input-group input-group-sm">
                            <input
                              type="text"
                              className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                              placeholder={t('placeholder.itemName')}
                              value={it.name}
                              onChange={(e) => {
                                const items = [...manualBudget.items];
                                items[idx] = { ...items[idx], name: e.target.value };
                                setManualBudget({ ...manualBudget, items });
                              }}
                            />
                            <span className="input-group-text">$</span>
                            <input
                              type="text"
                              className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                              placeholder={t('placeholder.amount')}
                              value={it.amount}
                              onChange={(e) => {
                                const items = [...manualBudget.items];
                                items[idx] = { ...items[idx], amount: parseLocaleAmount(e.target.value) };
                                setManualBudget({ ...manualBudget, items });
                              }}
                            />
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => {
                                setManualBudget({ ...manualBudget, items: manualBudget.items.filter(x => x.id !== it.id) });
                              }}
                            >
                              {t('btn.delete')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      className="btn btn-sm btn-outline-primary mt-2"
                      onClick={() => {
                        setManualBudget({
                          ...manualBudget,
                          items: [...manualBudget.items, { id: Math.random().toString(36).slice(2), name: '', amount: 0 }]
                        });
                      }}
                    >
                      {t('btn.addItem')}
                    </button>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-md-4">
                    <div className="text-center">
                      <h5>{t('label.remaining')}</h5>
                      <h4 className={(
                        manualBudget.bankAmount - manualBudget.items.reduce((s, i) => s + i.amount, 0)
                      ) >= 0 ? 'text-success' : 'text-danger'}>
                        {formatCurrency(Math.round((manualBudget.bankAmount - manualBudget.items.reduce((s, i) => s + i.amount, 0)) * 100))}
                      </h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

  {/* Records List */}
  <div id="records" className="section-anchor"></div>
        <div className="row">
          <div className="col-12">
            <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
              <div className="card-header">
                <h3>Financial Records for {getMonthName(currentDate.getMonth() + 1)} {currentDate.getFullYear()}</h3>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className={`table ${isDarkMode ? 'table-dark' : 'table-light'}`}>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>{t('table.description')}</th>
                        <th>{t('table.category')}</th>
                        <th>{t('table.amount')}</th>
                        <th>{t('table.action')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((expense) => (
                        <tr key={expense.id}>
                          <td>
                            <span className={`badge ${expense.amount_cents < 0 ? 'bg-danger' : 'bg-success'}`}>
                              {expense.amount_cents < 0 ? 'Expense' : 'Profit'}
                            </span>
                          </td>
                          <td>{expense.description}</td>
                          <td>{expense.category || '-'}</td>
                          <td className={expense.amount_cents < 0 ? 'text-danger' : 'text-success'}>
                            {formatCurrency(Math.abs(expense.amount_cents))}
                          </td>
                          <td>
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={async () => {
                                await apiCall(`/api/v1/expenses/${expense.id}`, {method: 'DELETE'});
                                loadData();
                              }}
                            >
                              {t('btn.delete')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {expenses.length === 0 && (
                    <div className="text-center py-4 text-muted">
                      No financial records for this month
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
