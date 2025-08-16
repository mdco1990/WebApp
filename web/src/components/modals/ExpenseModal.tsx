import React from 'react';

interface ExpenseModalProps {
  // Add props as needed
  className?: string;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = () => {
  return (
    <div className="expense-modal">
      <h3>Expense Modal</h3>
      <p>Expense modal functionality will be implemented here.</p>
    </div>
  );
};

export default ExpenseModal;