import React from 'react';

interface ExpenseChartProps {
  // Add props as needed
  className?: string;
}

export const ExpenseChart: React.FC<ExpenseChartProps> = () => {
  return (
    <div className="expense-chart">
      <h3>Expense Chart</h3>
      <p>Expense chart functionality will be implemented here.</p>
    </div>
  );
};

export default ExpenseChart;