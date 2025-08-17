import { ExpensesState, ExpenseAction } from './appReducer';
import { createLoadingState, createSuccessState, createFailureState } from './helpers';

// Expense reducer - broken down into smaller functions to reduce complexity
const handleExpenseFetch = (state: ExpensesState, action: ExpenseAction): ExpensesState => {
  switch (action.type) {
    case 'EXPENSE_FETCH_REQUEST':
      return createLoadingState(state);
    case 'EXPENSE_FETCH_SUCCESS':
      return createSuccessState(state, { items: action.payload || [] });
    case 'EXPENSE_FETCH_FAILURE':
      return createFailureState(state, action.payload || null);
    default:
      return state;
  }
};

const handleExpenseCreate = (state: ExpensesState, action: ExpenseAction): ExpensesState => {
  switch (action.type) {
    case 'EXPENSE_CREATE_REQUEST':
      return createLoadingState(state);
    case 'EXPENSE_CREATE_SUCCESS':
      return createSuccessState(state, { 
        items: action.payload ? [...state.items, action.payload] : state.items 
      });
    case 'EXPENSE_CREATE_FAILURE':
      return createFailureState(state, action.payload || null);
    default:
      return state;
  }
};

const handleExpenseUpdate = (state: ExpensesState, action: ExpenseAction): ExpensesState => {
  switch (action.type) {
    case 'EXPENSE_UPDATE_REQUEST':
      return createLoadingState(state);
    case 'EXPENSE_UPDATE_SUCCESS': {
      if (!action.payload) return state;
      const updatedItems = state.items.map((expense) => 
        expense.id === action.payload!.id ? action.payload! : expense
      );
      return createSuccessState(state, { items: updatedItems });
    }
    case 'EXPENSE_UPDATE_FAILURE':
      return createFailureState(state, action.payload || null);
    default:
      return state;
  }
};

const handleExpenseDelete = (state: ExpensesState, action: ExpenseAction): ExpensesState => {
  switch (action.type) {
    case 'EXPENSE_DELETE_REQUEST':
      return createLoadingState(state);
    case 'EXPENSE_DELETE_SUCCESS': {
      const updatedItems = state.items.filter((expense) => expense.id !== action.payload);
      const updatedSelectedExpense = state.selectedExpense?.id === action.payload 
        ? null 
        : state.selectedExpense;
      return createSuccessState(state, { 
        items: updatedItems, 
        selectedExpense: updatedSelectedExpense 
      });
    }
    case 'EXPENSE_DELETE_FAILURE':
      return createFailureState(state, action.payload || null);
    default:
      return state;
  }
};

export function expenseReducer(state: ExpensesState, action: ExpenseAction): ExpensesState {
  // Try each handler in sequence
  const fetchResult = handleExpenseFetch(state, action);
  if (fetchResult !== state) return fetchResult;
  
  const createResult = handleExpenseCreate(state, action);
  if (createResult !== state) return createResult;
  
  const updateResult = handleExpenseUpdate(state, action);
  if (updateResult !== state) return updateResult;
  
  const deleteResult = handleExpenseDelete(state, action);
  if (deleteResult !== state) return deleteResult;
  
  // Handle simple state updates
  switch (action.type) {
    case 'EXPENSE_SELECT':
      return { ...state, selectedExpense: action.payload || null };
    case 'EXPENSE_SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'EXPENSE_SET_PAGINATION':
      return { ...state, pagination: { ...state.pagination, ...action.payload } };
    default:
      return state;
  }
}
