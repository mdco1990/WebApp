// Type-safe reducer pattern with TypeScript
// This file provides comprehensive state management using the reducer pattern

import { useReducer, useCallback, useMemo, useRef, useEffect } from 'react';

// ============================================================================
// BASE TYPES
// ============================================================================

// Base action interface
export interface Action<T = string, P = any> {
  type: T;
  payload?: P;
  meta?: Record<string, any>;
  error?: boolean;
}

// Action creator function type
export type ActionCreator<T = string, P = any> = (payload?: P, meta?: Record<string, any>) => Action<T, P>;

// Reducer function type
export type Reducer<S, A extends Action> = (state: S, action: A) => S;

// Dispatch function type
export type Dispatch<A extends Action> = (action: A) => void;

// Middleware function type
export type Middleware<S, A extends Action> = (
  store: Store<S, A>
) => (next: Dispatch<A>) => (action: A) => void;

// Store interface
export interface Store<S, A extends Action> {
  getState: () => S;
  dispatch: Dispatch<A>;
  subscribe: (listener: () => void) => () => void;
}

// ============================================================================
// APP STATE TYPES
// ============================================================================

// App state interface
export interface AppState {
  user: UserState;
  expenses: ExpensesState;
  budget: BudgetState;
  notifications: NotificationsState;
  ui: UIState;
  auth: AuthState;
}

