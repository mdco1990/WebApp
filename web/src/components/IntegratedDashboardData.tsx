import React from 'react';

interface IntegratedDashboardDataProps {
  manualBudget: { loading: boolean; error: string | null; manualBudget: { bank_amount_cents: number; items?: Array<{ name: string; amount_cents: number }> } | null };
  monthlyData: { loading: boolean; error: string | null; monthlyData: { year_month: { year: number; month: number }; expenses: unknown[]; income_sources: unknown[]; budget_sources: unknown[]; summary?: { total_income: number; total_budget: number; total_expenses: number; remaining: number } } | null };
  dataStore: { monthlyData: unknown; expenses: unknown[]; incomeSources: unknown[]; budgetSources: unknown[]; summary?: { total_income: number; total_budget: number; total_expenses: number; remaining: number } };
  formatCurrency: (cents: number) => string;
}

export const IntegratedDashboardData: React.FC<IntegratedDashboardDataProps> = ({
  manualBudget,
  monthlyData,
  dataStore,
  formatCurrency,
}) => {
  return (
    <>
      {/* Manual Budget */}
      <div className="manual-budget">
        <h2>Manual Budget</h2>
        {manualBudget.loading ? (
          <p>Loading manual budget...</p>
        ) : manualBudget.error ? (
          <p className="error">Error: {manualBudget.error}</p>
        ) : manualBudget.manualBudget ? (
          <div className="manual-budget-info">
            <p>Bank Amount: {formatCurrency(manualBudget.manualBudget.bank_amount_cents)}</p>
            <h3>Items:</h3>
            <ul>
              {manualBudget.manualBudget.items?.map((item: { name: string; amount_cents: number }, index: number) => (
                <li key={index}>
                  {item.name}: {formatCurrency(item.amount_cents)}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p>No manual budget data available</p>
        )}
      </div>

      {/* Monthly Data (Concurrent) */}
      <div className="monthly-data">
        <h2>Monthly Data (Concurrent)</h2>
        {monthlyData.loading ? (
          <p>Loading monthly data...</p>
        ) : monthlyData.error ? (
          <p className="error">Error: {monthlyData.error}</p>
        ) : monthlyData.monthlyData ? (
          <div className="monthly-data-info">
            <p>Year: {monthlyData.monthlyData.year_month.year}</p>
            <p>Month: {monthlyData.monthlyData.year_month.month}</p>
            <p>Total Expenses: {monthlyData.monthlyData.expenses.length}</p>
            <p>Total Income Sources: {monthlyData.monthlyData.income_sources.length}</p>
            <p>Total Budget Sources: {monthlyData.monthlyData.budget_sources.length}</p>
            {monthlyData.monthlyData.summary && (
              <div className="summary-details">
                <h3>Summary Details:</h3>
                <p>Total Income: {formatCurrency(monthlyData.monthlyData.summary.total_income)}</p>
                <p>Total Budget: {formatCurrency(monthlyData.monthlyData.summary.total_budget)}</p>
                <p>Total Expenses: {formatCurrency(monthlyData.monthlyData.summary.total_expenses)}</p>
                <p>Remaining: {formatCurrency(monthlyData.monthlyData.summary.remaining)}</p>
              </div>
            )}
          </div>
        ) : (
          <p>No monthly data available</p>
        )}
      </div>

      {/* Reactive Data Store */}
      <div className="reactive-data-store">
        <h2>Reactive Data Store</h2>
        <div className="reactive-data-info">
          <p>Monthly Data Available: {dataStore.monthlyData ? 'Yes' : 'No'}</p>
          <p>Expenses Count: {dataStore.expenses.length}</p>
          <p>Income Sources Count: {dataStore.incomeSources.length}</p>
          <p>Budget Sources Count: {dataStore.budgetSources.length}</p>
          {dataStore.summary && (
            <div className="reactive-summary">
              <h3>Reactive Summary:</h3>
              <p>Total Income: {formatCurrency(dataStore.summary.total_income)}</p>
              <p>Total Budget: {formatCurrency(dataStore.summary.total_budget)}</p>
              <p>Total Expenses: {formatCurrency(dataStore.summary.total_expenses)}</p>
              <p>Remaining: {formatCurrency(dataStore.summary.remaining)}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};