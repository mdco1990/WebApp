import { MonthlyData, Expense, IncomeSource, OutcomeSource as BudgetSource, User } from './budget';

// State interfaces
export interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Data state
  monthlyData: MonthlyData | null;
  expenses: Expense[];
  incomeSources: IncomeSource[];
  budgetSources: BudgetSource[];
  
  // UI state
  currentMonth: { year: number; month: number };
  selectedExpenses: number[];
  filters: {
    category: string;
    minAmount: number;
    maxAmount: number;
    dateRange: { start: Date | null; end: Date | null };
  };
  
  // Reactive streams
  expenseStream: Expense[];
  incomeStream: IncomeSource[];
  budgetStream: BudgetSource[];
  
  // Event history
  events: Array<{
    id: string;
    type: string;
    timestamp: Date;
    data: Record<string, unknown>;
  }>;
  
  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setMonthlyData: (data: MonthlyData) => void;
  setExpenses: (expenses: Expense[]) => void;
  setIncomeSources: (incomeSources: IncomeSource[]) => void;
  setBudgetSources: (budgetSources: BudgetSource[]) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (id: number, updates: Partial<Expense>) => void;
  deleteExpense: (id: number) => void;
  selectExpense: (id: number) => void;
  deselectExpense: (id: number) => void;
  clearSelectedExpenses: () => void;
  addIncomeSource: (income: IncomeSource) => void;
  updateIncomeSource: (id: number, updates: Partial<IncomeSource>) => void;
  deleteIncomeSource: (id: number) => void;
  addBudgetSource: (budget: BudgetSource) => void;
  updateBudgetSource: (id: number, updates: Partial<BudgetSource>) => void;
  deleteBudgetSource: (id: number) => void;
  setCurrentMonth: (year: number, month: number) => void;
  setFilters: (filters: Partial<AppState['filters']>) => void;
  clearFilters: () => void;
  updateExpenseStream: (expenses: Expense[]) => void;
  updateIncomeStream: (income: IncomeSource[]) => void;
  updateBudgetStream: (budget: BudgetSource[]) => void;
  addEvent: (type: string, data: Record<string, unknown>) => void;
  clearEvents: () => void;
  getFilteredExpenses: () => Expense[];
  getTotalExpenses: () => number;
  getTotalIncome: () => number;
  getTotalBudget: () => number;
  getRemaining: () => number;
  getExpenseAnalytics: () => {
    total: number;
    average: number;
    categoryBreakdown: Record<string, number>;
  };
}