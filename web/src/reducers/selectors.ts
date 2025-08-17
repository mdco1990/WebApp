import { AppState } from './appReducer';

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
  getExpenseById: (state: AppState, id: number) =>
    state.expenses.items.find((expense) => expense.id === id),
  getSelectedExpense: (state: AppState) => state.expenses.selectedExpense,
  getExpenseFilters: (state: AppState) => state.expenses.filters,
  getExpensePagination: (state: AppState) => state.expenses.pagination,
  getExpenseLoading: (state: AppState) => state.expenses.loading,
  getExpenseError: (state: AppState) => state.expenses.error,
  getExpensesByCategory: (state: AppState, category: string) =>
    state.expenses.items.filter((expense) => expense.category === category),
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
  getUnreadNotifications: (state: AppState) =>
    state.notifications.items.filter((notification) => !notification.read),
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
