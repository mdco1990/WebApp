// Type-safe state management with discriminated unions
import { IncomeSource, OutcomeSource, Expense } from './budget';

// Base API response type that matches backend structure
export type ApiResponse<T> = {
  data: T;
  message: string;
  timestamp: string;
  success: boolean;
};

// Discriminated union for fetch states
export type FetchState<T> = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

// Discriminated union for form states
export type FormState<T> = 
  | { status: 'idle' }
  | { status: 'editing'; data: T; errors?: Partial<Record<keyof T, string>> }
  | { status: 'validating'; data: T }
  | { status: 'submitting'; data: T }
  | { status: 'success'; data: T }
  | { status: 'error'; data: T; error: string };

// Discriminated union for authentication states
export type AuthState = 
  | { status: 'unauthenticated' }
  | { status: 'authenticating' }
  | { status: 'authenticated'; user: User }
  | { status: 'error'; error: string };

// Discriminated union for background task states
export type TaskState = 
  | { status: 'idle' }
  | { status: 'processing'; taskId: string }
  | { status: 'completed'; taskId: string; result: unknown }
  | { status: 'failed'; taskId: string; error: string };

// Enhanced user type with backend integration
export type User = {
  id: number;
  username: string;
  email?: string;
  is_admin?: boolean;
  created_at?: string;
  last_login?: string;
  status?: string;
};

// Enhanced monthly data type that matches backend concurrent service
export type MonthlyData = {
  year: number;
  month: number;
  month_name?: string;
  income_sources: IncomeSource[];
  budget_sources: OutcomeSource[];
  expenses: Expense[];
  total_income_cents: number;
  total_budget_cents: number;
  total_expenses_cents: number;
  remaining_cents: number;
};

// Background task type that matches backend BackgroundTask
export type BackgroundTask = {
  id: string;
  type: string;
  data?: unknown;
  status: 'processing' | 'completed' | 'failed' | 'cancelled';
  result?: unknown;
  error?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
};

// Type-safe state reducers
export type FetchAction<T> = 
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: T }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'FETCH_RESET' };

export function fetchReducer<T>(state: FetchState<T>, action: FetchAction<T>): FetchState<T> {
  switch (action.type) {
    case 'FETCH_START':
      return { status: 'loading' };
    case 'FETCH_SUCCESS':
      return { status: 'success', data: action.payload };
    case 'FETCH_ERROR':
      return { status: 'error', error: action.payload };
    case 'FETCH_RESET':
      return { status: 'idle' };
    default:
      return state;
  }
}

// Type-safe form actions
export type FormAction<T> = 
  | { type: 'START_EDITING'; payload: T }
  | { type: 'UPDATE_FIELD'; field: keyof T; value: T[keyof T] }
  | { type: 'SET_ERRORS'; payload: Partial<Record<keyof T, string>> }
  | { type: 'START_VALIDATING' }
  | { type: 'START_SUBMITTING' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; payload: string }
  | { type: 'RESET' };

// Helper functions to reduce complexity
function handleIdleState<T>(action: FormAction<T>): FormState<T> | null {
  if (action.type === 'START_EDITING') {
    return { status: 'editing', data: action.payload };
  }
  return null;
}

function handleEditingState<T>(state: FormState<T>, action: FormAction<T>): FormState<T> | null {
  // Type guard to ensure state has data and errors properties
  if (state.status !== 'editing') return null;
  
  switch (action.type) {
    case 'UPDATE_FIELD':
      return {
        ...state,
        data: { ...state.data, [action.field]: action.value },
        errors: state.errors ? { ...state.errors, [action.field]: undefined } : undefined
      };
    case 'SET_ERRORS':
      return { ...state, errors: action.payload };
    case 'START_VALIDATING':
      return { status: 'validating', data: state.data };
    default:
      return null;
  }
}

function handleValidatingState<T>(state: FormState<T>, action: FormAction<T>): FormState<T> | null {
  // Type guard to ensure state has data property
  if (state.status !== 'validating') return null;
  
  if (action.type === 'START_SUBMITTING') {
    return { status: 'submitting', data: state.data };
  }
  return null;
}

function handleSubmittingState<T>(state: FormState<T>, action: FormAction<T>): FormState<T> | null {
  // Type guard to ensure state has data property
  if (state.status !== 'submitting') return null;
  
  switch (action.type) {
    case 'SUBMIT_SUCCESS':
      return { status: 'success', data: state.data };
    case 'SUBMIT_ERROR':
      return { status: 'error', data: state.data, error: action.payload };
    default:
      return null;
  }
}

function handleFinalStates<T>(state: FormState<T>, action: FormAction<T>): FormState<T> | null {
  // Type guard to ensure state has data property
  if (state.status !== 'success' && state.status !== 'error') return null;
  
  switch (action.type) {
    case 'RESET':
      return { status: 'idle' };
    case 'START_EDITING':
      return { status: 'editing', data: action.payload };
    default:
      return null;
  }
}

export function formReducer<T>(state: FormState<T>, action: FormAction<T>): FormState<T> {
  let result: FormState<T> | null = null;
  
  switch (state.status) {
    case 'idle':
      result = handleIdleState(action);
      break;
    case 'editing':
      result = handleEditingState(state, action);
      break;
    case 'validating':
      result = handleValidatingState(state, action);
      break;
    case 'submitting':
      result = handleSubmittingState(state, action);
      break;
    case 'success':
    case 'error':
      result = handleFinalStates(state, action);
      break;
  }
  
  return result || state;
}

// Type guards for runtime type checking
export function isApiResponse<T>(obj: unknown): obj is ApiResponse<T> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'data' in obj &&
    'success' in obj &&
    'message' in obj &&
    'timestamp' in obj
  );
}

export function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as User).id === 'number' &&
    typeof (obj as User).username === 'string'
  );
}

export function isMonthlyData(obj: unknown): obj is MonthlyData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as MonthlyData).year === 'number' &&
    typeof (obj as MonthlyData).month === 'number' &&
    Array.isArray((obj as MonthlyData).income_sources) &&
    Array.isArray((obj as MonthlyData).budget_sources) &&
    Array.isArray((obj as MonthlyData).expenses)
  );
}

export function isBackgroundTask(obj: unknown): obj is BackgroundTask {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as BackgroundTask).id === 'string' &&
    typeof (obj as BackgroundTask).type === 'string' &&
    typeof (obj as BackgroundTask).status === 'string' &&
    typeof (obj as BackgroundTask).created_at === 'string'
  );
}

// Utility types for form handling
export type FormErrors<T> = {
  [K in keyof T]?: string;
};

export type FormTouched<T> = {
  [K in keyof T]?: boolean;
};

export type FormField<T> = {
  value: T;
  error?: string;
  touched: boolean;
  required: boolean;
};

// Optimistic update types
export type OptimisticUpdate<T> = {
  type: 'optimistic';
  data: T;
  timestamp: number;
};

export type ConfirmedUpdate<T> = {
  type: 'confirmed';
  data: T;
  timestamp: number;
};

export type UpdateState<T> = OptimisticUpdate<T> | ConfirmedUpdate<T>;

// Re-export existing types for compatibility
export type { IncomeSource, OutcomeSource, Expense } from './budget';