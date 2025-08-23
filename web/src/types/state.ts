// Type-safe state management with discriminated unions
// This file provides comprehensive state types for managing complex application state

// Base API response type for backend integration
export type ApiResponse<T> = {
  data: T;
  message: string;
  timestamp: string;
  success: boolean;
};

// Discriminated union for API states
export type FetchState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string; retry?: () => void };

// Discriminated union for form states
export type FormState<T> =
  | { status: 'idle'; data: T }
  | { status: 'editing'; data: T; originalData: T }
  | { status: 'submitting'; data: T }
  | { status: 'success'; data: T; message: string }
  | { status: 'error'; data: T; error: string; fieldErrors?: Partial<Record<keyof T, string>> };

// Discriminated union for authentication states
export type AuthState =
  | { status: 'unauthenticated' }
  | { status: 'authenticating' }
  | { status: 'authenticated'; user: User; sessionId: string }
  | { status: 'error'; error: string; retry?: () => void };

// Discriminated union for data synchronization states
export type SyncState<T> =
  | { status: 'synced'; data: T; lastSync: Date }
  | { status: 'syncing'; data: T; lastSync: Date }
  | { status: 'outOfSync'; data: T; lastSync: Date; pendingChanges: number }
  | { status: 'error'; data: T; error: string; lastSync: Date; retry?: () => void };

// Discriminated union for pagination states
export type PaginationState<T> =
  | { status: 'idle' }
  | { status: 'loading'; page: number }
  | { status: 'success'; data: T[]; page: number; totalPages: number; totalItems: number }
  | { status: 'error'; error: string; page: number; retry?: () => void };

// Discriminated union for search states
export type SearchState<T> =
  | { status: 'idle' }
  | { status: 'searching'; query: string }
  | { status: 'success'; data: T[]; query: string; totalResults: number }
  | { status: 'noResults'; query: string }
  | { status: 'error'; error: string; query: string; retry?: () => void };

// Discriminated union for optimistic update states
export type OptimisticState<T> =
  | { status: 'stable'; data: T }
  | { status: 'optimistic'; data: T; pendingOperation: string; rollback?: () => void }
  | { status: 'committing'; data: T; pendingOperation: string }
  | { status: 'rolledBack'; data: T; reason: string };

// Type-safe action creators for state transitions
export type StateAction<T> =
  | { type: 'SET_LOADING' }
  | { type: 'SET_SUCCESS'; payload: T }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESET' }
  | { type: 'RETRY' };

// Extended action types for form state
export type FormStateAction<T> =
  | { type: 'SET_LOADING' }
  | { type: 'SET_EDITING'; payload: T }
  | { type: 'SET_SUBMITTING'; payload: T }
  | { type: 'SET_SUCCESS'; payload: string }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_FIELD_ERRORS'; payload: Partial<Record<keyof T, string>> }
  | { type: 'RESET'; payload: T };

// Type-safe reducer for managing fetch states
export function fetchStateReducer<T>(state: FetchState<T>, action: StateAction<T>): FetchState<T> {
  switch (action.type) {
    case 'SET_LOADING':
      return { status: 'loading' };
    case 'SET_SUCCESS':
      return { status: 'success', data: action.payload };
    case 'SET_ERROR':
      return { status: 'error', error: action.payload };
    case 'RESET':
      return { status: 'idle' };
    case 'RETRY':
      return { status: 'loading' };
    default:
      return state;
  }
}

// Type-safe reducer for managing form states
export function formStateReducer<T>(state: FormState<T>, action: FormStateAction<T>): FormState<T> {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, status: 'submitting' };
    case 'SET_EDITING':
      return {
        ...state,
        status: 'editing',
        data: action.payload,
        originalData: action.payload,
      };
    case 'SET_SUBMITTING':
      return {
        ...state,
        status: 'submitting',
        data: action.payload,
      };
    case 'SET_SUCCESS':
      return {
        ...state,
        status: 'success',
        message: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        status: 'error',
        error: action.payload,
      };
    case 'SET_FIELD_ERRORS':
      return {
        ...state,
        status: 'error',
        error: 'Validation failed',
        fieldErrors: action.payload,
      };
    case 'RESET':
      return { status: 'idle', data: action.payload };
    default:
      return state;
  }
}

// Utility functions for state management
export const createInitialFetchState = <T>(): FetchState<T> => ({ status: 'idle' });

export const createInitialFormState = <T>(initialData: T): FormState<T> => ({
  status: 'idle',
  data: initialData,
});

export const createInitialAuthState = (): AuthState => ({ status: 'unauthenticated' });

export const createInitialSyncState = <T>(initialData: T): SyncState<T> => ({
  status: 'synced',
  data: initialData,
  lastSync: new Date(),
});

// Type guards for runtime type checking
export const isFetchStateLoading = <T>(state: FetchState<T>): state is { status: 'loading' } =>
  state.status === 'loading';

export const isFetchStateSuccess = <T>(
  state: FetchState<T>
): state is { status: 'success'; data: T } => state.status === 'success';

export const isFetchStateError = <T>(
  state: FetchState<T>
): state is { status: 'error'; error: string } => state.status === 'error';

export const isFormStateEditing = <T>(
  state: FormState<T>
): state is { status: 'editing'; data: T; originalData: T } => state.status === 'editing';

export const isFormStateSubmitting = <T>(
  state: FormState<T>
): state is { status: 'submitting'; data: T } => state.status === 'submitting';

// Hook for managing fetch state with type safety
export const useFetchState = <T>() => {
  const [state, setState] = useState<FetchState<T>>(createInitialFetchState<T>());

  const setLoading = useCallback(() => setState({ status: 'loading' }), []);
  const setSuccess = useCallback((data: T) => setState({ status: 'success', data }), []);
  const setError = useCallback((error: string) => setState({ status: 'error', error }), []);
  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return {
    state,
    setLoading,
    setSuccess,
    setError,
    reset,
    isLoading: isFetchStateLoading(state),
    isSuccess: isFetchStateSuccess(state),
    isError: isFetchStateError(state),
  };
};

// Hook for managing form state with type safety
export const useFormState = <T>(initialData: T) => {
  const [state, setState] = useState<FormState<T>>(createInitialFormState(initialData));

  const setEditing = useCallback(
    () =>
      setState((prev) => ({
        status: 'editing',
        data: prev.data,
        originalData: prev.data,
      })),
    []
  );

  const setSubmitting = useCallback(
    () =>
      setState((prev) => ({
        status: 'submitting',
        data: prev.data,
      })),
    []
  );

  const setSuccess = useCallback(
    (message: string) =>
      setState((prev) => ({
        status: 'success',
        data: prev.data,
        message,
      })),
    []
  );

  const setError = useCallback(
    (error: string) =>
      setState((prev) => ({
        status: 'error',
        data: prev.data,
        error,
      })),
    []
  );

  const reset = useCallback(() => setState(createInitialFormState(initialData)), [initialData]);

  return {
    state,
    setEditing,
    setSubmitting,
    setSuccess,
    setError,
    reset,
    isEditing: isFormStateEditing(state),
    isSubmitting: isFormStateSubmitting(state),
  };
};

// Import React hooks for the custom hooks
import { useState, useCallback } from 'react';
import { User } from './budget';
