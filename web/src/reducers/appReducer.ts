import { AppState, User, ExpenseFilters, AppEvent, Notification, AnalyticsData } from '../types/appState';
import {
  handleSetExpenses,
  handleAddExpense,
  handleUpdateExpense,
  handleDeleteExpense,
  handleSetIncomeSources,
  handleAddIncomeSource,
  handleUpdateIncomeSource,
  handleDeleteIncomeSource,
  handleSetBudgetSources,
  handleAddBudgetSource,
  handleUpdateBudgetSource,
  handleDeleteBudgetSource,
  generateId,
  calculateAnalytics,
  AppAction,
} from './appActionHandlers';

// Initial State
export const initialState: AppState = {
  expenses: [],
  incomeSources: [],
  budgetSources: [],
  loading: false,
  error: null,
  filters: {
    search: '',
    category: '',
    yearMonth: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
    minAmount: 0,
    maxAmount: Infinity,
    sortBy: 'date',
    sortOrder: 'desc',
  },
  events: [],
  currentUser: null,
  notifications: [],
  analytics: {
    totalExpenses: 0,
    totalIncome: 0,
    totalBudget: 0,
    categoryBreakdown: {},
    monthlyTrends: {},
    budgetUtilization: {},
  },
};


// Main reducer function
export function appReducer(state: AppState = initialState, action: AppAction): AppState {
  // Handle each action type
  switch (action.type) {
    case 'SET_EXPENSES':
      return handleSetExpenses(state, action);
    case 'ADD_EXPENSE':
      return handleAddExpense(state, action);
    case 'UPDATE_EXPENSE':
      return handleUpdateExpense(state, action);
    case 'DELETE_EXPENSE':
      return handleDeleteExpense(state, action);
    case 'SET_INCOME_SOURCES':
      return handleSetIncomeSources(state, action);
    case 'ADD_INCOME_SOURCE':
      return handleAddIncomeSource(state, action);
    case 'UPDATE_INCOME_SOURCE':
      return handleUpdateIncomeSource(state, action);
    case 'DELETE_INCOME_SOURCE':
      return handleDeleteIncomeSource(state, action);
    case 'SET_BUDGET_SOURCES':
      return handleSetBudgetSources(state, action);
    case 'ADD_BUDGET_SOURCE':
      return handleAddBudgetSource(state, action);
    case 'UPDATE_BUDGET_SOURCE':
      return handleUpdateBudgetSource(state, action);
    case 'DELETE_BUDGET_SOURCE':
      return handleDeleteBudgetSource(state, action);
    case 'SET_USER':
      return handleSetUser(state, action);
    case 'CLEAR_USER':
      return handleClearUser(state, action);
    case 'SET_LOADING':
      return handleSetLoading(state, action);
    case 'SET_ERROR':
      return handleSetError(state, action);
    case 'SET_FILTERS':
      return handleSetFilters(state, action);
    case 'CLEAR_FILTERS':
      return handleClearFilters(state, action);
    case 'ADD_EVENT':
      return handleAddEvent(state, action);
    case 'CLEAR_EVENTS':
      return handleClearEvents(state, action);
    case 'REMOVE_EVENT':
      return handleRemoveEvent(state, action);
    case 'LOGIN':
      return handleLogin(state, action);
    case 'LOGOUT':
      return handleLogout(state, action);
    case 'ADD_NOTIFICATION':
      return handleAddNotification(state, action);
    case 'REMOVE_NOTIFICATION':
      return handleRemoveNotification(state, action);
    case 'MARK_NOTIFICATION_READ':
      return handleMarkNotificationRead(state, action);
    case 'CLEAR_NOTIFICATIONS':
      return handleClearNotifications(state, action);
    case 'SET_ANALYTICS':
      return handleSetAnalytics(state, action);
    case 'UPDATE_ANALYTICS':
      return handleUpdateAnalytics(state, action);
    case 'BATCH_UPDATE':
      return handleBatchUpdate(state, action);
    default:
      return state;
  }
}

// Local action handlers for actions not in appActionHandlers.ts
function handleSetLoading(state: AppState, action: AppAction): AppState {
  if (action.type !== 'SET_LOADING') return state;
  return { ...state, loading: action.payload };
}

function handleSetError(state: AppState, action: AppAction): AppState {
  if (action.type !== 'SET_ERROR') return state;
  return { ...state, error: action.payload };
}

function handleSetFilters(state: AppState, action: AppAction): AppState {
  if (action.type !== 'SET_FILTERS') return state;
  return { ...state, filters: { ...state.filters, ...action.payload } };
}

function handleClearFilters(state: AppState, action: AppAction): AppState {
  if (action.type !== 'CLEAR_FILTERS') return state;
  return { ...state, filters: initialState.filters };
}

function handleAddEvent(state: AppState, action: AppAction): AppState {
  if (action.type !== 'ADD_EVENT') return state;
  const event = {
    id: generateId(),
    timestamp: new Date(),
    source: 'frontend',
    ...action.payload,
  };
  return { ...state, events: [...state.events, event] };
}

function handleClearEvents(state: AppState, action: AppAction): AppState {
  if (action.type !== 'CLEAR_EVENTS') return state;
  return { ...state, events: [] };
}

