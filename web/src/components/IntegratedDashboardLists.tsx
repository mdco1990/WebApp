import React, { useCallback } from 'react';

interface IntegratedDashboardListsProps {
  expenses: { loading: boolean; expenses: Array<{ id: number; description: string; amount_cents: number; category: string }>; deleteExpense: (id: number) => Promise<boolean> };
  incomeSources: { loading: boolean; incomeSources: Array<{ id: number; name: string; amount_cents: number }>; deleteIncomeSource: (id: number) => Promise<boolean> };
  budgetSources: { loading: boolean; budgetSources: Array<{ id: number; name: string; amount_cents: number }>; deleteBudgetSource: (id: number) => Promise<boolean> };
  formatCurrency: (cents: number) => string;
}

export const IntegratedDashboardLists: React.FC<IntegratedDashboardListsProps> = ({
  expenses,
  incomeSources,
  budgetSources,
  formatCurrency,
}) => {
  const handleDeleteExpense = useCallback(async (expenseId: number) => {
    await expenses.deleteExpense(expenseId);
  }, [expenses]);

  const handleDeleteIncomeSource = useCallback(async (incomeId: number) => {
    await incomeSources.deleteIncomeSource(incomeId);
  }, [incomeSources]);

  const handleDeleteBudgetSource = useCallback(async (budgetId: number) => {
    await budgetSources.deleteBudgetSource(budgetId);
  }, [budgetSources]);

  return (
    <>
      {/* Expenses List */}
      <div className="expenses-list">
        <h2>Expenses</h2>
        {expenses.loading ? (
          <p>Loading expenses...</p>
        ) : expenses.expenses.length === 0 ? (
          <p>No expenses found</p>
        ) : (
          <ul>
            {expenses.expenses.map((expense) => (
              <li key={expense.id}>
                {expense.description} - {formatCurrency(expense.amount_cents)} ({expense.category})
                <button onClick={() => handleDeleteExpense(expense.id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Income Sources List */}
      <div className="income-sources-list">
        <h2>Income Sources</h2>
        {incomeSources.loading ? (
          <p>Loading income sources...</p>
        ) : incomeSources.incomeSources.length === 0 ? (
          <p>No income sources found</p>
        ) : (
          <ul>
            {incomeSources.incomeSources.map((income) => (
              <li key={income.id}>
                {income.name} - {formatCurrency(income.amount_cents)}
                <button onClick={() => handleDeleteIncomeSource(income.id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Budget Sources List */}
      <div className="budget-sources-list">
        <h2>Budget Sources</h2>
        {budgetSources.loading ? (
          <p>Loading budget sources...</p>
        ) : budgetSources.budgetSources.length === 0 ? (
          <p>No budget sources found</p>
        ) : (
          <ul>
            {budgetSources.budgetSources.map((budget) => (
              <li key={budget.id}>
                {budget.name} - {formatCurrency(budget.amount_cents)}
                <button onClick={() => handleDeleteBudgetSource(budget.id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};