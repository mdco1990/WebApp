import { AuthState, AuthAction } from './appReducer';
import { createLoadingState, createSuccessState, createFailureState } from './helpers';

// Auth reducer - broken down into smaller functions to reduce complexity
const handleAuthLogin = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_LOGIN_REQUEST':
      return createLoadingState(state);
    case 'AUTH_LOGIN_SUCCESS':
      return {
        ...createSuccessState(state, { 
          isAuthenticated: true,
          token: action.payload?.token || '',
          refreshToken: action.payload?.refreshToken || ''
        }),
        lastActivity: Date.now()
      };
    case 'AUTH_LOGIN_FAILURE':
      return createFailureState(state, action.payload || null);
    default:
      return state;
  }
};

const handleAuthRefresh = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_REFRESH_REQUEST':
      return createLoadingState(state);
    case 'AUTH_REFRESH_SUCCESS':
      return {
        ...createSuccessState(state, {
          token: action.payload?.token || '',
          refreshToken: action.payload?.refreshToken || ''
        }),
        lastActivity: Date.now()
      };
    case 'AUTH_REFRESH_FAILURE':
      return createFailureState(state, action.payload || null);
    default:
      return state;
  }
};

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  // Try each handler in sequence
  const loginResult = handleAuthLogin(state, action);
  if (loginResult !== state) return loginResult;
  
  const refreshResult = handleAuthRefresh(state, action);
  if (refreshResult !== state) return refreshResult;
  
  // Handle simple state updates
  switch (action.type) {
    case 'AUTH_LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        token: null,
        refreshToken: null,
        lastActivity: Date.now(),
      };
    case 'AUTH_UPDATE_ACTIVITY':
      return { ...state, lastActivity: Date.now() };
    default:
      return state;
  }
}
