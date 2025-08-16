import React from 'react';

interface DashboardTaskStatusProps {
  taskState: string;
  taskId?: string;
  taskError?: string;
  onCancel: () => void;
  onReset: () => void;
}

export function DashboardTaskStatus({ taskState, taskId, taskError, onCancel, onReset }: DashboardTaskStatusProps) {
  if (taskState === 'idle') return null;

  const getAlertType = () => {
    if (taskState === 'processing') return 'info';
    if (taskState === 'completed') return 'success';
    return 'danger';
  };

  return (
    <div className="row mb-4">
      <div className="col">
        <div className={`alert alert-${getAlertType()}`}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Background Task:</strong> {taskState}
              {taskId && <span className="ms-2">(ID: {taskId})</span>}
              {taskError && <span className="ms-2">- {taskError}</span>}
            </div>
            <div>
              {taskState === 'processing' && (
                <button className="btn btn-sm btn-outline-danger" onClick={onCancel}>
                  Cancel
                </button>
              )}
              {taskState !== 'processing' && (
                <button className="btn btn-sm btn-outline-secondary" onClick={onReset}>
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}