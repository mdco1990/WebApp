import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { devtools, persist } from 'zustand/middleware';
import { Expense, IncomeSource, OutcomeSource as BudgetSource, User } from '../types/budget';
import { AppState } from '../types/storeState';



// Store type
export type AppStore = AppState;

// Initial state
const initialState: Omit<AppState, 
  | 'setUser' | 'setAuthenticated' | 'setLoading'
  | 'setMonthlyData' | 'setExpenses' | 'setIncomeSources' | 'setBudgetSources'
  | 'addExpense' | 'updateExpense' | 'deleteExpense'
  | 'selectExpense' | 'deselectExpense' | 'clearSelectedExpenses'
  | 'addIncomeSource' | 'updateIncomeSource' | 'deleteIncomeSource'
  | 'addBudgetSource' | 'updateBudgetSource' | 'deleteBudgetSource'
  | 'setCurrentMonth' | 'setFilters' | 'clearFilters'
  | 'updateExpenseStream' | 'updateIncomeStream' | 'updateBudgetStream'
  | 'addEvent' | 'clearEvents'
  | 'getFilteredExpenses' | 'getTotalExpenses' | 'getTotalIncome' | 'getTotalBudget' | 'getRemaining' | 'getExpenseAnalytics'
> = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  
  monthlyData: null,
  expenses: [],
  incomeSources: [],
  budgetSources: [],
  
  currentMonth: {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  },
  selectedExpenses: [],
  filters: {
    category: '',
    minAmount: 0,
    maxAmount: Infinity,
    dateRange: { start: null, end: null },
  },
  
  expenseStream: [],
  incomeStream: [],
  budgetStream: [],
  
  events: [],
};

