import React from 'react';

interface AdminPanelProps {
  // Add props as needed
  className?: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = () => {
  return (
    <div className="admin-panel">
      <h2>Admin Panel</h2>
      <p>Admin functionality will be implemented here.</p>
    </div>
  );
};

export default AdminPanel;