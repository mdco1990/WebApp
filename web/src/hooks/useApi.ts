// React Hooks for Frontend-Backend Integration
// These hooks provide reactive state management for API interactions

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ApiService, 
  DataStore, 
  type MonthlyData,
  type EventMetrics
} from '../services/api';
import { EventIntegration } from '../services/EventIntegration';
import { useExpenses } from './useExpenses';
import { useIncomeSources } from './useIncomeSources';
import { useBudgetSources } from './useBudgetSources';

// Custom hook for API state management
export const useApiState = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const setLoadingState = useCallback((isLoading: boolean) => {
    setLoading(isLoading);
  }, []);

  const setErrorState = useCallback((errorMessage: string | null) => {
    setError(errorMessage);
  }, []);

  const updateLastUpdated = useCallback(() => {
    setLastUpdated(new Date());
  }, []);

  return {
    loading,
    error,
    lastUpdated,
    clearError,
    setLoadingState,
    setErrorState,
    updateLastUpdated,
  };
};







// Hook for monthly data (concurrent)
export const useMonthlyData = (year: number, month: number) => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const { loading, error, setLoadingState, setErrorState, updateLastUpdated } = useApiState();
  const dataStore = DataStore.getInstance();

  // Load monthly data
  const loadMonthlyData = useCallback(async () => {
    setLoadingState(true);
    setErrorState(null);

    try {
      const response = await ApiService.getMonthlyData(year, month);
      if (response.success && response.data) {
        setMonthlyData(response.data);
        dataStore.updateMonthlyData(response.data);
        updateLastUpdated();
      } else {
        setErrorState(response.error || 'Failed to load monthly data');
      }
    } catch (err) {
      setErrorState(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingState(false);
    }
  }, [year, month, setLoadingState, setErrorState, updateLastUpdated, dataStore]);

  // Load monthly data on mount and when year/month changes
  useEffect(() => {
    loadMonthlyData();
  }, [loadMonthlyData]);

  return {
    monthlyData,
    loading,
    error,
    loadMonthlyData,
  };
};

