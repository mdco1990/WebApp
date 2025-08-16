import React, { useState, useMemo, useCallback } from 'react';
import { Column } from './common/GenericTable';
import { Expense, IncomeSource, OutcomeSource } from '../types/budget';
import { useMonthlyData } from '../hooks/useMonthlyData';
import { useBackgroundTask } from '../hooks/useBackgroundTask';
import { useOptimisticMonthlyData } from '../hooks/useOptimisticMonthlyData';
import { MonthlyData as _MonthlyData, FetchState as _FetchState } from '../types/state';
import { FormState as _FormState, FormAction as _FormAction, formReducer } from '../types/forms';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSummaryCards } from './DashboardSummaryCards';
import { DashboardDataTables } from './DashboardDataTables';
import { DashboardTaskStatus } from './DashboardTaskStatus';
import { DashboardActionButtons } from './DashboardActionButtons';

// Form types for the dashboard
type DashboardFilters = {
  year: number;
  month: number;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
};

// Custom hook for dashboard state management
function useDashboardState() {
  const [filters, setFilters] = useState<DashboardFilters>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  const {
    data: monthlyData,
    loading,
    error,
    refetch,
    setYearMonth,
    currentYear,
    currentMonth,
  } = useMonthlyData({
    initialYear: filters.year,
    initialMonth: filters.month,
  });

  const handleYearMonthChange = useCallback((year: number, month: number) => {
    setYearMonth(year, month);
    setFilters(prev => ({ ...prev, year, month }));
  }, [setYearMonth]);

  return {
    filters,
    setFilters,
    monthlyData,
    loading,
    error,
    refetch,
    currentYear,
    currentMonth,
    handleYearMonthChange,
  };
}

// Custom hook for task management
function useTaskManagement() {
  const {
    taskState,
    taskId,
    error: taskError,
    startTask,
    cancelTask,
    reset: resetTask,
  } = useBackgroundTask();

  const {
    optimisticData,
    applyOptimisticUpdate,
    clearOptimisticData,
    pendingUpdates,
  } = useOptimisticMonthlyData();

  return {
    taskState,
    taskId,
    taskError,
    startTask,
    cancelTask,
    reset: resetTask,
    optimisticData,
    pendingUpdates,
    applyOptimisticUpdate,
    clearOptimisticData,
  };
}

