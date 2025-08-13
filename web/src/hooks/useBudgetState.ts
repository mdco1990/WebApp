import { useState, useMemo } from 'react';
import type { IncomeSource, OutcomeSource } from '../types/budget';

interface PredictedBudget {
  incomeSources: IncomeSource[];
  outcomeSources: OutcomeSource[];
  totalIncome: number;
  totalOutcome: number;
  difference: number;
}

export interface SavingsCategory {
  id: string;
  name: string;
  amount: number;
  color: string;
}

interface SavingsTracker {
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  monthsToTarget: number;
  categories: SavingsCategory[];
}

export const useBudgetState = () => {
  const [budgetSources, setBudgetSources] = useState<{
    incomeSources: IncomeSource[];
    outcomeSources: OutcomeSource[];
  }>({
    incomeSources: [],
    outcomeSources: [],
  });

  const [savingsTracker, setSavingsTracker] = useState<SavingsTracker>({
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

  // Compute totals with useMemo to avoid triggering state updates on every change
  const predictedBudget = useMemo<PredictedBudget>(() => {
    const totalIncome = budgetSources.incomeSources.reduce(
      (sum, s) => sum + (s.amount_cents || 0),
      0
    );
    const totalOutcome = budgetSources.outcomeSources.reduce(
      (sum, s) => sum + (s.amount_cents || 0),
      0
    );
    return {
      ...budgetSources,
      totalIncome,
      totalOutcome,
      difference: totalIncome - totalOutcome,
    };
  }, [budgetSources]);

  const setPredictedBudget = (
    updater: React.SetStateAction<PredictedBudget>
  ) => {
    setBudgetSources((prev) => {
      const currentBudget = {
        ...prev,
        totalIncome: prev.incomeSources.reduce((sum, s) => sum + (s.amount_cents || 0), 0),
        totalOutcome: prev.outcomeSources.reduce((sum, s) => sum + (s.amount_cents || 0), 0),
        difference: 0, // Will be recalculated
      };
      currentBudget.difference = currentBudget.totalIncome - currentBudget.totalOutcome;
      
      const newBudget = typeof updater === 'function' ? updater(currentBudget) : updater;
      return {
        incomeSources: newBudget.incomeSources,
        outcomeSources: newBudget.outcomeSources,
      };
    });
  };

  return {
    predictedBudget,
    setPredictedBudget,
    savingsTracker,
    setSavingsTracker,
  };
};
