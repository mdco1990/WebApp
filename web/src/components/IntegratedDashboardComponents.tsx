import React from 'react';

// Health Status Component
export const HealthStatus: React.FC<{
  healthCheck: { healthStatus: boolean; loading: boolean; checkHealth: () => void };
  eventIntegration: { connected: boolean; lastEvent: { type: string; timestamp: Date } | null };
}> = ({ healthCheck, eventIntegration }) => (
  <div className="health-status">
    <h2>System Health</h2>
    <div className="health-grid">
      <div className="health-item">
        <span>API Status:</span>
        <span className={healthCheck.healthStatus ? 'status-ok' : 'status-error'}>
          {healthCheck.healthStatus ? 'Healthy' : 'Unhealthy'}
        </span>
      </div>
      <div className="health-item">
        <span>Event Connection:</span>
        <span className={eventIntegration.connected ? 'status-ok' : 'status-error'}>
          {eventIntegration.connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      <div className="health-item">
        <span>Last Event:</span>
        <span>
          {eventIntegration.lastEvent
            ? `${eventIntegration.lastEvent.type} at ${eventIntegration.lastEvent.timestamp.toLocaleTimeString()}`
            : 'No events'}
        </span>
      </div>
    </div>
    <button onClick={healthCheck.checkHealth} disabled={healthCheck.loading}>
      {healthCheck.loading ? 'Checking...' : 'Check Health'}
    </button>
  </div>
);

// Event Metrics Component
export const EventMetrics: React.FC<{
  eventMetrics: { metrics: Record<string, unknown> | null; loading: boolean; loadEventMetrics: () => void };
}> = ({ eventMetrics }) => (
  <div className="event-metrics">
    <h2>Event Metrics</h2>
    {eventMetrics.metrics && (
      <div className="metrics-grid">
        <div className="metric">
          <strong>Published Events:</strong>
          <span>{(eventMetrics.metrics as Record<string, unknown>).published_events as string}</span>
        </div>
        <div className="metric">
          <strong>Handled Events:</strong>
          <span>{(eventMetrics.metrics as Record<string, unknown>).handled_events as string}</span>
        </div>
        <div className="metric">
          <strong>Failed Events:</strong>
          <span>{(eventMetrics.metrics as Record<string, unknown>).failed_events as string}</span>
        </div>
        <div className="metric">
          <strong>Active Subscribers:</strong>
          <span>{(eventMetrics.metrics as Record<string, unknown>).active_subscribers as string}</span>
        </div>
      </div>
    )}
    <button onClick={eventMetrics.loadEventMetrics} disabled={eventMetrics.loading}>
      {eventMetrics.loading ? 'Loading...' : 'Refresh Metrics'}
    </button>
  </div>
);

// Financial Summary Component
export const FinancialSummary: React.FC<{
  totalExpenses: number;
  totalIncome: number;
  totalBudget: number;
  remaining: number;
  formatCurrency: (cents: number) => string;
}> = ({ totalExpenses, totalIncome, totalBudget, remaining, formatCurrency }) => (
  <div className="financial-summary">
    <h2>Financial Summary</h2>
    <div className="summary-grid">
      <div className="summary-item">
        <span>Total Income:</span>
        <span className="income">{formatCurrency(totalIncome)}</span>
      </div>
      <div className="summary-item">
        <span>Total Budget:</span>
        <span className="budget">{formatCurrency(totalBudget)}</span>
      </div>
      <div className="summary-item">
        <span>Total Expenses:</span>
        <span className="expenses">{formatCurrency(totalExpenses)}</span>
      </div>
      <div className="summary-item">
        <span>Remaining:</span>
        <span className={remaining >= 0 ? 'positive' : 'negative'}>
          {formatCurrency(Math.abs(remaining))}
        </span>
      </div>
    </div>
  </div>
);

// Manual Budget Component
export const ManualBudget: React.FC<{
  manualBudget: { loading: boolean; error: string | null; manualBudget: { bank_amount_cents: number; items?: Array<{ name: string; amount_cents: number }> } | null };
  formatCurrency: (cents: number) => string;
}> = ({ manualBudget, formatCurrency }) => (
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
);

// Monthly Data Component
export const MonthlyData: React.FC<{
  monthlyData: { loading: boolean; error: string | null; monthlyData: { year_month: { year: number; month: number }; expenses: unknown[]; income_sources: unknown[]; budget_sources: unknown[]; summary?: { total_income: number; total_budget: number; total_expenses: number; remaining: number } } | null };
  formatCurrency: (cents: number) => string;
}> = ({ monthlyData, formatCurrency }) => (
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
);

// Reactive Data Store Component
export const ReactiveDataStore: React.FC<{
  dataStore: { monthlyData: unknown; expenses: unknown[]; incomeSources: unknown[]; budgetSources: unknown[]; summary?: { total_income: number; total_budget: number; total_expenses: number; remaining: number } };
  formatCurrency: (cents: number) => string;
}> = ({ dataStore, formatCurrency }) => (
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
);

export const IntegratedDashboardComponents = {
  HealthStatus,
  EventMetrics,
  FinancialSummary,
};

