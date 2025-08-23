import { UserState, UserAction } from './appReducer';
import { createLoadingState, createSuccessState, createFailureState } from './helpers';

// User reducer - broken down into smaller functions to reduce complexity
const handleUserLogin = (state: UserState, action: UserAction): UserState => {
  switch (action.type) {
    case 'USER_LOGIN_REQUEST':
      return createLoadingState(state);
    case 'USER_LOGIN_SUCCESS':
      return {
        ...createSuccessState(state, { currentUser: action.payload || null }),
        lastUpdated: Date.now(),
      };
    case 'USER_LOGIN_FAILURE':
      return createFailureState(state, action.payload || null);
    default:
      return state;
  }
};

const handleUserUpdate = (state: UserState, action: UserAction): UserState => {
  switch (action.type) {
    case 'USER_UPDATE_REQUEST':
      return createLoadingState(state);
    case 'USER_UPDATE_SUCCESS':
      return {
        ...createSuccessState(state, { currentUser: action.payload || null }),
        lastUpdated: Date.now(),
      };
    case 'USER_UPDATE_FAILURE':
      return createFailureState(state, action.payload || null);
    default:
      return state;
  }
};

const handleUserFetch = (state: UserState, action: UserAction): UserState => {
  switch (action.type) {
    case 'USER_FETCH_REQUEST':
      return createLoadingState(state);
    case 'USER_FETCH_SUCCESS':
      return {
        ...createSuccessState(state, { users: action.payload || [] }),
        lastUpdated: Date.now(),
      };
    case 'USER_FETCH_FAILURE':
      return createFailureState(state, action.payload || null);
    default:
      return state;
  }
};

export function userReducer(state: UserState, action: UserAction): UserState {
  // Try each handler in sequence
  const loginResult = handleUserLogin(state, action);
  if (loginResult !== state) return loginResult;

  const updateResult = handleUserUpdate(state, action);
  if (updateResult !== state) return updateResult;

  const fetchResult = handleUserFetch(state, action);
  if (fetchResult !== state) return fetchResult;

  // Handle special cases
  switch (action.type) {
    case 'USER_LOGOUT':
      return { ...state, currentUser: null, lastUpdated: Date.now() };
    default:
      return state;
  }
}