// User state
export interface UserState {
  currentUser: User | null;
  users: User[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

// Expenses state
export interface ExpensesState {
  items: Expense[];
  categories: string[];
  filters: ExpenseFilters;
  loading: boolean;
  error: string | null;
  pagination: PaginationState;
  selectedExpense: Expense | null;
}

// Budget state
export interface BudgetState {
  monthlyBudgets: Record<string, MonthlyBudget>;
  categories: BudgetCategory[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

// Notifications state
export interface NotificationsState {
  items: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

// UI state
export interface UIState {
  theme: 'light' | 'dark' | 'auto';
  sidebarOpen: boolean;
  modal: ModalState | null;
  toast: ToastState | null;
  loading: boolean;
}

// Auth state
export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  lastActivity: number | null;
}

// ============================================================================
// ACTION TYPES
// ============================================================================

// User actions
export type UserAction =
  | Action<'USER_LOGIN_REQUEST'>
  | Action<'USER_LOGIN_SUCCESS', User>
  | Action<'USER_LOGIN_FAILURE', string>
  | Action<'USER_LOGOUT'>
  | Action<'USER_UPDATE_REQUEST'>
  | Action<'USER_UPDATE_SUCCESS', User>
  | Action<'USER_UPDATE_FAILURE', string>
  | Action<'USER_FETCH_REQUEST'>
  | Action<'USER_FETCH_SUCCESS', User[]>
  | Action<'USER_FETCH_FAILURE', string>;

// Expense actions
export type ExpenseAction =
  | Action<'EXPENSE_FETCH_REQUEST'>
  | Action<'EXPENSE_FETCH_SUCCESS', Expense[]>
  | Action<'EXPENSE_FETCH_FAILURE', string>
  | Action<'EXPENSE_CREATE_REQUEST', Partial<Expense>>
  | Action<'EXPENSE_CREATE_SUCCESS', Expense>
  | Action<'EXPENSE_CREATE_FAILURE', string>
  | Action<'EXPENSE_UPDATE_REQUEST', Partial<Expense>>
  | Action<'EXPENSE_UPDATE_SUCCESS', Expense>
  | Action<'EXPENSE_UPDATE_FAILURE', string>
  | Action<'EXPENSE_DELETE_REQUEST', number>
  | Action<'EXPENSE_DELETE_SUCCESS', number>
  | Action<'EXPENSE_DELETE_FAILURE', string>
  | Action<'EXPENSE_SELECT', Expense | null>
  | Action<'EXPENSE_SET_FILTERS', ExpenseFilters>
  | Action<'EXPENSE_SET_PAGINATION', Partial<PaginationState>>;

// Budget actions
export type BudgetAction =
  | Action<'BUDGET_FETCH_REQUEST'>
  | Action<'BUDGET_FETCH_SUCCESS', MonthlyBudget[]>
  | Action<'BUDGET_FETCH_FAILURE', string>
  | Action<'BUDGET_UPDATE_REQUEST', Partial<MonthlyBudget>>
  | Action<'BUDGET_UPDATE_SUCCESS', MonthlyBudget>
  | Action<'BUDGET_UPDATE_FAILURE', string>
  | Action<'BUDGET_CATEGORY_UPDATE', BudgetCategory>;

// Notification actions
export type NotificationAction =
  | Action<'NOTIFICATION_FETCH_REQUEST'>
  | Action<'NOTIFICATION_FETCH_SUCCESS', Notification[]>
  | Action<'NOTIFICATION_FETCH_FAILURE', string>
  | Action<'NOTIFICATION_MARK_READ', number>
  | Action<'NOTIFICATION_MARK_ALL_READ'>
  | Action<'NOTIFICATION_DELETE', number>
  | Action<'NOTIFICATION_ADD', Notification>;

// UI actions
export type UIAction =
  | Action<'UI_SET_THEME', 'light' | 'dark' | 'auto'>
  | Action<'UI_TOGGLE_SIDEBAR'>
  | Action<'UI_SET_SIDEBAR', boolean>
  | Action<'UI_SHOW_MODAL', ModalState>
  | Action<'UI_HIDE_MODAL'>
  | Action<'UI_SHOW_TOAST', ToastState>
  | Action<'UI_HIDE_TOAST'>
  | Action<'UI_SET_LOADING', boolean>;

// Auth actions
export type AuthAction =
  | Action<'AUTH_LOGIN_REQUEST', LoginCredentials>
  | Action<'AUTH_LOGIN_SUCCESS', AuthResult>
  | Action<'AUTH_LOGIN_FAILURE', string>
  | Action<'AUTH_LOGOUT'>
  | Action<'AUTH_REFRESH_REQUEST'>
  | Action<'AUTH_REFRESH_SUCCESS', AuthResult>
  | Action<'AUTH_REFRESH_FAILURE', string>
  | Action<'AUTH_UPDATE_ACTIVITY'>;

// Combined action type
export type AppAction = UserAction | ExpenseAction | BudgetAction | NotificationAction | UIAction | AuthAction;

// ============================================================================
// ACTION CREATORS
// ============================================================================

// User action creators
export const userActions = {
  loginRequest: (): UserAction => ({ type: 'USER_LOGIN_REQUEST' }),
  loginSuccess: (user: User): UserAction => ({ type: 'USER_LOGIN_SUCCESS', payload: user }),
  loginFailure: (error: string): UserAction => ({ type: 'USER_LOGIN_FAILURE', payload: error }),
  logout: (): UserAction => ({ type: 'USER_LOGOUT' }),
  updateRequest: (): UserAction => ({ type: 'USER_UPDATE_REQUEST' }),
  updateSuccess: (user: User): UserAction => ({ type: 'USER_UPDATE_SUCCESS', payload: user }),
  updateFailure: (error: string): UserAction => ({ type: 'USER_UPDATE_FAILURE', payload: error }),
  fetchRequest: (): UserAction => ({ type: 'USER_FETCH_REQUEST' }),
  fetchSuccess: (users: User[]): UserAction => ({ type: 'USER_FETCH_SUCCESS', payload: users }),
  fetchFailure: (error: string): UserAction => ({ type: 'USER_FETCH_FAILURE', payload: error }),
};

// Expense action creators
export const expenseActions = {
  fetchRequest: (): ExpenseAction => ({ type: 'EXPENSE_FETCH_REQUEST' }),
  fetchSuccess: (expenses: Expense[]): ExpenseAction => ({ type: 'EXPENSE_FETCH_SUCCESS', payload: expenses }),
  fetchFailure: (error: string): ExpenseAction => ({ type: 'EXPENSE_FETCH_FAILURE', payload: error }),
  createRequest: (expense: Partial<Expense>): ExpenseAction => ({ type: 'EXPENSE_CREATE_REQUEST', payload: expense }),
  createSuccess: (expense: Expense): ExpenseAction => ({ type: 'EXPENSE_CREATE_SUCCESS', payload: expense }),
  createFailure: (error: string): ExpenseAction => ({ type: 'EXPENSE_CREATE_FAILURE', payload: error }),
  updateRequest: (expense: Partial<Expense>): ExpenseAction => ({ type: 'EXPENSE_UPDATE_REQUEST', payload: expense }),
  updateSuccess: (expense: Expense): ExpenseAction => ({ type: 'EXPENSE_UPDATE_SUCCESS', payload: expense }),
  updateFailure: (error: string): ExpenseAction => ({ type: 'EXPENSE_UPDATE_FAILURE', payload: error }),
  deleteRequest: (id: number): ExpenseAction => ({ type: 'EXPENSE_DELETE_REQUEST', payload: id }),
  deleteSuccess: (id: number): ExpenseAction => ({ type: 'EXPENSE_DELETE_SUCCESS', payload: id }),
  deleteFailure: (error: string): ExpenseAction => ({ type: 'EXPENSE_DELETE_FAILURE', payload: error }),
  select: (expense: Expense | null): ExpenseAction => ({ type: 'EXPENSE_SELECT', payload: expense }),
  setFilters: (filters: ExpenseFilters): ExpenseAction => ({ type: 'EXPENSE_SET_FILTERS', payload: filters }),
  setPagination: (pagination: Partial<PaginationState>): ExpenseAction => ({ type: 'EXPENSE_SET_PAGINATION', payload: pagination }),
};

// Budget action creators
export const budgetActions = {
  fetchRequest: (): BudgetAction => ({ type: 'BUDGET_FETCH_REQUEST' }),
  fetchSuccess: (budgets: MonthlyBudget[]): BudgetAction => ({ type: 'BUDGET_FETCH_SUCCESS', payload: budgets }),
  fetchFailure: (error: string): BudgetAction => ({ type: 'BUDGET_FETCH_FAILURE', payload: error }),
  updateRequest: (budget: Partial<MonthlyBudget>): BudgetAction => ({ type: 'BUDGET_UPDATE_REQUEST', payload: budget }),
  updateSuccess: (budget: MonthlyBudget): BudgetAction => ({ type: 'BUDGET_UPDATE_SUCCESS', payload: budget }),
  updateFailure: (error: string): BudgetAction => ({ type: 'BUDGET_UPDATE_FAILURE', payload: error }),
  updateCategory: (category: BudgetCategory): BudgetAction => ({ type: 'BUDGET_CATEGORY_UPDATE', payload: category }),
};

// Notification action creators
export const notificationActions = {
  fetchRequest: (): NotificationAction => ({ type: 'NOTIFICATION_FETCH_REQUEST' }),
  fetchSuccess: (notifications: Notification[]): NotificationAction => ({ type: 'NOTIFICATION_FETCH_SUCCESS', payload: notifications }),
  fetchFailure: (error: string): NotificationAction => ({ type: 'NOTIFICATION_FETCH_FAILURE', payload: error }),
  markRead: (id: number): NotificationAction => ({ type: 'NOTIFICATION_MARK_READ', payload: id }),
  markAllRead: (): NotificationAction => ({ type: 'NOTIFICATION_MARK_ALL_READ' }),
  delete: (id: number): NotificationAction => ({ type: 'NOTIFICATION_DELETE', payload: id }),
  add: (notification: Notification): NotificationAction => ({ type: 'NOTIFICATION_ADD', payload: notification }),
};

// UI action creators
export const uiActions = {
  setTheme: (theme: 'light' | 'dark' | 'auto'): UIAction => ({ type: 'UI_SET_THEME', payload: theme }),
  toggleSidebar: (): UIAction => ({ type: 'UI_TOGGLE_SIDEBAR' }),
  setSidebar: (open: boolean): UIAction => ({ type: 'UI_SET_SIDEBAR', payload: open }),
  showModal: (modal: ModalState): UIAction => ({ type: 'UI_SHOW_MODAL', payload: modal }),
  hideModal: (): UIAction => ({ type: 'UI_HIDE_MODAL' }),
  showToast: (toast: ToastState): UIAction => ({ type: 'UI_SHOW_TOAST', payload: toast }),
  hideToast: (): UIAction => ({ type: 'UI_HIDE_TOAST' }),
  setLoading: (loading: boolean): UIAction => ({ type: 'UI_SET_LOADING', payload: loading }),
};

// Auth action creators
export const authActions = {
  loginRequest: (credentials: LoginCredentials): AuthAction => ({ type: 'AUTH_LOGIN_REQUEST', payload: credentials }),
  loginSuccess: (result: AuthResult): AuthAction => ({ type: 'AUTH_LOGIN_SUCCESS', payload: result }),
  loginFailure: (error: string): AuthAction => ({ type: 'AUTH_LOGIN_FAILURE', payload: error }),
  logout: (): AuthAction => ({ type: 'AUTH_LOGOUT' }),
  refreshRequest: (): AuthAction => ({ type: 'AUTH_REFRESH_REQUEST' }),
  refreshSuccess: (result: AuthResult): AuthAction => ({ type: 'AUTH_REFRESH_SUCCESS', payload: result }),
  refreshFailure: (error: string): AuthAction => ({ type: 'AUTH_REFRESH_FAILURE', payload: error }),
  updateActivity: (): AuthAction => ({ type: 'AUTH_UPDATE_ACTIVITY' }),
};

// ============================================================================
// REDUCERS
// ============================================================================

// User reducer
export function userReducer(state: UserState, action: UserAction): UserState {
  switch (action.type) {
    case 'USER_LOGIN_REQUEST':
      return { ...state, loading: true, error: null };
    case 'USER_LOGIN_SUCCESS':
      return { ...state, currentUser: action.payload, loading: false, error: null, lastUpdated: Date.now() };
    case 'USER_LOGIN_FAILURE':
      return { ...state, loading: false, error: action.payload };
    case 'USER_LOGOUT':
      return { ...state, currentUser: null, lastUpdated: Date.now() };
    case 'USER_UPDATE_REQUEST':
      return { ...state, loading: true, error: null };
    case 'USER_UPDATE_SUCCESS':
      return { ...state, currentUser: action.payload, loading: false, error: null, lastUpdated: Date.now() };
    case 'USER_UPDATE_FAILURE':
      return { ...state, loading: false, error: action.payload };
    case 'USER_FETCH_REQUEST':
      return { ...state, loading: true, error: null };
    case 'USER_FETCH_SUCCESS':
      return { ...state, users: action.payload, loading: false, error: null, lastUpdated: Date.now() };
    case 'USER_FETCH_FAILURE':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

// Expense reducer
export function expenseReducer(state: ExpensesState, action: ExpenseAction): ExpensesState {
  switch (action.type) {
    case 'EXPENSE_FETCH_REQUEST':
      return { ...state, loading: true, error: null };
    case 'EXPENSE_FETCH_SUCCESS':
      return { ...state, items: action.payload, loading: false, error: null };
    case 'EXPENSE_FETCH_FAILURE':
      return { ...state, loading: false, error: action.payload };
    case 'EXPENSE_CREATE_REQUEST':
      return { ...state, loading: true, error: null };
    case 'EXPENSE_CREATE_SUCCESS':
      return { ...state, items: [...state.items, action.payload], loading: false, error: null };
    case 'EXPENSE_CREATE_FAILURE':
      return { ...state, loading: false, error: action.payload };
    case 'EXPENSE_UPDATE_REQUEST':
      return { ...state, loading: true, error: null };
    case 'EXPENSE_UPDATE_SUCCESS':
      return {
        ...state,
        items: state.items.map(expense => expense.id === action.payload.id ? action.payload : expense),
        loading: false,
        error: null,
      };
    case 'EXPENSE_UPDATE_FAILURE':
      return { ...state, loading: false, error: action.payload };
    case 'EXPENSE_DELETE_REQUEST':
      return { ...state, loading: true, error: null };
    case 'EXPENSE_DELETE_SUCCESS':
      return {
        ...state,
        items: state.items.filter(expense => expense.id !== action.payload),
        selectedExpense: state.selectedExpense?.id === action.payload ? null : state.selectedExpense,
        loading: false,
        error: null,
      };
    case 'EXPENSE_DELETE_FAILURE':
      return { ...state, loading: false, error: action.payload };
    case 'EXPENSE_SELECT':
      return { ...state, selectedExpense: action.payload };
    case 'EXPENSE_SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'EXPENSE_SET_PAGINATION':
      return { ...state, pagination: { ...state.pagination, ...action.payload } };
    default:
      return state;
  }
}

// Budget reducer
export function budgetReducer(state: BudgetState, action: BudgetAction): BudgetState {
  switch (action.type) {
    case 'BUDGET_FETCH_REQUEST':
      return { ...state, loading: true, error: null };
    case 'BUDGET_FETCH_SUCCESS':
      const monthlyBudgets: Record<string, MonthlyBudget> = {};
      action.payload.forEach(budget => {
        const key = `${budget.year}-${budget.month}`;
        monthlyBudgets[key] = budget;
      });
      return { ...state, monthlyBudgets, loading: false, error: null, lastUpdated: Date.now() };
    case 'BUDGET_FETCH_FAILURE':
      return { ...state, loading: false, error: action.payload };
    case 'BUDGET_UPDATE_REQUEST':
      return { ...state, loading: true, error: null };
    case 'BUDGET_UPDATE_SUCCESS':
      const key = `${action.payload.year}-${action.payload.month}`;
      return {
        ...state,
        monthlyBudgets: { ...state.monthlyBudgets, [key]: action.payload },
        loading: false,
        error: null,
        lastUpdated: Date.now(),
      };
    case 'BUDGET_UPDATE_FAILURE':
      return { ...state, loading: false, error: action.payload };
    case 'BUDGET_CATEGORY_UPDATE':
      return {
        ...state,
        categories: state.categories.map(cat => cat.id === action.payload.id ? action.payload : cat),
      };
    default:
      return state;
  }
}

// Notification reducer
export function notificationReducer(state: NotificationsState, action: NotificationAction): NotificationsState {
  switch (action.type) {
    case 'NOTIFICATION_FETCH_REQUEST':
      return { ...state, loading: true, error: null };
    case 'NOTIFICATION_FETCH_SUCCESS':
      return { ...state, items: action.payload, loading: false, error: null };
    case 'NOTIFICATION_FETCH_FAILURE':
      return { ...state, loading: false, error: action.payload };
    case 'NOTIFICATION_MARK_READ':
      return {
        ...state,
        items: state.items.map(notification =>
          notification.id === action.payload ? { ...notification, read: true } : notification
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    case 'NOTIFICATION_MARK_ALL_READ':
      return {
        ...state,
        items: state.items.map(notification => ({ ...notification, read: true })),
        unreadCount: 0,
      };
    case 'NOTIFICATION_DELETE':
      return {
        ...state,
        items: state.items.filter(notification => notification.id !== action.payload),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    case 'NOTIFICATION_ADD':
      return {
        ...state,
        items: [action.payload, ...state.items],
        unreadCount: state.unreadCount + 1,
      };
    default:
      return state;
  }
}

// UI reducer
export function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'UI_SET_THEME':
      return { ...state, theme: action.payload };
    case 'UI_TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'UI_SET_SIDEBAR':
      return { ...state, sidebarOpen: action.payload };
    case 'UI_SHOW_MODAL':
      return { ...state, modal: action.payload };
    case 'UI_HIDE_MODAL':
      return { ...state, modal: null };
    case 'UI_SHOW_TOAST':
      return { ...state, toast: action.payload };
    case 'UI_HIDE_TOAST':
      return { ...state, toast: null };
    case 'UI_SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

// Auth reducer
export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_LOGIN_REQUEST':
      return { ...state, loading: true, error: null };
    case 'AUTH_LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        loading: false,
        error: null,
        lastActivity: Date.now(),
      };
    case 'AUTH_LOGIN_FAILURE':
      return { ...state, loading: false, error: action.payload };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        token: null,
        refreshToken: null,
        lastActivity: Date.now(),
      };
    case 'AUTH_REFRESH_REQUEST':
      return { ...state, loading: true, error: null };
    case 'AUTH_REFRESH_SUCCESS':
      return {
        ...state,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        loading: false,
        error: null,
        lastActivity: Date.now(),
      };
    case 'AUTH_REFRESH_FAILURE':
      return { ...state, loading: false, error: action.payload };
    case 'AUTH_UPDATE_ACTIVITY':
      return { ...state, lastActivity: Date.now() };
    default:
      return state;
  }
}

// Root reducer
export function appReducer(state: AppState, action: AppAction): AppState {
  return {
    user: userReducer(state.user, action as UserAction),
    expenses: expenseReducer(state.expenses, action as ExpenseAction),
    budget: budgetReducer(state.budget, action as BudgetAction),
    notifications: notificationReducer(state.notifications, action as NotificationAction),
    ui: uiReducer(state.ui, action as UIAction),
    auth: authReducer(state.auth, action as AuthAction),
  };
}

// ============================================================================
// SELECTORS
// ============================================================================

// User selectors
export const userSelectors = {
  getCurrentUser: (state: AppState) => state.user.currentUser,
  getUsers: (state: AppState) => state.user.users,
  getUserLoading: (state: AppState) => state.user.loading,
  getUserError: (state: AppState) => state.user.error,
  isAuthenticated: (state: AppState) => state.user.currentUser !== null,
};

// Expense selectors
export const expenseSelectors = {
  getExpenses: (state: AppState) => state.expenses.items,
  getExpenseById: (state: AppState, id: number) => state.expenses.items.find(expense => expense.id === id),
  getSelectedExpense: (state: AppState) => state.expenses.selectedExpense,
  getExpenseFilters: (state: AppState) => state.expenses.filters,
  getExpensePagination: (state: AppState) => state.expenses.pagination,
  getExpenseLoading: (state: AppState) => state.expenses.loading,
  getExpenseError: (state: AppState) => state.expenses.error,
  getExpensesByCategory: (state: AppState, category: string) =>
    state.expenses.items.filter(expense => expense.category === category),
  getTotalExpenses: (state: AppState) =>
    state.expenses.items.reduce((total, expense) => total + expense.amount_cents, 0),
};

// Budget selectors
export const budgetSelectors = {
  getMonthlyBudget: (state: AppState, year: number, month: number) => {
    const key = `${year}-${month}`;
    return state.budget.monthlyBudgets[key];
  },
  getBudgetCategories: (state: AppState) => state.budget.categories,
  getBudgetLoading: (state: AppState) => state.budget.loading,
  getBudgetError: (state: AppState) => state.budget.error,
  getBudgetLastUpdated: (state: AppState) => state.budget.lastUpdated,
};

// Notification selectors
export const notificationSelectors = {
  getNotifications: (state: AppState) => state.notifications.items,
  getUnreadCount: (state: AppState) => state.notifications.unreadCount,
  getNotificationLoading: (state: AppState) => state.notifications.loading,
  getNotificationError: (state: AppState) => state.notifications.error,
  getUnreadNotifications: (state: AppState) => state.notifications.items.filter(notification => !notification.read),
};

// UI selectors
export const uiSelectors = {
  getTheme: (state: AppState) => state.ui.theme,
  getSidebarOpen: (state: AppState) => state.ui.sidebarOpen,
  getModal: (state: AppState) => state.ui.modal,
  getToast: (state: AppState) => state.ui.toast,
  getUILoading: (state: AppState) => state.ui.loading,
};

// Auth selectors
export const authSelectors = {
  getAuthToken: (state: AppState) => state.auth.token,
  getRefreshToken: (state: AppState) => state.auth.refreshToken,
  getAuthLoading: (state: AppState) => state.auth.loading,
  getAuthError: (state: AppState) => state.auth.error,
  getLastActivity: (state: AppState) => state.auth.lastActivity,
  isTokenExpired: (state: AppState) => {
    const lastActivity = state.auth.lastActivity;
    if (!lastActivity) return true;
    const now = Date.now();
    const tokenLifetime = 60 * 60 * 1000; // 1 hour
    return now - lastActivity > tokenLifetime;
  },
};

// ============================================================================
// HOOKS
// ============================================================================

// Main app reducer hook
export function useAppReducer(initialState: AppState) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Memoize dispatch to prevent unnecessary re-renders
  const memoizedDispatch = useCallback(dispatch, []);
  
  return [state, memoizedDispatch] as const;
}

// Hook for specific state slices
export function useAppState<T>(selector: (state: AppState) => T) {
  const [state] = useAppReducer(getInitialState());
  return useMemo(() => selector(state), [state, selector]);
}

// Hook for dispatching actions
export function useAppDispatch() {
  const [, dispatch] = useAppReducer(getInitialState());
  return dispatch;
}

// Hook for combining multiple selectors
export function useAppSelector<T>(selector: (state: AppState) => T) {
  return useAppState(selector);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Get initial state
export function getInitialState(): AppState {
  return {
    user: {
      currentUser: null,
      users: [],
      loading: false,
      error: null,
      lastUpdated: null,
    },
    expenses: {
      items: [],
      categories: [],
      filters: {},
      loading: false,
      error: null,
      pagination: { page: 1, pageSize: 20, total: 0 },
      selectedExpense: null,
    },
    budget: {
      monthlyBudgets: {},
      categories: [],
      loading: false,
      error: null,
      lastUpdated: null,
    },
    notifications: {
      items: [],
      unreadCount: 0,
      loading: false,
      error: null,
    },
    ui: {
      theme: 'auto',
      sidebarOpen: false,
      modal: null,
      toast: null,
      loading: false,
    },
    auth: {
      isAuthenticated: false,
      token: null,
      refreshToken: null,
      loading: false,
      error: null,
      lastActivity: null,
    },
  };
}

// Create a store with middleware support
export function createStore<S, A extends Action>(
  reducer: Reducer<S, A>,
  initialState: S,
  middleware: Middleware<S, A>[] = []
): Store<S, A> {
  let state = initialState;
  const listeners: (() => void)[] = [];
  
  const store: Store<S, A> = {
    getState: () => state,
    dispatch: (action: A) => {
      state = reducer(state, action);
      listeners.forEach(listener => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      };
    },
  };
  
  // Apply middleware
  let dispatch = store.dispatch;
  middleware.forEach(mw => {
    dispatch = mw(store)(dispatch);
  });
  
  store.dispatch = dispatch;
  
  return store;
}

// ============================================================================
// TYPE DEFINITIONS (Placeholder - would come from actual types)
// ============================================================================

// These are placeholder types - in a real implementation, they would be imported
interface User {
  id: number;
  username: string;
  email: string;
}

interface Expense {
  id: number;
  description: string;
  amount_cents: number;
  category: string;
}

interface MonthlyBudget {
  id: number;
  year: number;
  month: number;
  amount_cents: number;
}

interface BudgetCategory {
  id: number;
  name: string;
  budget_cents: number;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  read: boolean;
}

interface ExpenseFilters {
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
}

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

interface ModalState {
  type: string;
  props: Record<string, any>;
}

interface ToastState {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthResult {
  token: string;
  refreshToken: string;
  user: User;
}