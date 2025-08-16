import { useState, useCallback } from 'react';
import { ApiService, DataStore, type Expense } from '../services/api';
import { useApiState } from './useApi';

// Hook for expense management
export const useExpenses = (year: number, month: number) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const { loading, error, setLoadingState, setErrorState, updateLastUpdated } = useApiState();
  const dataStore = DataStore.getInstance();

  // Load expenses
  const loadExpenses = useCallback(async () => {
    setLoadingState(true);
    setErrorState(null);

    try {
      const response = await ApiService.listExpenses(year, month);
      if (response.success && response.data) {
        setExpenses(response.data);
        dataStore.updateMonthlyData({
          year_month: { year, month },
          expenses: response.data,
          income_sources: [],
          budget_sources: [],
        });
        updateLastUpdated();
      } else {
        setErrorState(response.error || 'Failed to load expenses');
      }
    } catch (err) {
      setErrorState(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingState(false);
    }
  }, [year, month, setLoadingState, setErrorState, updateLastUpdated, dataStore]);

  // Add expense
  const addExpense = useCallback(async (expense: Omit<Expense, 'id'>, userId: number) => {
    setLoadingState(true);
    setErrorState(null);

    try {
      const response = await ApiService.addExpense(expense, userId);
      if (response.success && response.data) {
        const newExpense: Expense = { 
          ...expense, 
          id: response.data.id,
          description: expense.description || '',
          amount_cents: expense.amount_cents || 0
        };
        setExpenses(prev => [...prev, newExpense]);
        dataStore.addExpense(newExpense);
        updateLastUpdated();
        return newExpense;
      } else {
        setErrorState(response.error || 'Failed to add expense');
        return null;
      }
    } catch (err) {
      setErrorState(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoadingState(false);
    }
  }, [setLoadingState, setErrorState, updateLastUpdated, dataStore]);

  // Update expense
  const updateExpense = useCallback(async (id: number, updates: Partial<Expense>) => {
    setLoadingState(true);
    setErrorState(null);

    try {
      const response = await ApiService.updateExpense(id, updates);
      if (response.success && response.data) {
        const updatedExpense = response.data;
        setExpenses(prev => 
          prev.map(exp => exp.id === id ? updatedExpense : exp)
        );
        
        // Update data store
        dataStore.updateExpense(updatedExpense);
        updateLastUpdated();
      } else {
        setErrorState(response.error || 'Failed to update expense');
      }
    } catch (err) {
      setErrorState(err instanceof Error ? err.message : 'Failed to update expense');
    } finally {
      setLoadingState(false);
    }
  }, [setLoadingState, setErrorState, updateLastUpdated]);

  // Delete expense
  const deleteExpense = useCallback(async (id: number) => {
    setLoadingState(true);
    setErrorState(null);

    try {
      const response = await ApiService.deleteExpense(id);
      if (response.success) {
        setExpenses(prev => prev.filter(exp => exp.id !== id));
        
        // Update data store
        dataStore.removeExpense(id);
        updateLastUpdated();
      } else {
        setErrorState(response.error || 'Failed to delete expense');
      }
    } catch (err) {
      setErrorState(err instanceof Error ? err.message : 'Failed to delete expense');
    } finally {
      setLoadingState(false);
    }
  }, [setLoadingState, setErrorState, updateLastUpdated]);

  // Refresh expenses
  const refreshExpenses = useCallback(() => {
    loadExpenses();
  }, [loadExpenses]);

  return {
    expenses,
    loading,
    error,
    loadExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    refreshExpenses,
  };
};