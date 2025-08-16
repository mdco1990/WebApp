import React from 'react';

interface ExpenseTableProps {
  // Add props as needed
  className?: string;
}

export const ExpenseTable: React.FC<ExpenseTableProps> = () => {
  return (
    <div className="expense-table">
      <h2>Expense Table</h2>
      <p>Expense table functionality will be implemented here.</p>
    </div>
  );
};

export default ExpenseTable;