import { AppState } from '../types/appState';
import { Expense, IncomeSource, OutcomeSource as BudgetSource } from '../types/budget';

// Define AppAction type locally since it's not exported from appState
export type AppAction =
  | { type: 'SET_EXPENSES'; payload: Expense[] }
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'UPDATE_EXPENSE'; payload: { id: number; updates: Partial<Expense> } }
  | { type: 'DELETE_EXPENSE'; payload: number }
  | { type: 'SET_INCOME_SOURCES'; payload: IncomeSource[] }
  | { type: 'ADD_INCOME_SOURCE'; payload: IncomeSource }
  | { type: 'UPDATE_INCOME_SOURCE'; payload: { id: number; updates: Partial<IncomeSource> } }
  | { type: 'DELETE_INCOME_SOURCE'; payload: number }
  | { type: 'SET_BUDGET_SOURCES'; payload: BudgetSource[] }
  | { type: 'ADD_BUDGET_SOURCE'; payload: BudgetSource }
  | { type: 'UPDATE_BUDGET_SOURCE'; payload: { id: number; updates: Partial<BudgetSource> } }
  | { type: 'DELETE_BUDGET_SOURCE'; payload: number }
  | { type: 'SET_USER'; payload: any }
  | { type: 'CLEAR_USER' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FILTERS'; payload: Partial<any> }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'ADD_EVENT'; payload: { type: string; data: any; source?: string } }
  | { type: 'CLEAR_EVENTS' }
  | { type: 'REMOVE_EVENT'; payload: string }
  | { type: 'LOGIN'; payload: any }
  | { type: 'LOGOUT' }
  | { type: 'ADD_NOTIFICATION'; payload: any }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'SET_ANALYTICS'; payload: any }
  | { type: 'UPDATE_ANALYTICS'; payload: any }
  | { type: 'BATCH_UPDATE'; payload: AppAction[] };

// Utility function to generate unique IDs
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Analytics calculation function
export function calculateAnalytics(
  expenses: Expense[],
  incomeSources: IncomeSource[],
  budgetSources: BudgetSource[]
) {
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount_cents, 0);
  const totalIncome = incomeSources.reduce((sum, income) => sum + income.amount_cents, 0);
  const totalBudget = budgetSources.reduce((sum, budget) => sum + budget.amount_cents, 0);

  // Category breakdown
  const categoryBreakdown = expenses.reduce((acc, expense) => {
    const category = expense.category || 'uncategorized';
    acc[category] = (acc[category] || 0) + expense.amount_cents;
    return acc;
  }, {} as Record<string, number>);

  // Monthly breakdown
  const monthlyBreakdown = expenses.reduce((acc, expense) => {
    const monthKey = `${expense.year}-${expense.month}`;
    acc[monthKey] = (acc[monthKey] || 0) + expense.amount_cents;
    return acc;
  }, {} as Record<string, number>);

  // Budget utilization
  const budgetUtilization = budgetSources.reduce((acc, budget) => {
    const categoryExpenses = expenses
      .filter(expense => expense.category === budget.name)
      .reduce((sum, expense) => sum + expense.amount_cents, 0);
    acc[budget.name] = budget.amount_cents > 0 ? (categoryExpenses / budget.amount_cents) * 100 : 0;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalExpenses,
    totalIncome,
    totalBudget,
    remaining: totalIncome - totalExpenses,
    categoryBreakdown,
    monthlyBreakdown,
    monthlyTrends: monthlyBreakdown,
    budgetUtilization,
    averageExpense: expenses.length > 0 ? totalExpenses / expenses.length : 0,
  };
}

// Action handlers
export function handleSetExpenses(state: AppState, action: AppAction): AppState {
  if (action.type !== 'SET_EXPENSES') return state;
  
  return {
    ...state,
    expenses: action.payload,
    analytics: calculateAnalytics(action.payload, state.incomeSources, state.budgetSources),
  };
}

export function handleAddExpense(state: AppState, action: AppAction): AppState {
  if (action.type !== 'ADD_EXPENSE') return state;
  
  const newExpenses = [...state.expenses, action.payload];
  
  return {
    ...state,
    expenses: newExpenses,
    analytics: calculateAnalytics(newExpenses, state.incomeSources, state.budgetSources),
    events: [
      ...state.events,
      {
        id: generateId(),
        type: 'expense.added',
        timestamp: new Date(),
        data: action.payload as unknown as Record<string, unknown>,
        source: 'user',
      },
    ],
  };
}

export function handleUpdateExpense(state: AppState, action: AppAction): AppState {
  if (action.type !== 'UPDATE_EXPENSE') return state;
  
  const updatedExpenses = state.expenses.map(expense =>
    expense.id === action.payload.id ? { ...expense, ...action.payload.updates } : expense
  );
  
  return {
    ...state,
    expenses: updatedExpenses,
    analytics: calculateAnalytics(updatedExpenses, state.incomeSources, state.budgetSources),
    events: [
      ...state.events,
      {
        id: generateId(),
        type: 'expense.updated',
        timestamp: new Date(),
        data: action.payload as Record<string, unknown>,
        source: 'user',
      },
    ],
  };
}

