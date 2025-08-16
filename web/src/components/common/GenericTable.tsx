import React, { useState, useMemo, useCallback } from 'react';
import { FetchState } from '../../types/state';
import { TableHeader } from './TableHeader';
import { TableBody } from './TableBody';
import { TablePagination } from './TablePagination';

// Type definitions for the generic table
export type Column<T> = {
  key: keyof T;
  label: string;
  render?: (value: T[keyof T], item: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
};

export type SortConfig<T> = {
  key: keyof T;
  direction: 'asc' | 'desc';
};

export type TableProps<T> = {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  sortable?: boolean;
  filterable?: boolean;
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  className?: string;
  rowClassName?: (item: T, index: number) => string;
  selectable?: boolean;
  selectedItems?: T[];
  onSelectionChange?: (items: T[]) => void;
  getRowKey?: (item: T) => string | number;
  pagination?: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
  };
};

// Loading spinner component
const LoadingSpinner: React.FC = () => (
  <div className="d-flex justify-content-center p-4">
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

// Error message component
const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="alert alert-danger" role="alert">
    <i className="bi bi-exclamation-triangle me-2"></i>
    {message}
  </div>
);

// Empty state component
const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center p-4 text-muted">
    <i className="bi bi-inbox fs-1 d-block mb-3"></i>
    {message}
  </div>
);

// Generic table component with full type safety
// Custom hook for table sorting and filtering
function useTableDataProcessing<T>(
  data: T[],
  sortable: boolean,
  filterable: boolean,
  getRowKey?: (item: T) => string | number
) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(null);
  const [filters, setFilters] = useState<Partial<Record<keyof T, string>>>({});

  const _getKey = useCallback((item: T, index: number): string | number => {
    if (getRowKey) return getRowKey(item);
    return index;
  }, [getRowKey]);

  const handleSort = useCallback((key: keyof T) => {
    if (!sortable) return;
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  }, [sortable]);

  const handleFilter = useCallback((key: keyof T, value: string) => {
    if (!filterable) return;
    setFilters(current => ({ ...current, [key]: value }));
  }, [filterable]);

  const processedData = useMemo(() => {
    let result = [...data];

    if (filterable && Object.keys(filters).length > 0) {
      result = result.filter(item =>
        Object.entries(filters).every(([key, filterValue]) => {
          if (!filterValue) return true;
          const itemValue = String(item[key as keyof T]).toLowerCase();
          return String(itemValue).includes(String(filterValue).toLowerCase());
        })
      );
    }

    if (sortable && sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, filters, sortConfig, filterable, sortable]);

  return { sortConfig, filters, processedData, handleSort, handleFilter };
}

// Custom hook for row selection
function useRowSelection<T>(
  selectable: boolean,
  selectedItems: T[],
  onSelectionChange?: (items: T[]) => void,
  getKey?: (item: T) => string | number
) {
  const getKeyFn = useCallback((item: T, index: number): string | number => {
    if (getKey) return getKey(item);
    return index;
  }, [getKey]);

  const handleRowSelect = useCallback((item: T) => {
    if (!selectable || !onSelectionChange) return;

    const isSelected = selectedItems.some(selected => getKeyFn(selected, 0) === getKeyFn(item, 0));
    
    if (isSelected) {
      onSelectionChange(selectedItems.filter(selected => getKeyFn(selected, 0) !== getKeyFn(item, 0)));
    } else {
      onSelectionChange([...selectedItems, item]);
    }
  }, [selectable, onSelectionChange, selectedItems, getKeyFn]);

  return { handleRowSelect, getKey: getKeyFn };
}

export function GenericTable<T>({
  data,
  columns,
  onRowClick,
  sortable = false,
  filterable = false,
  loading = false,
  error,
  emptyMessage = 'No data available',
  className = '',
  rowClassName,
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  getRowKey,
  pagination,
}: TableProps<T>) {
  const { sortConfig, filters: _filters, processedData, handleSort, handleFilter } = useTableDataProcessing(
    data, sortable, filterable, getRowKey
  );
  const { handleRowSelect, getKey: _getKey } = useRowSelection(
    selectable, selectedItems, onSelectionChange, getRowKey
  );

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (!selectable || !onSelectionChange) return;

    if (selectedItems.length === processedData.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange([...processedData]);
    }
  }, [selectable, onSelectionChange, selectedItems, processedData]);

  // Check if all items are selected
  const allSelected = processedData.length > 0 && selectedItems.length === processedData.length;
  const someSelected = selectedItems.length > 0 && selectedItems.length < processedData.length;

  // Render loading state
  if (loading) {
    return <LoadingSpinner />;
  }

  // Render error state
  if (error) {
    return <ErrorMessage message={error} />;
  }

  // Render empty state
  if (processedData.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className={`table-responsive ${className}`}>
      <table className="table table-hover">
        <TableHeader
          columns={columns}
          selectable={selectable}
          sortable={sortable}
          filterable={filterable}
          sortConfig={sortConfig}
          allSelected={allSelected}
          someSelected={someSelected}
          onSort={handleSort}
          onSelectAll={handleSelectAll}
          onFilter={handleFilter}
        />
        
        <TableBody
          data={processedData}
          columns={columns}
          selectable={selectable}
          selectedItems={selectedItems}
          onRowClick={onRowClick}
          rowClassName={rowClassName}
          onRowSelect={handleRowSelect}
          getKey={_getKey}
        />
      </table>

      {pagination && <TablePagination pagination={pagination} />}
    </div>
  );
}

// Higher-order component for tables with loading states
export function withLoadingState<T>(
  Component: React.ComponentType<TableProps<T>>
): React.ComponentType<TableProps<T> & { fetchState: FetchState<T[]> }> {
  return function TableWithLoading({ fetchState, ...props }) {
    const loading = fetchState.status === 'loading';
    const error = fetchState.status === 'error' ? fetchState.error : undefined;
    const data = fetchState.status === 'success' ? fetchState.data : [];

    return (
      <Component
        {...props}
        data={data}
        loading={loading}
        error={error}
      />
    );
  };
}

// Export the enhanced table with loading state
export const GenericTableWithLoading = withLoadingState(GenericTable);