import { UIState, UIAction } from './appReducer';

// UI reducer
export function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'UI_SET_THEME':
      return { ...state, theme: action.payload || 'auto' };
    case 'UI_TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'UI_SET_SIDEBAR':
      return { ...state, sidebarOpen: action.payload || false };
    case 'UI_SHOW_MODAL':
      return { ...state, modal: action.payload || null };
    case 'UI_HIDE_MODAL':
      return { ...state, modal: null };
    case 'UI_SHOW_TOAST':
      return { ...state, toast: action.payload || null };
    case 'UI_HIDE_TOAST':
      return { ...state, toast: null };
    case 'UI_SET_LOADING':
      return { ...state, loading: action.payload || false };
    default:
      return state;
  }
}
