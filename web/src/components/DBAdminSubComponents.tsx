import React from 'react';

// Sub-components extracted from DBAdmin.tsx to reduce file size
export const StatCard: React.FC<{
  title: string;
  value: number;
  icon: string;
  color: string;
  description?: string;
}> = ({ title, value, icon, color, description }) => (
  <div className="col-md-6 col-lg-3 mb-4">
    <div className={`card border-0 shadow-sm h-100 bg-gradient bg-${color} text-white`}>
      <div className="card-body">
        <div className="d-flex align-items-center">
          <div className="flex-shrink-0">
            <div className={`bg-white bg-opacity-25 rounded-circle p-3`}>
              <span className="fs-4">{icon}</span>
            </div>
          </div>
          <div className="flex-grow-1 ms-3">
            <h6 className="card-title mb-1 opacity-75">{title}</h6>
            <h3 className="mb-0 fw-bold">{value.toLocaleString()}</h3>
            {description && <small className="opacity-75">{description}</small>}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const QuickActionCard: React.FC<{
  title: string;
  description: string;
  icon: string;
  color: string;
  action: () => void;
  disabled?: boolean;
}> = ({ title, description, icon, color, action, disabled = false }) => (
  <div
    className={`card border-0 shadow-sm h-100 ${disabled ? 'opacity-50' : ''} card-hover`}
    onClick={action}
    style={{ cursor: disabled ? 'default' : 'pointer' }}
  >
    <div className="card-body text-center p-4">
      <div
        className={`bg-${color} bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3`}
        style={{ width: '60px', height: '60px' }}
      >
        <span className="fs-3">{icon}</span>
      </div>
      <h6 className="card-title mb-2">{title}</h6>
      <p className="card-text text-muted small">{description}</p>
    </div>
  </div>
);
