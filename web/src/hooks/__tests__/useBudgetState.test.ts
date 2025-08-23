import { renderHook, act } from '@testing-library/react';
import { useBudgetState } from '../useBudgetState';

describe('useBudgetState', () => {
  it('should initialize with empty predicted budget', () => {
    const { result } = renderHook(() => useBudgetState());

    expect(result.current.predictedBudget).toEqual({
      incomeSources: [],
      outcomeSources: [],
      totalIncome: 0,
      totalOutcome: 0,
      difference: 0,
    });
  });

  it('should initialize with default savings tracker', () => {
    const { result } = renderHook(() => useBudgetState());

    expect(result.current.savingsTracker).toEqual({
      targetAmount: 10000,
      currentAmount: 2500,
      monthlyContribution: 500,
      monthsToTarget: 15,
      categories: [
        { id: '1', name: 'Travel', amount: 1000, color: '#FF6B6B' },
        { id: '2', name: 'Restaurant', amount: 800, color: '#4ECDC4' },
        { id: '3', name: 'Emergency Fund', amount: 700, color: '#45B7D1' },
      ],
    });
  });

  it('should update predicted budget through setPredictedBudget', () => {
    const { result } = renderHook(() => useBudgetState());

    const newBudget = {
      incomeSources: [
        {
          client_id: '1',
          name: 'Salary',
          amount_cents: 500000, // $5000
        },
      ],
      outcomeSources: [
        {
          client_id: '2',
          name: 'Rent',
          amount_cents: 120000, // $1200
        },
      ],
      totalIncome: 500000,
      totalOutcome: 120000,
      difference: 380000,
    };

    act(() => {
      result.current.setPredictedBudget(newBudget);
    });

    expect(result.current.predictedBudget.incomeSources).toHaveLength(1);
    expect(result.current.predictedBudget.outcomeSources).toHaveLength(1);
    expect(result.current.predictedBudget.incomeSources[0].name).toBe('Salary');
    expect(result.current.predictedBudget.outcomeSources[0].name).toBe('Rent');
  });

  it('should calculate totals correctly when sources are updated', () => {
    const { result } = renderHook(() => useBudgetState());

    act(() => {
      result.current.setPredictedBudget({
        incomeSources: [
          { client_id: '1', name: 'Income 1', amount_cents: 300000 },
          { client_id: '2', name: 'Income 2', amount_cents: 200000 },
        ],
        outcomeSources: [
          { client_id: '3', name: 'Expense 1', amount_cents: 80000 },
          { client_id: '4', name: 'Expense 2', amount_cents: 120000 },
        ],
        totalIncome: 0, // These will be recalculated
        totalOutcome: 0,
        difference: 0,
      });
    });

    expect(result.current.predictedBudget.totalIncome).toBe(500000); // $5000
    expect(result.current.predictedBudget.totalOutcome).toBe(200000); // $2000
    expect(result.current.predictedBudget.difference).toBe(300000); // $3000
  });

  it('should handle empty or undefined amounts in calculations', () => {
    const { result } = renderHook(() => useBudgetState());

    act(() => {
      result.current.setPredictedBudget({
        incomeSources: [{ client_id: '1', name: 'Income with zero amount', amount_cents: 0 }],
        outcomeSources: [{ client_id: '2', name: 'Expense with zero amount', amount_cents: 0 }],
        totalIncome: 0,
        totalOutcome: 0,
        difference: 0,
      });
    });

    expect(result.current.predictedBudget.totalIncome).toBe(0);
    expect(result.current.predictedBudget.totalOutcome).toBe(0);
    expect(result.current.predictedBudget.difference).toBe(0);
  });

  it('should update savings tracker', () => {
    const { result } = renderHook(() => useBudgetState());

    const newSavingsTracker = {
      targetAmount: 15000,
      currentAmount: 3000,
      monthlyContribution: 750,
      monthsToTarget: 16,
      categories: [{ id: '1', name: 'Updated Travel', amount: 1500, color: '#FF6B6B' }],
    };

    act(() => {
      result.current.setSavingsTracker(newSavingsTracker);
    });

    expect(result.current.savingsTracker).toEqual(newSavingsTracker);
  });

  it('should support functional updates for predicted budget', () => {
    const { result } = renderHook(() => useBudgetState());

    // Set initial budget
    act(() => {
      result.current.setPredictedBudget({
        incomeSources: [{ client_id: '1', name: 'Initial Income', amount_cents: 100000 }],
        outcomeSources: [],
        totalIncome: 0,
        totalOutcome: 0,
        difference: 0,
      });
    });

    // Update using functional approach
    act(() => {
      result.current.setPredictedBudget((prev) => ({
        ...prev,
        incomeSources: [
          ...prev.incomeSources,
          { client_id: '2', name: 'Additional Income', amount_cents: 50000 },
        ],
      }));
    });

    expect(result.current.predictedBudget.incomeSources).toHaveLength(2);
    expect(result.current.predictedBudget.totalIncome).toBe(150000); // $1500
    expect(result.current.predictedBudget.difference).toBe(150000); // No expenses, so same as income
  });

  it('should support functional updates for savings tracker', () => {
    const { result } = renderHook(() => useBudgetState());

    act(() => {
      result.current.setSavingsTracker((prev) => ({
        ...prev,
        currentAmount: prev.currentAmount + 500,
      }));
    });

    expect(result.current.savingsTracker.currentAmount).toBe(3000); // 2500 + 500
  });

  it('should compute prev totals inside setPredictedBudget with zero amounts (branch at line ~70)', () => {
    const { result } = renderHook(() => useBudgetState());

    // Seed prev with zero (falsy) income and positive outcome so the reducer hits both paths
    act(() => {
      result.current.setPredictedBudget({
        incomeSources: [{ client_id: 'i1', name: 'Zero Income', amount_cents: 0 }],
        outcomeSources: [{ client_id: 'o1', name: 'Expense', amount_cents: 1000 }],
        totalIncome: 0,
        totalOutcome: 0,
        difference: 0,
      });
    });

    let seenCurrent: any;
    act(() => {
      result.current.setPredictedBudget((current) => {
        // capture what setPredictedBudget computed from prev for branch coverage
        seenCurrent = current;
        return current; // no change
      });
    });

    expect(seenCurrent.totalIncome).toBe(0);
    expect(seenCurrent.totalOutcome).toBe(1000);
    expect(seenCurrent.difference).toBe(-1000);
  });

  it('should compute prev totals with zero outcome amount (cover line ~71 branch)', () => {
    const { result } = renderHook(() => useBudgetState());

    // Seed prev with positive income and zero (falsy) outcome
    act(() => {
      result.current.setPredictedBudget({
        incomeSources: [{ client_id: 'i1', name: 'Income', amount_cents: 1000 }],
        outcomeSources: [{ client_id: 'o1', name: 'Zero Expense', amount_cents: 0 }],
        totalIncome: 0,
        totalOutcome: 0,
        difference: 0,
      });
    });

    let seenCurrent: any;
    act(() => {
      result.current.setPredictedBudget((current) => {
        seenCurrent = current;
        return current;
      });
    });

    expect(seenCurrent.totalIncome).toBe(1000);
    expect(seenCurrent.totalOutcome).toBe(0);
    expect(seenCurrent.difference).toBe(1000);
  });
});
