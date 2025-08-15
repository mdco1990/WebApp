import { useCallback, useEffect, useState } from 'react';
import type { MonthlyData, YearMonth, IncomeSource, OutcomeSource } from '../types/budget';
import {
  getMonthlyData,
  seedDefaults,
  createIncomeSource,
  updateIncomeSource,
  deleteIncomeSource,
  createBudgetSource,
  updateBudgetSource,
  deleteBudgetSource,
} from '../services/api';

export type UseMonthlyDataResult = {
  data: MonthlyData | null;
  loading: boolean;
  reload: () => Promise<void>;
  addDefaultData: () => Promise<void>;
  autoSaveIncomeSource: (source: IncomeSource, ym: YearMonth) => Promise<void>;
  autoSaveOutcomeSource: (source: OutcomeSource, ym: YearMonth) => Promise<void>;
  deleteIncome: (id: number) => Promise<void>;
  deleteOutcome: (id: number) => Promise<void>;
};

export function useMonthlyData(ym: YearMonth | null): UseMonthlyDataResult {
  const [data, setData] = useState<MonthlyData | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!ym) return;
    try {
      setLoading(true);
      const d = await getMonthlyData(ym);
      setData(d);
    } finally {
      setLoading(false);
    }
  }, [ym]);

  const addDefaultData = useCallback(async () => {
    if (!ym) return;
    await seedDefaults(ym);
    await reload();
  }, [ym, reload]);

  // mutations
  const autoSaveIncomeSource = useCallback(
    async (source: IncomeSource, cur: YearMonth) => {
      try {
        if (source.id) {
          await updateIncomeSource(source.id, {
            name: source.name,
            amount_cents: source.amount_cents,
          });
        } else {
          await createIncomeSource({
            name: source.name,
            year: cur.year,
            month: cur.month,
            amount_cents: source.amount_cents,
          });
        }
        // Only reload if this was a creation (no id) to get the new server-assigned id
        if (!source.id) {
          await reload();
        }
      } catch (error) {
        // If save fails, reload to get the correct server state
        await reload();
        throw error;
      }
    },
    [reload]
  );

  const autoSaveOutcomeSource = useCallback(
    async (source: OutcomeSource, cur: YearMonth) => {
      try {
        if (source.id) {
          await updateBudgetSource(source.id, {
            name: source.name,
            amount_cents: source.amount_cents,
          });
        } else {
          await createBudgetSource({
            name: source.name,
            year: cur.year,
            month: cur.month,
            amount_cents: source.amount_cents,
          });
        }
        // Only reload if this was a creation (no id) to get the new server-assigned id
        if (!source.id) {
          await reload();
        }
      } catch (error) {
        // If save fails, reload to get the correct server state
        await reload();
        throw error;
      }
    },
    [reload]
  );

  const deleteIncome = useCallback(
    async (id: number) => {
      await deleteIncomeSource(id);
      await reload();
    },
    [reload]
  );

  const deleteOutcome = useCallback(
    async (id: number) => {
      await deleteBudgetSource(id);
      await reload();
    },
    [reload]
  );

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    data,
    loading,
    reload,
    addDefaultData,
    autoSaveIncomeSource,
    autoSaveOutcomeSource,
    deleteIncome,
    deleteOutcome,
  };
}
