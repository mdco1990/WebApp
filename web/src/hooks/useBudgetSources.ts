import { useState, useCallback } from 'react';
import { ApiService, DataStore, type BudgetSource } from '../services/api';
import { useApiState } from './useApi';

// Hook for budget source management
export const useBudgetSources = (year: number, month: number) => {
  const [budgetSources, setBudgetSources] = useState<BudgetSource[]>([]);
  const { loading, error, setLoadingState, setErrorState, updateLastUpdated } = useApiState();
  const _dataStore = DataStore.getInstance();

  // Load budget sources
  const loadBudgetSources = useCallback(async () => {
    setLoadingState(true);
    setErrorState(null);

    try {
      const response = await ApiService.getBudgetSources(year, month);
      if (response.success && response.data) {
        setBudgetSources(response.data);
        updateLastUpdated();
      } else {
        setErrorState(response.error || 'Failed to load budget sources');
      }
    } catch (err) {
      setErrorState(err instanceof Error ? err.message : 'Failed to load budget sources');
    } finally {
      setLoadingState(false);
    }
  }, [year, month, setLoadingState, setErrorState, updateLastUpdated]);

  // Add budget source
  const addBudgetSource = useCallback(async (budgetSource: Omit<BudgetSource, 'id'>) => {
    setLoadingState(true);
    setErrorState(null);

    try {
      const response = await ApiService.createBudgetSource(budgetSource);
      if (response.success && response.data) {
        const newBudgetSource = response.data;
        setBudgetSources(prev => [...prev, newBudgetSource]);
        updateLastUpdated();
        return newBudgetSource;
      } else {
        setErrorState(response.error || 'Failed to add budget source');
        return null;
      }
    } catch (err) {
      setErrorState(err instanceof Error ? err.message : 'Failed to add budget source');
      return null;
    } finally {
      setLoadingState(false);
    }
  }, [setLoadingState, setErrorState, updateLastUpdated]);

  // Update budget source
  const updateBudgetSource = useCallback(async (id: number, updates: Partial<BudgetSource>) => {
    setLoadingState(true);
    setErrorState(null);

    try {
      const response = await ApiService.updateBudgetSource(id, updates);
      if (response.success && response.data) {
        const updatedBudgetSource = response.data;
        setBudgetSources(prev => 
          prev.map(bud => bud.id === id ? updatedBudgetSource : bud)
        );
        updateLastUpdated();
        return updatedBudgetSource;
      } else {
        setErrorState(response.error || 'Failed to update budget source');
        return null;
      }
    } catch (err) {
      setErrorState(err instanceof Error ? err.message : 'Failed to update budget source');
      return null;
    } finally {
      setLoadingState(false);
    }
  }, [setLoadingState, setErrorState, updateLastUpdated]);

  // Delete budget source
  const deleteBudgetSource = useCallback(async (id: number) => {
    setLoadingState(true);
    setErrorState(null);

    try {
      const response = await ApiService.deleteBudgetSource(id);
      if (response.success) {
        setBudgetSources(prev => prev.filter(bud => bud.id !== id));
        updateLastUpdated();
        return true;
      } else {
        setErrorState(response.error || 'Failed to delete budget source');
        return false;
      }
    } catch (err) {
      setErrorState(err instanceof Error ? err.message : 'Failed to delete budget source');
      return false;
    } finally {
      setLoadingState(false);
    }
  }, [setLoadingState, setErrorState, updateLastUpdated]);

  // Refresh budget sources
  const refreshBudgetSources = useCallback(() => {
    loadBudgetSources();
  }, [loadBudgetSources]);

  return {
    budgetSources,
    loading,
    error,
    loadBudgetSources,
    addBudgetSource,
    updateBudgetSource,
    deleteBudgetSource,
    refreshBudgetSources,
  };
};