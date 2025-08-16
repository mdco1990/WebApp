import { useState, useCallback } from 'react';
import { ApiService, DataStore, type IncomeSource } from '../services/api';
import { useApiState } from './useApi';

// Hook for income source management
export const useIncomeSources = (year: number, month: number) => {
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const { loading, error, setLoadingState, setErrorState, updateLastUpdated } = useApiState();
  const _dataStore = DataStore.getInstance();

  // Load income sources
  const loadIncomeSources = useCallback(async () => {
    setLoadingState(true);
    setErrorState(null);

    try {
      const response = await ApiService.getIncomeSources(year, month);
      if (response.success && response.data) {
        setIncomeSources(response.data);
        updateLastUpdated();
      } else {
        setErrorState(response.error || 'Failed to load income sources');
      }
    } catch (err) {
      setErrorState(err instanceof Error ? err.message : 'Failed to load income sources');
    } finally {
      setLoadingState(false);
    }
  }, [year, month, setLoadingState, setErrorState, updateLastUpdated]);

  // Add income source
  const addIncomeSource = useCallback(async (incomeSource: Omit<IncomeSource, 'id'>) => {
    setLoadingState(true);
    setErrorState(null);

    try {
      const response = await ApiService.createIncomeSource(incomeSource);
      if (response.success && response.data) {
        const newIncomeSource = response.data;
        setIncomeSources(prev => [...prev, newIncomeSource]);
        updateLastUpdated();
        return newIncomeSource;
      } else {
        setErrorState(response.error || 'Failed to add income source');
        return null;
      }
    } catch (err) {
      setErrorState(err instanceof Error ? err.message : 'Failed to add income source');
      return null;
    } finally {
      setLoadingState(false);
    }
  }, [setLoadingState, setErrorState, updateLastUpdated]);

  // Update income source
  const updateIncomeSource = useCallback(async (id: number, updates: Partial<IncomeSource>) => {
    setLoadingState(true);
    setErrorState(null);

    try {
      const response = await ApiService.updateIncomeSource(id, updates);
      if (response.success && response.data) {
        const updatedIncomeSource = response.data;
        setIncomeSources(prev => 
          prev.map(inc => inc.id === id ? updatedIncomeSource : inc)
        );
        updateLastUpdated();
        return updatedIncomeSource;
      } else {
        setErrorState(response.error || 'Failed to update income source');
        return null;
      }
    } catch (err) {
      setErrorState(err instanceof Error ? err.message : 'Failed to update income source');
      return null;
    } finally {
      setLoadingState(false);
    }
  }, [setLoadingState, setErrorState, updateLastUpdated]);

  // Delete income source
  const deleteIncomeSource = useCallback(async (id: number) => {
    setLoadingState(true);
    setErrorState(null);

    try {
      const response = await ApiService.deleteIncomeSource(id);
      if (response.success) {
        setIncomeSources(prev => prev.filter(inc => inc.id !== id));
        updateLastUpdated();
        return true;
      } else {
        setErrorState(response.error || 'Failed to delete income source');
        return false;
      }
    } catch (err) {
      setErrorState(err instanceof Error ? err.message : 'Failed to delete income source');
      return false;
    } finally {
      setLoadingState(false);
    }
  }, [setLoadingState, setErrorState, updateLastUpdated]);

  // Refresh income sources
  const refreshIncomeSources = useCallback(() => {
    loadIncomeSources();
  }, [loadIncomeSources]);

  return {
    incomeSources,
    loading,
    error,
    loadIncomeSources,
    addIncomeSource,
    updateIncomeSource,
    deleteIncomeSource,
    refreshIncomeSources,
  };
};