// Create the store with middleware
export const useAppStore = create<AppStore>()(
  subscribeWithSelector(
    devtools(
      persist(
        (set, get) => ({
          ...initialState,
          
          // Authentication actions
          setUser: (user) => set({ user }),
          setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
          setLoading: (isLoading) => set({ isLoading }),
          
          // Data actions
          setMonthlyData: (data) => set({ monthlyData: data }),
          setExpenses: (expenses) => set({ expenses }),
          setIncomeSources: (incomeSources) => set({ incomeSources }),
          setBudgetSources: (budgetSources) => set({ budgetSources }),
          
          // Expense actions
          addExpense: (expense) => {
            set((state) => ({
              expenses: [...state.expenses, expense],
              events: [
                ...state.events,
                {
                  id: Date.now().toString(),
                  type: 'expense.added',
                  timestamp: new Date(),
                  data: expense as unknown as Record<string, unknown>,
                },
              ],
            }));
          },
          
          updateExpense: (id, updates) => {
            set((state) => ({
              expenses: state.expenses.map((expense) =>
                expense.id === id ? { ...expense, ...updates } : expense
              ),
              events: [
                ...state.events,
                {
                  id: Date.now().toString(),
                  type: 'expense_updated',
                  timestamp: new Date(),
                  data: { id, updates },
                },
              ],
            }));
          },
          
          deleteExpense: (id) => {
            set((state) => ({
              expenses: state.expenses.filter((expense) => expense.id !== id),
              selectedExpenses: state.selectedExpenses.filter((expId) => expId !== id),
              events: [
                ...state.events,
                {
                  id: Date.now().toString(),
                  type: 'expense_deleted',
                  timestamp: new Date(),
                  data: { id },
                },
              ],
            }));
          },
          
          selectExpense: (id: number) => {
            set((state: AppState) => ({
              selectedExpenses: [...state.selectedExpenses, id],
            }));
          },
          
          deselectExpense: (id: number) => {
            set((state: AppState) => ({
              selectedExpenses: state.selectedExpenses.filter((expId: number) => expId !== id),
            }));
          },
          
          clearSelectedExpenses: () => set({ selectedExpenses: [] }),
          
          // Income actions
          addIncomeSource: (income: IncomeSource) => {
            set((state) => ({
              incomeSources: [...state.incomeSources, income],
              events: [
                ...state.events,
                {
                  id: Date.now().toString(),
                  type: 'income.added',
                  timestamp: new Date(),
                  data: income as unknown as Record<string, unknown>,
                },
              ],
            }));
          },
          
          updateIncomeSource: (id: number, updates: Partial<IncomeSource>) => {
            set((state: AppState) => ({
              incomeSources: state.incomeSources.map((income: IncomeSource) =>
                income.id === id ? { ...income, ...updates } : income
              ),
              events: [
                ...state.events,
                {
                  id: Date.now().toString(),
                  type: 'income_updated',
                  timestamp: new Date(),
                  data: { id, updates },
                },
              ],
            }));
          },
          
          deleteIncomeSource: (id: number) => {
            set((state: AppState) => ({
              incomeSources: state.incomeSources.filter((income: IncomeSource) => income.id !== id),
              events: [
                ...state.events,
                {
                  id: Date.now().toString(),
                  type: 'income_deleted',
                  timestamp: new Date(),
                  data: { id },
                },
              ],
            }));
          },
          
          // Budget actions
          addBudgetSource: (budget: BudgetSource) => {
            set((state) => ({
              budgetSources: [...state.budgetSources, budget],
              events: [
                ...state.events,
                {
                  id: Date.now().toString(),
                  type: 'budget.added',
                  timestamp: new Date(),
                  data: budget as unknown as Record<string, unknown>,
                },
              ],
            }));
          },
          
          updateBudgetSource: (id: number, updates: Partial<BudgetSource>) => {
            set((state: AppState) => ({
              budgetSources: state.budgetSources.map((budget: BudgetSource) =>
                budget.id === id ? { ...budget, ...updates } : budget
              ),
              events: [
                ...state.events,
                {
                  id: Date.now().toString(),
                  type: 'budget_updated',
                  timestamp: new Date(),
                  data: { id, updates },
                },
              ],
            }));
          },
          
          deleteBudgetSource: (id: number) => {
            set((state: AppState) => ({
              budgetSources: state.budgetSources.filter((budget: BudgetSource) => budget.id !== id),
              events: [
                ...state.events,
                {
                  id: Date.now().toString(),
                  type: 'budget_deleted',
                  timestamp: new Date(),
                  data: { id },
                },
              ],
            }));
          },
          
          // UI actions
          setCurrentMonth: (year: number, month: number) => set({ currentMonth: { year, month } }),
          
          setFilters: (filters: Partial<AppState['filters']>) => {
            set((state: AppState) => ({
              filters: { ...state.filters, ...filters },
            }));
          },
          
          clearFilters: () => {
            set({
              filters: {
                category: '',
                minAmount: 0,
                maxAmount: Infinity,
                dateRange: { start: null, end: null },
              },
            });
          },
          
          // Reactive stream actions
          updateExpenseStream: (expenses: Expense[]) => set({ expenseStream: expenses }),
          updateIncomeStream: (income: IncomeSource[]) => set({ incomeStream: income }),
          updateBudgetStream: (budget: BudgetSource[]) => set({ budgetStream: budget }),
          
          // Event actions
          addEvent: (type: string, data: Record<string, unknown>) => {
            set((state: AppState) => ({
              events: [
                ...state.events,
                {
                  id: Date.now().toString(),
                  type,
                  timestamp: new Date(),
                  data,
                },
              ],
            }));
          },
          
          clearEvents: () => set({ events: [] }),
          
          // Computed actions
          getFilteredExpenses: () => {
            const state = get();
            let filtered = state.expenses;
            
            if (state.filters.category) {
              filtered = filtered.filter((expense: Expense) =>
                expense.category && expense.category.toLowerCase().includes(state.filters.category.toLowerCase())
              );
            }
            
            if (state.filters.minAmount > 0) {
              filtered = filtered.filter((expense: Expense) => expense.amount_cents >= state.filters.minAmount);
            }
            
            if (state.filters.maxAmount < Infinity) {
              filtered = filtered.filter((expense: Expense) => expense.amount_cents <= state.filters.maxAmount);
            }
            
            if (state.filters.dateRange.start) {
              filtered = filtered.filter((expense: Expense) => {
                const expenseDate = new Date(expense.year || new Date().getFullYear(), (expense.month || new Date().getMonth() + 1) - 1);
                return expenseDate >= state.filters.dateRange.start!;
              });
            }
            
            if (state.filters.dateRange.end) {
              filtered = filtered.filter((expense: Expense) => {
                const expenseDate = new Date(expense.year || new Date().getFullYear(), (expense.month || new Date().getMonth() + 1) - 1);
                return expenseDate <= state.filters.dateRange.end!;
              });
            }
            
            return filtered;
          },
          
          getTotalExpenses: () => {
            const state = get();
            return state.expenses.reduce((total: number, expense: Expense) => total + expense.amount_cents, 0);
          },
          
          getTotalIncome: () => {
            const state = get();
            return state.incomeSources.reduce((total: number, income: IncomeSource) => total + income.amount_cents, 0);
          },
          
          getTotalBudget: () => {
            const state = get();
            return state.budgetSources.reduce((total: number, budget: BudgetSource) => total + budget.amount_cents, 0);
          },
          
          getRemaining: () => {
            const state = get();
            const totalIncome = state.getTotalIncome();
            const totalBudget = state.getTotalBudget();
            const totalExpenses = state.getTotalExpenses();
            return totalIncome + totalBudget - totalExpenses;
          },
          
          getExpenseAnalytics: () => {
            const state = get();
            const expenses = state.expenses;
            
            if (expenses.length === 0) {
              return {
                total: 0,
                average: 0,
                categoryBreakdown: {},
              };
            }
            
            const total = expenses.reduce((sum: number, expense: Expense) => sum + expense.amount_cents, 0);
            const average = total / expenses.length;
            const categoryBreakdown = expenses.reduce((acc: Record<string, number>, expense: Expense) => {
              if (expense.category) {
                acc[expense.category] = (acc[expense.category] || 0) + 1;
              }
              return acc;
            }, {} as Record<string, number>);
            
            return {
              total,
              average,
              categoryBreakdown,
            };
          },
        }),
        {
          name: 'app-storage',
          partialize: (state: AppState) => ({
            user: state.user,
            isAuthenticated: state.isAuthenticated,
            currentMonth: state.currentMonth,
            filters: state.filters,
          }),
        }
      )
    )
  )
);