// Dashboard component with full integration
export function MonthlyDataDashboard() {
  const {
    filters,
    setFilters,
    monthlyData,
    loading,
    error,
    refetch,
    currentYear,
    currentMonth,
    handleYearMonthChange,
  } = useDashboardState();

  const {
    taskState,
    taskId,
    taskError,
    startTask,
    cancelTask,
    reset: resetTask,
    optimisticData,
    pendingUpdates,
    applyOptimisticUpdate,
    clearOptimisticData,
  } = useTaskManagement();

  // Form state for filters
  const [_filterForm, _dispatchFilterForm] = React.useReducer(
    formReducer<DashboardFilters>,
    {
      values: filters,
      errors: {},
      touched: {},
      fields: {
        year: { value: filters.year, touched: false, required: true },
        month: { value: filters.month, touched: false, required: true },
        category: { value: filters.category || '', touched: false, required: false },
        minAmount: { value: filters.minAmount || 0, touched: false, required: false },
        maxAmount: { value: filters.maxAmount || 0, touched: false, required: false },
      },
      isValid: true,
      isSubmitting: false,
      isDirty: false,
      submitCount: 0,
    }
  );

  // Handle filter changes
  const _handleFilterChange = useCallback((field: keyof DashboardFilters, value: string | number) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  }, [setFilters]);

  // Handle background task start
  const handleStartReport = useCallback(() => {
    startTask(async () => {
      // This would normally call an API to start a background report generation
      return { message: 'Expense report generated successfully' };
    });
  }, [startTask]);

  // Action handlers (placeholder implementations)
  const handleEditIncome = useCallback((income: IncomeSource) => {
    // Apply optimistic update
    applyOptimisticUpdate({
      type: 'income',
      action: 'update',
      data: income,
    });
  }, [applyOptimisticUpdate]);

  const handleDeleteIncome = useCallback((id: number) => {
    // Apply optimistic update
    applyOptimisticUpdate({
      type: 'income',
      action: 'delete',
      data: { id },
    });
  }, [applyOptimisticUpdate]);

  const handleEditBudget = useCallback((budget: OutcomeSource) => {
    // Apply optimistic update  
    applyOptimisticUpdate({
      type: 'budget',
      action: 'update',
      data: budget,
    });
  }, [applyOptimisticUpdate]);

  const handleDeleteBudget = useCallback((id: number) => {
    // Apply optimistic update
    applyOptimisticUpdate({
      type: 'budget',
      action: 'delete',
      data: { id },
    });
  }, [applyOptimisticUpdate]);

  const handleEditExpense = useCallback((expense: Expense) => {
    // Apply optimistic update
    applyOptimisticUpdate({
      type: 'expense',
      action: 'update',
      data: expense,
    });
  }, [applyOptimisticUpdate]);

  const handleDeleteExpense = useCallback((_id: number) => {
    // Apply optimistic update
    applyOptimisticUpdate({
      type: 'expense',
      action: 'delete',
      data: { id: _id },
    });
  }, [applyOptimisticUpdate]);

  // Column definitions for income sources table
  const incomeColumns: Column<IncomeSource>[] = useMemo(() => [
    { key: 'name', label: 'Income Source', sortable: true, filterable: true },
    { key: 'amount_cents', label: 'Amount', sortable: true, render: (value) => `$${(Number(value) / 100).toFixed(2)}`, align: 'right' },
    { key: 'id', label: 'Actions', render: (value, item) => (
      <div className="btn-group btn-group-sm">
        <button className="btn btn-outline-primary" onClick={() => handleEditIncome(item)}>Edit</button>
        <button className="btn btn-outline-danger" onClick={() => handleDeleteIncome(item.id!)}>Delete</button>
      </div>
    )},
  ], [handleEditIncome, handleDeleteIncome]);

  // Column definitions for budget sources table
  const budgetColumns: Column<OutcomeSource>[] = useMemo(() => [
    { key: 'name', label: 'Budget Category', sortable: true, filterable: true },
    { key: 'amount_cents', label: 'Budget Amount', sortable: true, render: (value) => `$${(Number(value) / 100).toFixed(2)}`, align: 'right' },
    { key: 'id', label: 'Actions', render: (value, item) => (
      <div className="btn-group btn-group-sm">
        <button className="btn btn-outline-primary" onClick={() => handleEditBudget(item)}>Edit</button>
        <button className="btn btn-outline-danger" onClick={() => handleDeleteBudget(item.id!)}>Delete</button>
      </div>
    )},
  ], [handleEditBudget, handleDeleteBudget]);

  // Column definitions for expenses table
  const expenseColumns: Column<Expense>[] = useMemo(() => [
    { key: 'description', label: 'Description', sortable: true, filterable: true },
    { key: 'category', label: 'Category', sortable: true, filterable: true },
    { key: 'amount_cents', label: 'Amount', sortable: true, render: (value) => `$${(Number(value) / 100).toFixed(2)}`, align: 'right' },
    { key: 'id', label: 'Actions', render: (value, item) => (
      <div className="btn-group btn-group-sm">
        <button className="btn btn-outline-primary" onClick={() => handleEditExpense(item)}>Edit</button>
        <button className="btn btn-outline-danger" onClick={() => item.id && handleDeleteExpense(item.id)}>Delete</button>
      </div>
    )},
  ], [handleEditExpense, handleDeleteExpense]);

  // Use optimistic data if available, otherwise use real data
  const displayData = optimisticData || monthlyData;

  // Render loading state
  if (loading) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error Loading Data</h4>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={refetch}>Retry</button>
        </div>
      </div>
    );
  }

  if (!displayData) {
    return (
      <div className="container mt-4">
        <div className="alert alert-info" role="alert">
          No data available for the selected month.
        </div>
      </div>
    );
  }

  // Ensure displayData has the required properties for DashboardHeader
  const headerData = {
    month_name: displayData.month_name || 'Unknown Month',
    year: displayData.year || currentYear
  };

  return (
    <div className="container-fluid mt-4">
      <DashboardHeader 
        displayData={headerData}
        currentYear={currentYear}
        currentMonth={currentMonth}
        onYearMonthChange={handleYearMonthChange}
      />
      <DashboardSummaryCards displayData={{
        total_income_cents: displayData?.total_income_cents || 0,
        total_budget_cents: displayData?.total_budget_cents || 0,
        total_expenses_cents: displayData?.total_expenses_cents || 0,
        remaining_cents: displayData?.remaining_cents || 0,
      }} />

      <DashboardTaskStatus 
        taskState={taskState}
        taskId={taskId || undefined}
        taskError={taskError || undefined}
        onCancel={cancelTask}
        onReset={resetTask}
      />
      <DashboardActionButtons 
        onStartReport={handleStartReport}
        onRefresh={refetch}
        onClearOptimistic={clearOptimisticData}
        hasOptimisticData={!!optimisticData}
      />

      <DashboardDataTables 
        displayData={displayData}
        incomeColumns={incomeColumns}
        budgetColumns={budgetColumns}
        expenseColumns={expenseColumns}
      />

      {/* Pending updates indicator */}
      {pendingUpdates.length > 0 && (
        <div className="alert alert-info">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Pending Updates:</strong> {pendingUpdates.length} updates waiting to be synchronized
            </div>
            <button className="btn btn-sm btn-outline-secondary" onClick={clearOptimisticData}>
              Clear Updates
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Export the component
export default MonthlyDataDashboard;