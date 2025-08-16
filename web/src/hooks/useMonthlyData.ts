import { useState, useCallback, useEffect } from 'react';
import { ApiService } from '../services/api';
import { MonthlyData } from '../types/budget';

export interface MonthlyDataHook {
  data: MonthlyData | null;
  loading: boolean;
  error: string | null;
  loadData: () => Promise<void>;
  refresh: () => Promise<void>;
  refetch: () => Promise<void>;
  setYearMonth: (year: number, month: number) => void;
  currentYear: number;
  currentMonth: number;
}

export function useMonthlyData(options?: { initialYear?: number; initialMonth?: number }): MonthlyDataHook {
  const currentDate = new Date();
  const [currentYear, setCurrentYear] = useState(options?.initialYear || currentDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(options?.initialMonth || currentDate.getMonth() + 1);
  const [data, setData] = useState<MonthlyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await ApiService.getMonthlyData(currentYear, currentMonth);
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to load monthly data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load monthly data');
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const refetch = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const setYearMonth = useCallback((year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
  }, []);

  // Load data when year/month changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    loadData,
    refresh,
    refetch,
    setYearMonth,
    currentYear,
    currentMonth,
  };
}
