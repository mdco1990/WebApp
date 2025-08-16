import React from 'react';

interface DashboardActionButtonsProps {
  onStartReport: () => void;
  onRefresh: () => void;
  onClearOptimistic: () => void;
  hasOptimisticData: boolean;
}

export function DashboardActionButtons({ 
  onStartReport, 
  onRefresh, 
  onClearOptimistic, 
  hasOptimisticData 
}: DashboardActionButtonsProps) {
  return (
    <div className="row mb-4">
      <div className="col">
        <div className="btn-group">
          <button className="btn btn-primary" onClick={onStartReport}>
            Generate Expense Report
          </button>
          <button className="btn btn-outline-primary" onClick={onRefresh}>
            Refresh Data
          </button>
          {hasOptimisticData && (
            <button className="btn btn-outline-warning" onClick={onClearOptimistic}>
              Clear Optimistic Updates
            </button>
          )}
        </div>
      </div>
    </div>
  );
}