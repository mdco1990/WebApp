import React, { useState, useCallback } from 'react';
import { type Expense } from '../services/api';

interface FormInputs {
  description: string;
  amount: string;
  category: string;
}

interface IncomeSourceInputs {
  name: string;
  amount: string;
}

interface BudgetSourceInputs {
  name: string;
  amount: string;
}

interface IntegratedDashboardFormsProps {
  year: number;
  month: number;
  userId: number;
  expenses: { loading: boolean; addExpense: (expense: Omit<Expense, 'id'>, userId: number) => Promise<Expense | null> };
  incomeSources: { loading: boolean; createIncomeSource: (userId: number, name: string, amountCents: number) => Promise<unknown | null> };
  budgetSources: { loading: boolean; createBudgetSource: (userId: number, name: string, amountCents: number) => Promise<unknown | null> };
  systemHealth: { publishSystemHealth: (status: string, message: string, metrics: Record<string, unknown>) => Promise<boolean> };
}

export const IntegratedDashboardForms: React.FC<IntegratedDashboardFormsProps> = ({
  year,
  month,
  userId,
  expenses,
  incomeSources,
  budgetSources,
  systemHealth,
}) => {
  // State for form inputs
  const [newExpense, setNewExpense] = useState<FormInputs>({
    description: '',
    amount: '',
    category: '',
  });
  const [newIncomeSource, setNewIncomeSource] = useState<IncomeSourceInputs>({
    name: '',
    amount: '',
  });
  const [newBudgetSource, setNewBudgetSource] = useState<BudgetSourceInputs>({
    name: '',
    amount: '',
  });

  // Event handlers
  const handleAddExpense = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount || !newExpense.category) {
      return;
    }

    const expense: Omit<Expense, 'id'> = {
      year,
      month,
      description: newExpense.description,
      amount_cents: Math.round(parseFloat(newExpense.amount) * 100),
      category: newExpense.category,
    };

    const result = await expenses.addExpense(expense, userId);
    if (result) {
      setNewExpense({ description: '', amount: '', category: '' });
      // Publish system health event
      systemHealth.publishSystemHealth('info', 'Expense added successfully', {
        expense_id: result.id,
        amount: result.amount_cents,
        category: result.category,
      });
    }
  }, [newExpense, year, month, userId, expenses, systemHealth]);

  const handleAddIncomeSource = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncomeSource.name || !newIncomeSource.amount) {
      return;
    }

    const result = await incomeSources.createIncomeSource(
      userId,
      newIncomeSource.name,
      Math.round(parseFloat(newIncomeSource.amount) * 100)
    );

    if (result) {
      setNewIncomeSource({ name: '', amount: '' });
      // Publish system health event
      systemHealth.publishSystemHealth('info', 'Income source created successfully', {
        income_source_id: (result as Record<string, unknown>).id,
        amount: (result as Record<string, unknown>).amount_cents,
      });
    }
  }, [newIncomeSource, userId, incomeSources, systemHealth]);

  const handleAddBudgetSource = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudgetSource.name || !newBudgetSource.amount) {
      return;
    }

    const result = await budgetSources.createBudgetSource(
      userId,
      newBudgetSource.name,
      Math.round(parseFloat(newBudgetSource.amount) * 100)
    );

    if (result) {
      setNewBudgetSource({ name: '', amount: '' });
      // Publish system health event
      systemHealth.publishSystemHealth('info', 'Budget source created successfully', {
        budget_source_id: (result as Record<string, unknown>).id,
        amount: (result as Record<string, unknown>).amount_cents,
      });
    }
  }, [newBudgetSource, userId, budgetSources, systemHealth]);

  return (
    <>
      {/* Add Expense Form */}
      <div className="add-expense">
        <h2>Add Expense</h2>
        <form onSubmit={handleAddExpense}>
          <input
            type="text"
            placeholder="Description"
            value={newExpense.description}
            onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Amount"
            value={newExpense.amount}
            onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
            required
          />
          <input
            type="text"
            placeholder="Category"
            value={newExpense.category}
            onChange={(e) => setNewExpense(prev => ({ ...prev, category: e.target.value }))}
            required
          />
          <button type="submit" disabled={expenses.loading}>
            {expenses.loading ? 'Adding...' : 'Add Expense'}
          </button>
        </form>
      </div>

      {/* Add Income Source Form */}
      <div className="add-income">
        <h2>Add Income Source</h2>
        <form onSubmit={handleAddIncomeSource}>
          <input
            type="text"
            placeholder="Name"
            value={newIncomeSource.name}
            onChange={(e) => setNewIncomeSource(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Amount"
            value={newIncomeSource.amount}
            onChange={(e) => setNewIncomeSource(prev => ({ ...prev, amount: e.target.value }))}
            required
          />
          <button type="submit" disabled={incomeSources.loading}>
            {incomeSources.loading ? 'Adding...' : 'Add Income Source'}
          </button>
        </form>
      </div>

      {/* Add Budget Source Form */}
      <div className="add-budget">
        <h2>Add Budget Source</h2>
        <form onSubmit={handleAddBudgetSource}>
          <input
            type="text"
            placeholder="Name"
            value={newBudgetSource.name}
            onChange={(e) => setNewBudgetSource(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Amount"
            value={newBudgetSource.amount}
            onChange={(e) => setNewBudgetSource(prev => ({ ...prev, amount: e.target.value }))}
            required
          />
          <button type="submit" disabled={budgetSources.loading}>
            {budgetSources.loading ? 'Adding...' : 'Add Budget Source'}
          </button>
        </form>
      </div>
    </>
  );
};