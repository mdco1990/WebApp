import { useReducer, useCallback, useMemo } from 'react';
import { AppState, appReducer, getInitialState } from './appReducer';

// ============================================================================
// HOOKS
// ============================================================================

// Main app reducer hook
export function useAppReducer(initialState: AppState) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Memoize dispatch to prevent unnecessary re-renders
  const memoizedDispatch = useCallback(dispatch, [dispatch]);

  return [state, memoizedDispatch] as const;
}

// Hook for specific state slices
export function useAppState<T>(selector: (state: AppState) => T) {
  const [state] = useAppReducer(getInitialState());
  return useMemo(() => selector(state), [state, selector]);
}

// Hook for dispatching actions
export function useAppDispatch() {
  const [, dispatch] = useAppReducer(getInitialState());
  return dispatch;
}

// Hook for combining multiple selectors
export function useAppSelector<T>(selector: (state: AppState) => T) {
  return useAppState(selector);
}
