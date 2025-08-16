import { useEffect, useRef, useCallback, useState } from 'react';
import { AppEvent } from '../types/appState';

// Event Source Types
export interface EventSourceConfig {
  url: string;
  eventTypes?: string[];
  onMessage?: (event: AppEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface EventListenerHook {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  events: AppEvent[];
  connect: () => void;
  disconnect: () => void;
  sendEvent: (event: Omit<AppEvent, 'id' | 'timestamp'>) => void;
  clearEvents: () => void;
}

// Event Source Implementation
class EventSourceManager {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private config: EventSourceConfig;
  private onStateChange: (state: { isConnected: boolean; isConnecting: boolean; error: string | null }) => void;

  constructor(config: EventSourceConfig, onStateChange: (state: { isConnected: boolean; isConnecting: boolean; error: string | null }) => void) {
    this.config = config;
    this.onStateChange = onStateChange;
  }

  connect() {
    if (this.eventSource) {
      this.disconnect();
    }

    this.onStateChange({ isConnected: false, isConnecting: true, error: null });
    this.reconnectAttempts = 0;

    try {
      this.eventSource = new EventSource(this.config.url);

      this.eventSource.onopen = () => {
        this.onStateChange({ isConnected: true, isConnecting: false, error: null });
        this.reconnectAttempts = 0;
        this.config.onOpen?.();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const appEvent: AppEvent = JSON.parse(event.data);
          this.config.onMessage?.(appEvent);
        } catch {
          // Failed to parse event silently
        }
      };

      this.eventSource.onerror = (_error) => {
        this.onStateChange({ isConnected: false, isConnecting: false, error: 'Connection error' });
        this.config.onError?.(_error);
        this.scheduleReconnect();
      };

      // Add specific event type listeners
      if (this.config.eventTypes) {
        this.config.eventTypes.forEach(eventType => {
          this.eventSource?.addEventListener(eventType, (event) => {
            try {
              const appEvent: AppEvent = JSON.parse(event.data);
              this.config.onMessage?.(appEvent);
            } catch {
              // Failed to parse event silently
            }
          });
        });
      }

    } catch {
      this.onStateChange({ isConnected: false, isConnecting: false, error: 'Failed to create connection' });
      this.scheduleReconnect();
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.onStateChange({ isConnected: false, isConnecting: false, error: null });
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 5)) {
      this.onStateChange({ isConnected: false, isConnecting: false, error: 'Max reconnection attempts reached' });
      return;
    }

    this.reconnectAttempts++;
    const interval = this.config.reconnectInterval || 5000;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, interval);
  }

  sendEvent(_event: Omit<AppEvent, 'id' | 'timestamp'>) {
    if (!this.eventSource || this.eventSource.readyState !== EventSource.OPEN) {
      throw new Error('EventSource is not connected');
    }

    // For Server-Sent Events, we can't send data back through the same connection
    // This would typically be done through a separate HTTP request
    // console.log('Event would be sent:', _event);
  }
}

