import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMonthlyData } from '../useMonthlyData';
import type { MonthlyData, YearMonth, IncomeSource, OutcomeSource } from '../../types/budget';

vi.mock('../../services/api', () => ({
  getMonthlyData: vi.fn(),
  seedDefaults: vi.fn(),
  createIncomeSource: vi.fn(),
  updateIncomeSource: vi.fn(),
  deleteIncomeSource: vi.fn(),
  createBudgetSource: vi.fn(),
  updateBudgetSource: vi.fn(),
  deleteBudgetSource: vi.fn(),
}));

import {
  getMonthlyData,
  seedDefaults,
  createIncomeSource,
  updateIncomeSource,
  deleteIncomeSource,
  createBudgetSource,
  updateBudgetSource,
  deleteBudgetSource,
} from '../../services/api';

const ym: YearMonth = { year: 2025, month: 8 };
const sample: MonthlyData = {
  year: ym.year,
  month: ym.month,
  month_name: 'Aug',
  income_sources: [],
  budget_sources: [],
  expenses: [],
  total_income_cents: 0,
  total_budget_cents: 0,
  total_expenses_cents: 0,
  remaining_cents: 0,
};

describe('useMonthlyData', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('addDefaultData does nothing when ym is null', async () => {
    const { result } = renderHook(() => useMonthlyData(null));
    await act(async () => {
      await result.current.addDefaultData();
    });
    expect(seedDefaults).not.toHaveBeenCalled();
    expect(getMonthlyData).not.toHaveBeenCalled();
  });

  it('autoSaveOutcomeSource reloads and rethrows on error', async () => {
    (getMonthlyData as any).mockResolvedValue(sample);
    (updateBudgetSource as any).mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useMonthlyData(ym));
    await waitFor(() => expect(getMonthlyData).toHaveBeenCalledTimes(1));

    await act(async () => {
      await expect(
        result.current.autoSaveOutcomeSource({ id: 3, name: 'X', amount_cents: 1 }, ym)
      ).rejects.toThrow('boom');
    });
    // reload triggered in catch block
    expect(getMonthlyData).toHaveBeenCalledTimes(2);
  });

  it('does nothing when ym is null and loads when provided', async () => {
    (getMonthlyData as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(sample);

    const { result, rerender } = renderHook(({ v }) => useMonthlyData(v), {
      initialProps: { v: null as YearMonth | null },
    });

    expect(result.current.loading).toBe(false);
    expect(getMonthlyData).not.toHaveBeenCalled();

    rerender({ v: ym });

    await waitFor(() => expect(getMonthlyData).toHaveBeenCalledTimes(1));
    expect(result.current.data).toEqual(sample);
    expect(result.current.loading).toBe(false);
  });

  it('addDefaultData seeds and reloads', async () => {
    (getMonthlyData as any).mockResolvedValue(sample);
    (seedDefaults as any).mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useMonthlyData(ym));

    await waitFor(() => expect(getMonthlyData).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.addDefaultData();
    });

    expect(seedDefaults).toHaveBeenCalledWith(ym);
    expect(getMonthlyData).toHaveBeenCalledTimes(2);
  });

  it('autoSaveIncomeSource updates existing without reload, creates new with reload', async () => {
    (getMonthlyData as any).mockResolvedValue(sample);
    (updateIncomeSource as any).mockResolvedValue({ ok: true });
    (createIncomeSource as any).mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useMonthlyData(ym));
    await waitFor(() => expect(getMonthlyData).toHaveBeenCalledTimes(1));

    const existing: IncomeSource = { id: 10, name: 'Salary', amount_cents: 1000 };
    await act(async () => {
      await result.current.autoSaveIncomeSource(existing, ym);
    });
    expect(updateIncomeSource).toHaveBeenCalledWith(10, { name: 'Salary', amount_cents: 1000 });
    expect(createIncomeSource).not.toHaveBeenCalled();
    // still 1 load (no reload on update)
    expect(getMonthlyData).toHaveBeenCalledTimes(1);

    const fresh: IncomeSource = { name: 'Bonus', amount_cents: 200 };
    await act(async () => {
      await result.current.autoSaveIncomeSource(fresh, ym);
    });
    expect(createIncomeSource).toHaveBeenCalledWith({
      name: 'Bonus',
      year: ym.year,
      month: ym.month,
      amount_cents: 200,
    });
    // reload after create
    expect(getMonthlyData).toHaveBeenCalledTimes(2);
  });

  it('autoSaveIncomeSource reloads and rethrows on error', async () => {
    (getMonthlyData as any).mockResolvedValue(sample);
    (updateIncomeSource as any).mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useMonthlyData(ym));
    await waitFor(() => expect(getMonthlyData).toHaveBeenCalledTimes(1));

    await act(async () => {
      await expect(
        result.current.autoSaveIncomeSource({ id: 1, name: 'X', amount_cents: 1 }, ym)
      ).rejects.toThrow('fail');
    });
    // reload triggered on catch
    expect(getMonthlyData).toHaveBeenCalledTimes(2);
  });

  it('autoSaveOutcomeSource mirrors income behavior', async () => {
    (getMonthlyData as any).mockResolvedValue(sample);
    (updateBudgetSource as any).mockResolvedValue({ ok: true });
    (createBudgetSource as any).mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useMonthlyData(ym));
    await waitFor(() => expect(getMonthlyData).toHaveBeenCalledTimes(1));

    const existing: OutcomeSource = { id: 2, name: 'Rent', amount_cents: 30000 };
    await act(async () => {
      await result.current.autoSaveOutcomeSource(existing, ym);
    });
    expect(updateBudgetSource).toHaveBeenCalledWith(2, { name: 'Rent', amount_cents: 30000 });
    expect(getMonthlyData).toHaveBeenCalledTimes(1);

    const fresh: OutcomeSource = { name: 'Food', amount_cents: 10000 };
    await act(async () => {
      await result.current.autoSaveOutcomeSource(fresh, ym);
    });
    expect(createBudgetSource).toHaveBeenCalledWith({
      name: 'Food',
      year: ym.year,
      month: ym.month,
      amount_cents: 10000,
    });
    expect(getMonthlyData).toHaveBeenCalledTimes(2);
  });

  it('deleteIncome and deleteOutcome call API and reload', async () => {
    (getMonthlyData as any).mockResolvedValue(sample);
    (deleteIncomeSource as any).mockResolvedValue({ ok: true });
    (deleteBudgetSource as any).mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useMonthlyData(ym));
    await waitFor(() => expect(getMonthlyData).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.deleteIncome(5);
    });
    expect(deleteIncomeSource).toHaveBeenCalledWith(5);
    expect(getMonthlyData).toHaveBeenCalledTimes(2);

    await act(async () => {
      await result.current.deleteOutcome(7);
    });
    expect(deleteBudgetSource).toHaveBeenCalledWith(7);
    expect(getMonthlyData).toHaveBeenCalledTimes(3);
  });
});