function handleRemoveEvent(state: AppState, action: AppAction): AppState {
  if (action.type !== 'REMOVE_EVENT') return state;
  return { ...state, events: state.events.filter(event => event.id !== action.payload) };
}

function handleSetUser(state: AppState, action: AppAction): AppState {
  if (action.type !== 'SET_USER') return state;
  return {
    ...state,
    currentUser: action.payload,
    events: [...state.events, {
      id: generateId(),
      type: action.payload ? 'user.logged_in' : 'user.logged_out',
      data: action.payload as unknown as Record<string, unknown>,
      timestamp: new Date(),
      source: 'frontend',
    }],
  };
}

function handleClearUser(state: AppState, action: AppAction): AppState {
  if (action.type !== 'CLEAR_USER') return state;
  return { ...state, currentUser: null };
}

function handleLogin(state: AppState, action: AppAction): AppState {
  if (action.type !== 'LOGIN') return state;
  return handleSetUser(state, { type: 'SET_USER', payload: action.payload });
}

function handleLogout(state: AppState, action: AppAction): AppState {
  if (action.type !== 'LOGOUT') return state;
  return {
    ...state,
    currentUser: null,
    events: [...state.events, {
      id: generateId(),
      type: 'user.logged_out',
      data: {} as Record<string, unknown>,
      timestamp: new Date(),
      source: 'frontend',
    }],
  };
}

function handleAddNotification(state: AppState, action: AppAction): AppState {
  if (action.type !== 'ADD_NOTIFICATION') return state;
  const notification = {
    ...action.payload,
    id: generateId(),
    timestamp: new Date(),
    read: false,
  };
  return { ...state, notifications: [...state.notifications, notification] };
}

function handleRemoveNotification(state: AppState, action: AppAction): AppState {
  if (action.type !== 'REMOVE_NOTIFICATION') return state;
  return {
    ...state,
    notifications: state.notifications.filter(notification => notification.id !== action.payload),
  };
}

function handleMarkNotificationRead(state: AppState, action: AppAction): AppState {
  if (action.type !== 'MARK_NOTIFICATION_READ') return state;
  return {
    ...state,
    notifications: state.notifications.map(notification =>
      notification.id === action.payload ? { ...notification, read: true } : notification
    ),
  };
}

function handleClearNotifications(state: AppState, action: AppAction): AppState {
  if (action.type !== 'CLEAR_NOTIFICATIONS') return state;
  return { ...state, notifications: [] };
}

function handleSetAnalytics(state: AppState, action: AppAction): AppState {
  if (action.type !== 'SET_ANALYTICS') return state;
  return { ...state, analytics: action.payload };
}

function handleUpdateAnalytics(state: AppState, action: AppAction): AppState {
  if (action.type !== 'UPDATE_ANALYTICS') return state;
  return { ...state, analytics: { ...state.analytics, ...action.payload } };
}

function handleBatchUpdate(state: AppState, action: AppAction): AppState {
  if (action.type !== 'BATCH_UPDATE') return state;
  return action.payload.reduce(appReducer, state);
}

// Selector Functions
export const selectExpenses = (state: AppState) => state.expenses;
export const selectIncomeSources = (state: AppState) => state.incomeSources;
export const selectBudgetSources = (state: AppState) => state.budgetSources;
export const selectLoading = (state: AppState) => state.loading;
export const selectError = (state: AppState) => state.error;
export const selectFilters = (state: AppState) => state.filters;
export const selectEvents = (state: AppState) => state.events;
export const selectCurrentUser = (state: AppState) => state.currentUser;
export const selectNotifications = (state: AppState) => state.notifications;
export const selectAnalytics = (state: AppState) => state.analytics;

export const selectFilteredExpenses = (state: AppState) => {
  const { expenses, filters } = state;
  return expenses.filter(expense => {
    const matchesSearch = !filters.search || 
      expense.description.toLowerCase().includes(filters.search.toLowerCase()) ||
      (expense.category && expense.category.toLowerCase().includes(filters.search.toLowerCase()));
    
    const matchesCategory = !filters.category || expense.category === filters.category;
    
    const matchesYearMonth = expense.year === filters.yearMonth.year &&
      expense.month === filters.yearMonth.month;
    
    const matchesAmount = expense.amount_cents >= filters.minAmount * 100 &&
      expense.amount_cents <= filters.maxAmount * 100;
    
    return matchesSearch && matchesCategory && matchesYearMonth && matchesAmount;
  }).sort((a, b) => {
    const order = filters.sortOrder === 'asc' ? 1 : -1;
    
    switch (filters.sortBy) {
      case 'amount': {
        return (a.amount_cents - b.amount_cents) * order;
      }
      case 'category': {
        return (a.category || '').localeCompare(b.category || '') * order;
      }
      case 'description': {
        return a.description.localeCompare(b.description) * order;
      }
      case 'date':
      default: {
        const dateA = new Date(a.year || 0, (a.month || 1) - 1);
        const dateB = new Date(b.year || 0, (b.month || 1) - 1);
        return (dateA.getTime() - dateB.getTime()) * order;
      }
    }
  });
};

export const selectUnreadNotifications = (state: AppState) =>
  state.notifications.filter(notification => !notification.read);

export const selectRecentEvents = (state: AppState, limit: number = 10) =>
  state.events
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);