// Common helper functions for reducers to reduce complexity and duplication
export const createLoadingState = <T extends { loading: boolean; error: string | null }>(
  state: T
): T => ({ ...state, loading: true, error: null });

export const createSuccessState = <T extends { loading: boolean; error: string | null }>(
  state: T,
  updates: Partial<T>
): T => ({ ...state, ...updates, loading: false, error: null });

export const createFailureState = <T extends { loading: boolean; error: string | null }>(
  state: T,
  error: string | null
): T => ({ ...state, loading: false, error });
