import React from 'react';
import { GenericTable, Column } from './common/GenericTable';
import { IncomeSource, OutcomeSource, Expense } from '../types/budget';

interface DashboardDataTablesProps {
  displayData: {
    income_sources: IncomeSource[];
    budget_sources: OutcomeSource[];
    expenses: Expense[];
  };
  incomeColumns: Column<IncomeSource>[];
  budgetColumns: Column<OutcomeSource>[];
  expenseColumns: Column<Expense>[];
}

export function DashboardDataTables({ 
  displayData, 
  incomeColumns, 
  budgetColumns, 
  expenseColumns 
}: DashboardDataTablesProps) {
  return (
    <>
      {/* Data tables */}
      <div className="row">
        {/* Income Sources */}
        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Income Sources</h5>
            </div>
            <div className="card-body">
              <GenericTable
                data={displayData.income_sources}
                columns={incomeColumns}
                sortable={true}
                filterable={true}
                emptyMessage="No income sources found"
                getRowKey={(item) => item.id || 'temp-' + Math.random()}
              />
            </div>
          </div>
        </div>

        {/* Budget Sources */}
        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Budget Categories</h5>
            </div>
            <div className="card-body">
              <GenericTable
                data={displayData.budget_sources}
                columns={budgetColumns}
                sortable={true}
                filterable={true}
                emptyMessage="No budget categories found"
                getRowKey={(item) => item.id || 'temp-' + Math.random()}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Expenses */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Expenses</h5>
            </div>
            <div className="card-body">
              <GenericTable
                data={displayData.expenses}
                columns={expenseColumns}
                sortable={true}
                filterable={true}
                emptyMessage="No expenses found"
                getRowKey={(item) => item.id || 'temp-' + Math.random()}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}