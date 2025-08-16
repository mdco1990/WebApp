import { Expense, IncomeSource, OutcomeSource as BudgetSource, YearMonth } from './budget';

// App State Types
export interface AppState {
  expenses: Expense[];
  incomeSources: IncomeSource[];
  budgetSources: BudgetSource[];
  loading: boolean;
  error: string | null;
  filters: ExpenseFilters;
  events: AppEvent[];
  currentUser: User | null;
  notifications: Notification[];
  analytics: AnalyticsData;
}

export interface User {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
}

export interface ExpenseFilters {
  search: string;
  category: string;
  yearMonth: YearMonth;
  minAmount: number;
  maxAmount: number;
  sortBy: 'date' | 'amount' | 'category' | 'description';
  sortOrder: 'asc' | 'desc';
}

export interface AppEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: Date;
  source: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface AnalyticsData {
  totalExpenses: number;
  totalIncome: number;
  totalBudget: number;
  categoryBreakdown: Record<string, number>;
  monthlyTrends: Record<string, number>;
  budgetUtilization: Record<string, number>;
}