// Custom Hook for Event Listening
export function useEventListener(config: EventSourceConfig): EventListenerHook {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<AppEvent[]>([]);
  
  const eventSourceRef = useRef<EventSourceManager | null>(null);

  const handleStateChange = useCallback((state: { isConnected: boolean; isConnecting: boolean; error: string | null }) => {
    setIsConnected(state.isConnected);
    setIsConnecting(state.isConnecting);
    setError(state.error);
  }, []);

  const handleMessage = useCallback((event: AppEvent) => {
    setEvents(prev => [...prev, event]);
    config.onMessage?.(event);
  }, [config]);

  const connect = useCallback(() => {
    if (!eventSourceRef.current) {
      eventSourceRef.current = new EventSourceManager(
        { ...config, onMessage: handleMessage },
        handleStateChange
      );
    }
    eventSourceRef.current.connect();
  }, [config, handleMessage, handleStateChange]);

  const disconnect = useCallback(() => {
    eventSourceRef.current?.disconnect();
  }, []);

  const sendEvent = useCallback((event: Omit<AppEvent, 'id' | 'timestamp'>) => {
    eventSourceRef.current?.sendEvent(event);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    error,
    events,
    connect,
    disconnect,
    sendEvent,
    clearEvents,
  };
}

// Specific Event Listeners
export function useExpenseEvents(onEvent?: (event: AppEvent) => void) {
  return useEventListener({
    url: '/api/events/expenses',
    eventTypes: ['expense.created', 'expense.updated', 'expense.deleted'],
    onMessage: onEvent,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
  });
}

export function useBudgetEvents(onEvent?: (event: AppEvent) => void) {
  return useEventListener({
    url: '/api/events/budgets',
    eventTypes: ['budget.exceeded', 'budget_source.created', 'budget_source.updated', 'budget_source.deleted'],
    onMessage: onEvent,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
  });
}

export function useUserEvents(onEvent?: (event: AppEvent) => void) {
  return useEventListener({
    url: '/api/events/users',
    eventTypes: ['user.logged_in', 'user.logged_out'],
    onMessage: onEvent,
    reconnectInterval: 5000,
    maxReconnectAttempts: 5,
  });
}

export function useSystemEvents(onEvent?: (event: AppEvent) => void) {
  return useEventListener({
    url: '/api/events/system',
    eventTypes: ['system.health', 'monthly_data.updated'],
    onMessage: onEvent,
    reconnectInterval: 10000,
    maxReconnectAttempts: 3,
  });
}

// Combined Event Hook
export function useAllEvents(onEvent?: (event: AppEvent) => void) {
  const expenseEvents = useExpenseEvents(onEvent);
  const budgetEvents = useBudgetEvents(onEvent);
  const userEvents = useUserEvents(onEvent);
  const systemEvents = useSystemEvents(onEvent);

  const allEvents = [
    ...expenseEvents.events,
    ...budgetEvents.events,
    ...userEvents.events,
    ...systemEvents.events,
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const isConnected = expenseEvents.isConnected && 
                     budgetEvents.isConnected && 
                     userEvents.isConnected && 
                     systemEvents.isConnected;

  const isConnecting = expenseEvents.isConnecting || 
                      budgetEvents.isConnecting || 
                      userEvents.isConnecting || 
                      systemEvents.isConnecting;

  const error = expenseEvents.error || 
                budgetEvents.error || 
                userEvents.error || 
                systemEvents.error;

  const connect = () => {
    expenseEvents.connect();
    budgetEvents.connect();
    userEvents.connect();
    systemEvents.connect();
  };

  const disconnect = () => {
    expenseEvents.disconnect();
    budgetEvents.disconnect();
    userEvents.disconnect();
    systemEvents.disconnect();
  };

  const clearEvents = () => {
    expenseEvents.clearEvents();
    budgetEvents.clearEvents();
    userEvents.clearEvents();
    systemEvents.clearEvents();
  };

  return {
    isConnected,
    isConnecting,
    error,
    events: allEvents,
    connect,
    disconnect,
    clearEvents,
    expenseEvents,
    budgetEvents,
    userEvents,
    systemEvents,
  };
}

// Event Filtering Hooks
export function useFilteredEvents(
  events: AppEvent[],
  filter: (event: AppEvent) => boolean
) {
  return events.filter(filter);
}

export function useEventsByType(events: AppEvent[], eventType: string) {
  return useFilteredEvents(events, event => event.type === eventType);
}

export function useRecentEvents(events: AppEvent[], limit: number = 10) {
  return events.slice(0, limit);
}

export function useEventsByTimeRange(events: AppEvent[], startTime: Date, endTime: Date) {
  return useFilteredEvents(events, event => 
    event.timestamp >= startTime && event.timestamp <= endTime
  );
}

// Event Statistics Hooks
export function useEventStatistics(events: AppEvent[]) {
  const statistics = events.reduce((acc, event) => {
    acc.total++;
    acc.byType[event.type] = (acc.byType[event.type] || 0) + 1;
    acc.bySource[event.source] = (acc.bySource[event.source] || 0) + 1;
    
    const hour = event.timestamp.getHours();
    acc.byHour[hour] = (acc.byHour[hour] || 0) + 1;
    
    return acc;
  }, {
    total: 0,
    byType: {} as Record<string, number>,
    bySource: {} as Record<string, number>,
    byHour: {} as Record<number, number>,
  });

  return statistics;
}

// Event Debouncing Hook
export function useDebouncedEvents(events: AppEvent[], delay: number = 1000) {
  const [debouncedEvents, setDebouncedEvents] = useState<AppEvent[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEvents(events);
    }, delay);

    return () => clearTimeout(timer);
  }, [events, delay]);

  return debouncedEvents;
}