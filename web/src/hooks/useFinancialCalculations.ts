import { useMemo } from 'react';
import { Expense, IncomeSource, OutcomeSource as BudgetSource } from '../types/budget';

export interface FinancialCalculations {
  totalExpenses: number;
  totalIncome: number;
  totalBudget: number;
  remaining: number;
  categoryBreakdown: Record<string, number>;
  savingsRate: number;
  budgetUtilization: number;
}

export function useFinancialCalculations(
  expenses: Expense[],
  incomeSources: IncomeSource[],
  budgetSources: BudgetSource[]
): FinancialCalculations {
  return useMemo(() => {
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount_cents, 0);
    const totalIncome = incomeSources.reduce((sum, income) => sum + income.amount_cents, 0);
    const totalBudget = budgetSources.reduce((sum, budget) => sum + budget.amount_cents, 0);
    const remaining = totalIncome - totalExpenses;

    // Category breakdown
    const categoryBreakdown = expenses.reduce((acc, expense) => {
      const category = expense.category || 'other';
      acc[category] = (acc[category] || 0) + expense.amount_cents;
      return acc;
    }, {} as Record<string, number>);

    // Financial metrics
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
    const budgetUtilization = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;

    return {
      totalExpenses,
      totalIncome,
      totalBudget,
      remaining,
      categoryBreakdown,
      savingsRate,
      budgetUtilization,
    };
  }, [expenses, incomeSources, budgetSources]);
}