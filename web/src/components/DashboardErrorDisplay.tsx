import React from 'react';

interface DashboardErrorDisplayProps {
  errors: (string | null)[];
}

export function DashboardErrorDisplay({ errors }: DashboardErrorDisplayProps) {
  const filteredErrors = errors.filter(Boolean);
  
  if (filteredErrors.length === 0) return null;

  return (
    <div className="row mb-4">
      <div className="col">
        <div className="alert alert-danger">
          <h5>Errors:</h5>
          <ul className="mb-0">
            {filteredErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}