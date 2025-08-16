import React from 'react';

interface ExpenseFormProps {
  // Add props as needed
  className?: string;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = () => {
  return (
    <div className="expense-form">
      <h2>Expense Form</h2>
      <p>Expense form functionality will be implemented here.</p>
    </div>
  );
};

export default ExpenseForm;