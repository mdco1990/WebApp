import React from 'react';

interface DashboardHeaderProps {
  displayData: { month_name: string; year: number };
  currentYear: number;
  currentMonth: number;
  onYearMonthChange: (year: number, month: number) => void;
}

export function DashboardHeader({ displayData, currentYear, currentMonth, onYearMonthChange }: DashboardHeaderProps) {
  return (
    <div className="row mb-4">
      <div className="col">
        <h1>Monthly Financial Dashboard</h1>
        <p className="text-muted">
          {displayData.month_name} {displayData.year}
        </p>
      </div>
      <div className="col-auto">
        <div className="btn-group">
          <button
            className="btn btn-outline-secondary"
            onClick={() => onYearMonthChange(currentYear, currentMonth - 1)}
            disabled={currentMonth === 1}
          >
            Previous Month
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={() => onYearMonthChange(currentYear, currentMonth + 1)}
            disabled={currentMonth === 12}
          >
            Next Month
          </button>
        </div>
      </div>
    </div>
  );
}