// Selector hooks for optimized re-renders
export const useUser = () => useAppStore((state: AppState) => state.user);
export const useIsAuthenticated = () => useAppStore((state: AppState) => state.isAuthenticated);
export const useIsLoading = () => useAppStore((state: AppState) => state.isLoading);

export const useMonthlyData = () => useAppStore((state: AppState) => state.monthlyData);
export const useExpenses = () => useAppStore((state: AppState) => state.expenses);
export const useIncomeSources = () => useAppStore((state: AppState) => state.incomeSources);
export const useBudgetSources = () => useAppStore((state: AppState) => state.budgetSources);

export const useCurrentMonth = () => useAppStore((state: AppState) => state.currentMonth);
export const useSelectedExpenses = () => useAppStore((state: AppState) => state.selectedExpenses);
export const useFilters = () => useAppStore((state: AppState) => state.filters);

export const useExpenseStream = () => useAppStore((state: AppState) => state.expenseStream);
export const useIncomeStream = () => useAppStore((state: AppState) => state.incomeStream);
export const useBudgetStream = () => useAppStore((state: AppState) => state.budgetStream);

export const useEvents = () => useAppStore((state: AppState) => state.events);

// Computed selectors
export const useFilteredExpenses = () => useAppStore((state: AppState) => state.getFilteredExpenses());
export const useTotalExpenses = () => useAppStore((state: AppState) => state.getTotalExpenses());
export const useTotalIncome = () => useAppStore((state: AppState) => state.getTotalIncome());
export const useTotalBudget = () => useAppStore((state: AppState) => state.getTotalBudget());
export const useRemaining = () => useAppStore((state: AppState) => state.getRemaining());
export const useExpenseAnalytics = () => useAppStore((state: AppState) => state.getExpenseAnalytics());

// Action hooks
export const useAppActions = () => useAppStore((state: AppState) => ({
  setUser: state.setUser,
  setAuthenticated: state.setAuthenticated,
  setLoading: state.setLoading,
  setMonthlyData: state.setMonthlyData,
  setExpenses: state.setExpenses,
  setIncomeSources: state.setIncomeSources,
  setBudgetSources: state.setBudgetSources,
  addExpense: state.addExpense,
  updateExpense: state.updateExpense,
  deleteExpense: state.deleteExpense,
  selectExpense: state.selectExpense,
  deselectExpense: state.deselectExpense,
  clearSelectedExpenses: state.clearSelectedExpenses,
  addIncomeSource: state.addIncomeSource,
  updateIncomeSource: state.updateIncomeSource,
  deleteIncomeSource: state.deleteIncomeSource,
  addBudgetSource: state.addBudgetSource,
  updateBudgetSource: state.updateBudgetSource,
  deleteBudgetSource: state.deleteBudgetSource,
  setCurrentMonth: state.setCurrentMonth,
  setFilters: state.setFilters,
  clearFilters: state.clearFilters,
  updateExpenseStream: state.updateExpenseStream,
  updateIncomeStream: state.updateIncomeStream,
  updateBudgetStream: state.updateBudgetStream,
  addEvent: state.addEvent,
  clearEvents: state.clearEvents,
}));

// Middleware for logging
useAppStore.subscribe(
  (state: AppState) => state.events,
  (events: AppState['events']) => {
    if (events.length > 0) {
      const _lastEvent = events[events.length - 1];
      // console.log(`[Store Event] ${_lastEvent.type}:`, _lastEvent.data);
    }
  }
);

// Middleware for persistence
useAppStore.subscribe(
  (state: AppState) => state.user,
  (user: User | null) => {
    if (user) {
      // console.log('[Store] User updated:', user.username);
    }
  }
);

// Middleware for analytics
useAppStore.subscribe(
  (state: AppState) => state.expenses,
  (expenses: Expense[]) => {
    if (expenses.length > 0) {
      const _total = expenses.reduce((sum: number, expense: Expense) => sum + expense.amount_cents, 0);
      // console.log(`[Store Analytics] Total expenses: $${(_total / 100).toFixed(2)}`);
    }
  }
);