export function handleDeleteExpense(state: AppState, action: AppAction): AppState {
  if (action.type !== 'DELETE_EXPENSE') return state;
  
  const filteredExpenses = state.expenses.filter(expense => expense.id !== action.payload);
  
  return {
    ...state,
    expenses: filteredExpenses,
    analytics: calculateAnalytics(filteredExpenses, state.incomeSources, state.budgetSources),
    events: [
      ...state.events,
      {
        id: generateId(),
        type: 'expense.deleted',
        timestamp: new Date(),
        data: { id: action.payload } as Record<string, unknown>,
        source: 'user',
      },
    ],
  };
}

export function handleSetIncomeSources(state: AppState, action: AppAction): AppState {
  if (action.type !== 'SET_INCOME_SOURCES') return state;
  
  return {
    ...state,
    incomeSources: action.payload,
    analytics: calculateAnalytics(state.expenses, action.payload, state.budgetSources),
  };
}

export function handleAddIncomeSource(state: AppState, action: AppAction): AppState {
  if (action.type !== 'ADD_INCOME_SOURCE') return state;
  
  const newIncomeSources = [...state.incomeSources, action.payload];
  
  return {
    ...state,
    incomeSources: newIncomeSources,
    analytics: calculateAnalytics(state.expenses, newIncomeSources, state.budgetSources),
    events: [
      ...state.events,
      {
        id: generateId(),
        type: 'income.added',
        timestamp: new Date(),
        data: action.payload as unknown as Record<string, unknown>,
        source: 'user',
      },
    ],
  };
}

export function handleUpdateIncomeSource(state: AppState, action: AppAction): AppState {
  if (action.type !== 'UPDATE_INCOME_SOURCE') return state;
  
  const updatedIncomeSources = state.incomeSources.map(income =>
    income.id === action.payload.id ? { ...income, ...action.payload.updates } : income
  );
  
  return {
    ...state,
    incomeSources: updatedIncomeSources,
    analytics: calculateAnalytics(state.expenses, updatedIncomeSources, state.budgetSources),
    events: [
      ...state.events,
      {
        id: generateId(),
        type: 'income.updated',
        timestamp: new Date(),
        data: action.payload as Record<string, unknown>,
        source: 'user',
      },
    ],
  };
}

export function handleDeleteIncomeSource(state: AppState, action: AppAction): AppState {
  if (action.type !== 'DELETE_INCOME_SOURCE') return state;
  
  const filteredIncomeSources = state.incomeSources.filter(income => income.id !== action.payload);
  
  return {
    ...state,
    incomeSources: filteredIncomeSources,
    analytics: calculateAnalytics(state.expenses, filteredIncomeSources, state.budgetSources),
    events: [
      ...state.events,
      {
        id: generateId(),
        type: 'income.deleted',
        timestamp: new Date(),
        data: { id: action.payload } as Record<string, unknown>,
        source: 'user',
      },
    ],
  };
}

export function handleSetBudgetSources(state: AppState, action: AppAction): AppState {
  if (action.type !== 'SET_BUDGET_SOURCES') return state;
  
  return {
    ...state,
    budgetSources: action.payload,
    analytics: calculateAnalytics(state.expenses, state.incomeSources, action.payload),
  };
}

export function handleAddBudgetSource(state: AppState, action: AppAction): AppState {
  if (action.type !== 'ADD_BUDGET_SOURCE') return state;
  
  const newBudgetSources = [...state.budgetSources, action.payload];
  
  return {
    ...state,
    budgetSources: newBudgetSources,
    analytics: calculateAnalytics(state.expenses, state.incomeSources, newBudgetSources),
    events: [
      ...state.events,
      {
        id: generateId(),
        type: 'budget.added',
        timestamp: new Date(),
        data: action.payload as unknown as Record<string, unknown>,
        source: 'user',
      },
    ],
  };
}

export function handleUpdateBudgetSource(state: AppState, action: AppAction): AppState {
  if (action.type !== 'UPDATE_BUDGET_SOURCE') return state;
  
  const updatedBudgetSources = state.budgetSources.map(budget =>
    budget.id === action.payload.id ? { ...budget, ...action.payload.updates } : budget
  );
  
  return {
    ...state,
    budgetSources: updatedBudgetSources,
    analytics: calculateAnalytics(state.expenses, state.incomeSources, updatedBudgetSources),
    events: [
      ...state.events,
      {
        id: generateId(),
        type: 'budget.updated',
        timestamp: new Date(),
        data: action.payload as Record<string, unknown>,
        source: 'user',
      },
    ],
  };
}

export function handleDeleteBudgetSource(state: AppState, action: AppAction): AppState {
  if (action.type !== 'DELETE_BUDGET_SOURCE') return state;
  
  const filteredBudgetSources = state.budgetSources.filter(budget => budget.id !== action.payload);
  
  return {
    ...state,
    budgetSources: filteredBudgetSources,
    analytics: calculateAnalytics(state.expenses, state.incomeSources, filteredBudgetSources),
    events: [
      ...state.events,
      {
        id: generateId(),
        type: 'budget.deleted',
        timestamp: new Date(),
        data: { id: action.payload } as Record<string, unknown>,
        source: 'user',
      },
    ],
  };
}