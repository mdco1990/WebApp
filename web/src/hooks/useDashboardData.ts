import { useMemo } from 'react';
import { MonthlyData, Expense, IncomeSource, OutcomeSource as BudgetSource, FinancialSummary } from '../types/budget';

export interface DashboardData {
  monthlyData: MonthlyData | null;
  expenses: Expense[];
  incomeSources: IncomeSource[];
  budgetSources: BudgetSource[];
  summary: FinancialSummary | null;
}

export function useDashboardData(
  monthlyData: MonthlyData | null,
  expenses: Expense[],
  incomeSources: IncomeSource[],
  budgetSources: BudgetSource[]
): DashboardData {
  const summary = useMemo(() => {
    if (!monthlyData) return null;

    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount_cents, 0);
    const totalIncome = incomeSources.reduce((sum, income) => sum + income.amount_cents, 0);
    const totalBudget = budgetSources.reduce((sum, budget) => sum + budget.amount_cents, 0);

    // Create category breakdown
    const categories = expenses.reduce((acc, expense) => {
      const category = expense.category || 'other';
      acc[category] = (acc[category] || 0) + expense.amount_cents;
      return acc;
    }, {} as Record<string, number>);

    return {
      total_income: totalIncome,
      total_budget: totalBudget,
      total_expenses: totalExpenses,
      remaining: totalIncome - totalExpenses,
      categories,
    };
  }, [monthlyData, expenses, incomeSources, budgetSources]);

  return {
    monthlyData,
    expenses,
    incomeSources,
    budgetSources,
    summary,
  };
}