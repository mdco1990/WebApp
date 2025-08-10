import { useState, useEffect } from 'react';
import type { IncomeSource, OutcomeSource } from '../types/budget';

interface PredictedBudget {
  incomeSources: IncomeSource[];
  outcomeSources: OutcomeSource[];
  totalIncome: number;
  totalOutcome: number;
  difference: number;
}

interface SavingsTracker {
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  monthsToTarget: number;
}

export const useBudgetState = () => {
  const [predictedBudget, setPredictedBudget] = useState<PredictedBudget>({
    incomeSources: [],
    outcomeSources: [],
    totalIncome: 0,
    totalOutcome: 0,
    difference: 0,
  });

  const [savingsTracker, setSavingsTracker] = useState<SavingsTracker>({
    targetAmount: 10000,
    currentAmount: 2500,
    monthlyContribution: 500,
    monthsToTarget: 15,
  });

  // Recompute totals immediately when sources change to reflect UI without waiting for reload
  useEffect(() => {
    const totalIncome = predictedBudget.incomeSources.reduce(
      (sum, s) => sum + (s.amount_cents || 0),
      0
    );
    const totalOutcome = predictedBudget.outcomeSources.reduce(
      (sum, s) => sum + (s.amount_cents || 0),
      0
    );
    setPredictedBudget((prev) => ({
      ...prev,
      totalIncome,
      totalOutcome,
      difference: totalIncome - totalOutcome,
    }));
  }, [predictedBudget.incomeSources, predictedBudget.outcomeSources]);

  return {
    predictedBudget,
    setPredictedBudget,
    savingsTracker,
    setSavingsTracker,
  };
};
