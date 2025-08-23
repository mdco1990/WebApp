import { AppState, Action, Reducer, Middleware, Store } from './appReducer';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Get initial state
export function getInitialState(): AppState {
  return {
    user: {
      currentUser: null,
      users: [],
      loading: false,
      error: null,
      lastUpdated: null,
    },
    expenses: {
      items: [],
      categories: [],
      filters: {},
      loading: false,
      error: null,
      pagination: { page: 1, pageSize: 20, total: 0 },
      selectedExpense: null,
    },
    budget: {
      monthlyBudgets: {},
      categories: [],
      loading: false,
      error: null,
      lastUpdated: null,
    },
    notifications: {
      items: [],
      unreadCount: 0,
      loading: false,
      error: null,
    },
    ui: {
      theme: 'auto',
      sidebarOpen: false,
      modal: null,
      toast: null,
      loading: false,
    },
    auth: {
      isAuthenticated: false,
      token: null,
      refreshToken: null,
      loading: false,
      error: null,
      lastActivity: null,
    },
  };
}

// Create a store with middleware support
export function createStore<S, A extends Action>(
  reducer: Reducer<S, A>,
  initialState: S,
  middleware: Middleware<S, A>[] = []
): Store<S, A> {
  let state = initialState;
  const listeners: (() => void)[] = [];

  const store: Store<S, A> = {
    getState: () => state,
    dispatch: (action: A) => {
      state = reducer(state, action);
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      };
    },
  };

  // Apply middleware
  let dispatch = store.dispatch;
  middleware.forEach((mw) => {
    dispatch = mw(store)(dispatch);
  });

  store.dispatch = dispatch;
  return store;
}
