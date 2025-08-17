import { NotificationsState, NotificationAction } from './appReducer';

// Notification reducer
export function notificationReducer(state: NotificationsState, action: NotificationAction): NotificationsState {
  switch (action.type) {
    case 'NOTIFICATION_FETCH_REQUEST':
      return { ...state, loading: true, error: null };
    case 'NOTIFICATION_FETCH_SUCCESS':
      return { ...state, items: action.payload || [], loading: false, error: null };
    case 'NOTIFICATION_FETCH_FAILURE':
      return { ...state, loading: false, error: action.payload || null };
    case 'NOTIFICATION_MARK_READ':
      return {
        ...state,
        items: state.items.map((notification) =>
          notification.id === action.payload ? { ...notification, read: true } : notification
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    case 'NOTIFICATION_MARK_ALL_READ':
      return {
        ...state,
        items: state.items.map((notification) => ({ ...notification, read: true })),
        unreadCount: 0,
      };
    case 'NOTIFICATION_DELETE':
      return {
        ...state,
        items: state.items.filter((notification) => notification.id !== action.payload),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    case 'NOTIFICATION_ADD':
      return {
        ...state,
        items: action.payload ? [...state.items, action.payload] : state.items,
        unreadCount: state.unreadCount + 1,
      };
    default:
      return state;
  }
}
