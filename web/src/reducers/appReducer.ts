// Type-safe reducer pattern with TypeScript
// This file provides comprehensive state management using the reducer pattern

// ============================================================================
// BASE TYPES
// ============================================================================

// Base action interface
export interface Action<T = string, P = unknown> {
  type: T;
  payload?: P;
  meta?: Record<string, unknown>;
  error?: boolean;
}

// Action creator function type
export type ActionCreator<T = string, P = unknown> = (
  payload?: P,
  meta?: Record<string, unknown>
) => Action<T, P>;

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
export type AppAction =
  | UserAction
  | ExpenseAction
  | BudgetAction
  | NotificationAction
  | UIAction
  | AuthAction;

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
  fetchSuccess: (expenses: Expense[]): ExpenseAction => ({
    type: 'EXPENSE_FETCH_SUCCESS',
    payload: expenses,
  }),
  fetchFailure: (error: string): ExpenseAction => ({
    type: 'EXPENSE_FETCH_FAILURE',
    payload: error,
  }),
  createRequest: (expense: Partial<Expense>): ExpenseAction => ({
    type: 'EXPENSE_CREATE_REQUEST',
    payload: expense,
  }),
  createSuccess: (expense: Expense): ExpenseAction => ({
    type: 'EXPENSE_CREATE_SUCCESS',
    payload: expense,
  }),
  createFailure: (error: string): ExpenseAction => ({
    type: 'EXPENSE_CREATE_FAILURE',
    payload: error,
  }),
  updateRequest: (expense: Partial<Expense>): ExpenseAction => ({
    type: 'EXPENSE_UPDATE_REQUEST',
    payload: expense,
  }),
  updateSuccess: (expense: Expense): ExpenseAction => ({
    type: 'EXPENSE_UPDATE_SUCCESS',
    payload: expense,
  }),
  updateFailure: (error: string): ExpenseAction => ({
    type: 'EXPENSE_UPDATE_FAILURE',
    payload: error,
  }),
  deleteRequest: (id: number): ExpenseAction => ({ type: 'EXPENSE_DELETE_REQUEST', payload: id }),
  deleteSuccess: (id: number): ExpenseAction => ({ type: 'EXPENSE_DELETE_SUCCESS', payload: id }),
  deleteFailure: (error: string): ExpenseAction => ({
    type: 'EXPENSE_DELETE_FAILURE',
    payload: error,
  }),
  select: (expense: Expense | null): ExpenseAction => ({
    type: 'EXPENSE_SELECT',
    payload: expense,
  }),
  setFilters: (filters: ExpenseFilters): ExpenseAction => ({
    type: 'EXPENSE_SET_FILTERS',
    payload: filters,
  }),
  setPagination: (pagination: Partial<PaginationState>): ExpenseAction => ({
    type: 'EXPENSE_SET_PAGINATION',
    payload: pagination,
  }),
};

// Budget action creators
export const budgetActions = {
  fetchRequest: (): BudgetAction => ({ type: 'BUDGET_FETCH_REQUEST' }),
  fetchSuccess: (budgets: MonthlyBudget[]): BudgetAction => ({
    type: 'BUDGET_FETCH_SUCCESS',
    payload: budgets,
  }),
  fetchFailure: (error: string): BudgetAction => ({ type: 'BUDGET_FETCH_FAILURE', payload: error }),
  updateRequest: (budget: Partial<MonthlyBudget>): BudgetAction => ({
    type: 'BUDGET_UPDATE_REQUEST',
    payload: budget,
  }),
  updateSuccess: (budget: MonthlyBudget): BudgetAction => ({
    type: 'BUDGET_UPDATE_SUCCESS',
    payload: budget,
  }),
  updateFailure: (error: string): BudgetAction => ({
    type: 'BUDGET_UPDATE_FAILURE',
    payload: error,
  }),
  updateCategory: (category: BudgetCategory): BudgetAction => ({
    type: 'BUDGET_CATEGORY_UPDATE',
    payload: category,
  }),
};

// Notification action creators
export const notificationActions = {
  fetchRequest: (): NotificationAction => ({ type: 'NOTIFICATION_FETCH_REQUEST' }),
  fetchSuccess: (notifications: Notification[]): NotificationAction => ({
    type: 'NOTIFICATION_FETCH_SUCCESS',
    payload: notifications,
  }),
  fetchFailure: (error: string): NotificationAction => ({
    type: 'NOTIFICATION_FETCH_FAILURE',
    payload: error,
  }),
  markRead: (id: number): NotificationAction => ({ type: 'NOTIFICATION_MARK_READ', payload: id }),
  markAllRead: (): NotificationAction => ({ type: 'NOTIFICATION_MARK_ALL_READ' }),
  delete: (id: number): NotificationAction => ({ type: 'NOTIFICATION_DELETE', payload: id }),
  add: (notification: Notification): NotificationAction => ({
    type: 'NOTIFICATION_ADD',
    payload: notification,
  }),
};

// UI action creators
export const uiActions = {
  setTheme: (theme: 'light' | 'dark' | 'auto'): UIAction => ({
    type: 'UI_SET_THEME',
    payload: theme,
  }),
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
  loginRequest: (credentials: LoginCredentials): AuthAction => ({
    type: 'AUTH_LOGIN_REQUEST',
    payload: credentials,
  }),
  loginSuccess: (result: AuthResult): AuthAction => ({
    type: 'AUTH_LOGIN_SUCCESS',
    payload: result,
  }),
  loginFailure: (error: string): AuthAction => ({ type: 'AUTH_LOGIN_FAILURE', payload: error }),
  logout: (): AuthAction => ({ type: 'AUTH_LOGOUT' }),
  refreshRequest: (): AuthAction => ({ type: 'AUTH_REFRESH_REQUEST' }),
  refreshSuccess: (result: AuthResult): AuthAction => ({
    type: 'AUTH_REFRESH_SUCCESS',
    payload: result,
  }),
  refreshFailure: (error: string): AuthAction => ({ type: 'AUTH_REFRESH_FAILURE', payload: error }),
  updateActivity: (): AuthAction => ({ type: 'AUTH_UPDATE_ACTIVITY' }),
};

// ============================================================================
// REDUCERS
// ============================================================================

// Import reducers from separate files to reduce file size and complexity
import { userReducer } from './userReducer';
import { expenseReducer } from './expenseReducer';
import { authReducer } from './authReducer';
import { budgetReducer } from './budgetReducer';
import { notificationReducer } from './notificationReducer';
import { uiReducer } from './uiReducer';

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

// Import selectors from separate file to reduce file size
export * from './selectors';

// ============================================================================
// HOOKS
// ============================================================================

// Import hooks from separate file to reduce file size
export * from './hooks';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Import utility functions from separate file to reduce file size
export * from './utils';

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

// Budget types
export interface MonthlyBudget {
  id: number;
  year: number;
  month: number;
  amount_cents: number;
  category: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetCategory {
  id: number;
  name: string;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

// Notification type
export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
  updated_at: string;
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
  props: Record<string, unknown>;
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
