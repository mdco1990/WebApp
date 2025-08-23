import { BudgetState, BudgetAction, MonthlyBudget, BudgetCategory } from './appReducer';

// Budget reducer
export function budgetReducer(state: BudgetState, action: BudgetAction): BudgetState {
  switch (action.type) {
    case 'BUDGET_FETCH_REQUEST':
      return { ...state, loading: true, error: null };
    case 'BUDGET_FETCH_SUCCESS': {
      const monthlyBudgets: Record<string, MonthlyBudget> = {};
      if (action.payload) {
        action.payload.forEach((budget) => {
          const key = `${budget.year}-${budget.month}`;
          monthlyBudgets[key] = budget;
        });
      }
      return { ...state, monthlyBudgets, loading: false, error: null, lastUpdated: Date.now() };
    }
    case 'BUDGET_FETCH_FAILURE':
      return { ...state, loading: false, error: action.payload || null };
    case 'BUDGET_UPDATE_REQUEST':
      return { ...state, loading: true, error: null };
    case 'BUDGET_UPDATE_SUCCESS': {
      const key = action.payload ? `${action.payload.year}-${action.payload.month}` : '';
      return {
        ...state,
        monthlyBudgets: action.payload
          ? { ...state.monthlyBudgets, [key]: action.payload }
          : state.monthlyBudgets,
        loading: false,
        error: null,
        lastUpdated: Date.now(),
      };
    }
    case 'BUDGET_UPDATE_FAILURE':
      return { ...state, loading: false, error: action.payload || null };
    case 'BUDGET_CATEGORY_UPDATE':
      return {
        ...state,
        categories: action.payload
          ? state.categories
              .map((category) => (category.id === action.payload!.id ? action.payload! : category))
              .filter((category): category is BudgetCategory => category !== undefined)
          : state.categories,
        lastUpdated: Date.now(),
      };
    default:
      return state;
  }
}
