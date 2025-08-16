import React from 'react';

interface DashboardSummaryCardsProps {
  displayData: {
    total_income_cents: number;
    total_budget_cents: number;
    total_expenses_cents: number;
    remaining_cents: number;
  };
}

export function DashboardSummaryCards({ displayData }: DashboardSummaryCardsProps) {
  return (
    <div className="row mb-4">
      <div className="col-md-3">
        <div className="card text-center">
          <div className="card-body">
            <h5 className="card-title">Total Income</h5>
            <h3 className="text-success">
              ${(displayData.total_income_cents / 100).toFixed(2)}
            </h3>
          </div>
        </div>
      </div>
      <div className="col-md-3">
        <div className="card text-center">
          <div className="card-body">
            <h5 className="card-title">Total Budget</h5>
            <h3 className="text-info">
              ${(displayData.total_budget_cents / 100).toFixed(2)}
            </h3>
          </div>
        </div>
      </div>
      <div className="col-md-3">
        <div className="card text-center">
          <div className="card-body">
            <h5 className="card-title">Total Expenses</h5>
            <h3 className="text-danger">
              ${(displayData.total_expenses_cents / 100).toFixed(2)}
            </h3>
          </div>
        </div>
      </div>
      <div className="col-md-3">
        <div className="card text-center">
          <div className="card-body">
            <h5 className="card-title">Remaining</h5>
            <h3 className={displayData.remaining_cents >= 0 ? 'text-success' : 'text-danger'}>
              ${(displayData.remaining_cents / 100).toFixed(2)}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}