// Hook for manual budget
export const useManualBudget = (year: number, month: number) => {
  const [manualBudget, setManualBudget] = useState<Record<string, unknown> | null>(null);
  const { loading, error, setLoadingState, setErrorState, updateLastUpdated } = useApiState();

  // Load manual budget
  const loadManualBudget = useCallback(async () => {
    setLoadingState(true);
    setErrorState(null);

    try {
      const response = await ApiService.getManualBudget(year, month);
      if (response.success && response.data) {
        setManualBudget(response.data as Record<string, unknown>);
        updateLastUpdated();
      } else {
        setErrorState(response.error || 'Failed to load manual budget');
      }
    } catch (err) {
      setErrorState(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingState(false);
    }
  }, [year, month, setLoadingState, setErrorState, updateLastUpdated]);

  // Update manual budget
  const updateManualBudget = useCallback(async (data: Record<string, unknown>) => {
    setLoadingState(true);
    setErrorState(null);

    try {
      const response = await ApiService.saveManualBudget(year, month, data);
      if (response.success && response.data) {
        setManualBudget(response.data as Record<string, unknown>);
        updateLastUpdated();
        return response.data;
      } else {
        setErrorState(response.error || 'Failed to update manual budget');
        return null;
      }
    } catch (err) {
      setErrorState(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoadingState(false);
    }
  }, [year, month, setLoadingState, setErrorState, updateLastUpdated]);

  // Load manual budget on mount and when year/month changes
  useEffect(() => {
    loadManualBudget();
  }, [loadManualBudget]);

  return {
    manualBudget,
    loading,
    error,
    loadManualBudget,
    updateManualBudget,
  };
};

// Hook for event metrics
export const useEventMetrics = () => {
  const [metrics, setMetrics] = useState<EventMetrics | null>(null);
  const { loading, error, setLoadingState, setErrorState, updateLastUpdated } = useApiState();

  // Load event metrics
  const loadEventMetrics = useCallback(async () => {
    setLoadingState(true);
    setErrorState(null);

    try {
      const response = await ApiService.getEventMetrics();
      if (response.success && response.data) {
        setMetrics(response.data);
        updateLastUpdated();
      } else {
        setErrorState(response.error || 'Failed to load event metrics');
      }
    } catch (err) {
      setErrorState(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingState(false);
    }
  }, [setLoadingState, setErrorState, updateLastUpdated]);

  // Load event metrics on mount
  useEffect(() => {
    loadEventMetrics();
  }, [loadEventMetrics]);

  return {
    metrics,
    loading,
    error,
    loadEventMetrics,
  };
};

// Hook for system health
export const useSystemHealth = () => {
  const { loading, error, setLoadingState, setErrorState, updateLastUpdated } = useApiState();

  // Publish system health
  const publishSystemHealth = useCallback(async (
    status: string,
    message: string,
    metrics: Record<string, unknown>
  ) => {
    setLoadingState(true);
    setErrorState(null);

    try {
      const response = await ApiService.publishSystemHealth(status, message, metrics);
      if (response.success) {
        updateLastUpdated();
        return true;
      } else {
        setErrorState(response.error || 'Failed to publish system health');
        return false;
      }
    } catch (err) {
      setErrorState(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoadingState(false);
    }
  }, [setLoadingState, setErrorState, updateLastUpdated]);

  return {
    loading,
    error,
    publishSystemHealth,
  };
};

// Hook for event integration
export const useEventIntegration = (userId: number) => {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<{ type: string; data: unknown; timestamp: Date } | null>(null);

  // Connect to event stream
  const connect = useCallback(() => {
    EventIntegration.connect(userId);
    setConnected(true);
  }, [userId]);

  // Disconnect from event stream
  const disconnect = useCallback(() => {
    EventIntegration.disconnect();
    setConnected(false);
  }, []);

  // Subscribe to events
  const subscribe = useCallback((eventType: string, callback: (data: unknown) => void) => {
    EventIntegration.subscribe(eventType, (data: unknown) => {
      setLastEvent({ type: eventType, data, timestamp: new Date() });
      callback(data);
    });
  }, []);

  // Unsubscribe from events
  const unsubscribe = useCallback((eventType: string, callback: (data: unknown) => void) => {
    EventIntegration.unsubscribe(eventType, callback);
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connected,
    lastEvent,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
  };
};

// Hook for health check
export const useHealthCheck = () => {
  const [healthStatus, setHealthStatus] = useState<Record<string, unknown> | null>(null);
  const { loading, error, setLoadingState, setErrorState, updateLastUpdated } = useApiState();

  // Perform health check
  const checkHealth = useCallback(async () => {
    setLoadingState(true);
    setErrorState(null);

    try {
      const response = await ApiService.healthCheck();
      if (response.success && response.data) {
        setHealthStatus(response.data as Record<string, unknown>);
        updateLastUpdated();
      } else {
        setErrorState(response.error || 'Health check failed');
      }
    } catch (err) {
      setErrorState(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingState(false);
    }
  }, [setLoadingState, setErrorState, updateLastUpdated]);

  return {
    healthStatus,
    loading,
    error,
    checkHealth,
  };
};

// Hook for reactive data store
export const useDataStore = () => {
  const dataStore = useMemo(() => DataStore.getInstance(), []);

  return {
    monthlyData: dataStore.monthlyData,
    expenses: dataStore.expenses,
    incomeSources: dataStore.incomeSources,
    budgetSources: dataStore.budgetSources,
    summary: dataStore.summary,
  };
};

// Combined hook for all API functionality
export const useApi = () => {
  return {
    // Individual hooks
    useApiState,
    useExpenses,
    useIncomeSources,
    useBudgetSources,
    useMonthlyData,
    useManualBudget,
    useEventMetrics,
    useSystemHealth,
    useEventIntegration,
    useHealthCheck,
    useDataStore,

    // Direct API service
    ApiService,
    EventIntegration,
    DataStore,
  };
};