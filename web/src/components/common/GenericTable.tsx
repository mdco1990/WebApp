import React, { useState, useMemo, useCallback } from 'react';
import { FetchState } from '../../types/state';

// Generic table column definition
export type Column<T> = {
  key: keyof T;
  label: string;
  render?: (value: T[keyof T], item: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
};

// Generic table props with full type safety
export type TableProps<T> = {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  sortable?: boolean;
  filterable?: boolean;
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    onPageChange: (page: number) => void;
  };
  selection?: {
    selectedItems: T[];
    onSelectionChange: (items: T[]) => void;
    selectable?: boolean;
  };
  className?: string;
  rowClassName?: (item: T, index: number) => string;
};

// Sort direction type
type SortDirection = 'asc' | 'desc' | null;

// Generic table component with full type safety
export function GenericTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  sortable = false,
  filterable = false,
  loading = false,
  error,
  emptyMessage = 'No data available',
  pagination,
  selection,
  className = '',
  rowClassName,
}: TableProps<T>) {
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Partial<Record<keyof T, string>>>({});

  // Handle sorting
  const handleSort = useCallback((column: keyof T) => {
    if (!sortable || !columns.find(col => col.key === column)?.sortable) {
      return;
    }

    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortable, sortColumn, sortDirection, columns]);

  // Handle filtering
  const handleFilter = useCallback((column: keyof T, value: string) => {
    setFilters(prev => ({
      ...prev,
      [column]: value || undefined,
    }));
  }, []);

  // Apply sorting and filtering to data
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply filters
    if (filterable && Object.keys(filters).length > 0) {
      result = result.filter(item =>
        Object.entries(filters).every(([key, filterValue]) => {
          if (!filterValue) return true;
          const itemValue = String(item[key as keyof T]).toLowerCase();
          return itemValue.includes(filterValue.toLowerCase());
        })
      );
    }

    // Apply sorting
    if (sortable && sortColumn && sortDirection) {
      result.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, filters, sortable, sortColumn, sortDirection, filterable]);

  // Handle row selection
  const handleRowSelect = useCallback((item: T) => {
    if (!selection?.selectable) return;

    const isSelected = selection.selectedItems.some(selected => 
      JSON.stringify(selected) === JSON.stringify(item)
    );

    if (isSelected) {
      selection.onSelectionChange(
        selection.selectedItems.filter(selected => 
          JSON.stringify(selected) !== JSON.stringify(item)
        )
      );
    } else {
      selection.onSelectionChange([...selection.selectedItems, item]);
    }
  }, [selection]);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (!selection?.selectable) return;

    if (selection.selectedItems.length === processedData.length) {
      selection.onSelectionChange([]);
    } else {
      selection.onSelectionChange([...processedData]);
    }
  }, [selection, processedData]);

  // Render sort indicator
  const renderSortIndicator = (column: keyof T) => {
    if (!sortable || !columns.find(col => col.key === column)?.sortable) {
      return null;
    }

    if (sortColumn !== column) {
      return <span className="text-muted">↕</span>;
    }

    return sortDirection === 'asc' ? <span>↑</span> : <span>↓</span>;
  };

  // Render filter input
  const renderFilterInput = (column: keyof T) => {
    if (!filterable || !columns.find(col => col.key === column)?.filterable) {
      return null;
    }

    return (
      <input
        type="text"
        className="form-control form-control-sm"
        placeholder="Filter..."
        value={filters[column] || ''}
        onChange={(e) => handleFilter(column, e.target.value)}
        onClick={(e) => e.stopPropagation()}
      />
    );
  };

  if (loading) {
    return (
      <div className={`table-responsive ${className}`}>
        <div className="text-center p-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`table-responsive ${className}`}>
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (processedData.length === 0) {
    return (
      <div className={`table-responsive ${className}`}>
        <div className="text-center p-4">
          <p className="text-muted">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`table-responsive ${className}`}>
      <table className="table table-striped table-hover">
        <thead className="table-light">
          <tr>
            {selection?.selectable && (
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={selection.selectedItems.length === processedData.length}
                  onChange={handleSelectAll}
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={String(column.key)}
                style={{ 
                  width: column.width,
                  cursor: sortable && column.sortable ? 'pointer' : 'default'
                }}
                onClick={() => handleSort(column.key)}
                className={sortable && column.sortable ? 'sortable' : ''}
              >
                <div className="d-flex align-items-center">
                  <span>{column.label}</span>
                  {renderSortIndicator(column.key)}
                </div>
                {renderFilterInput(column.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {processedData.map((item, index) => {
            const isSelected = selection?.selectable && selection.selectedItems.some(selected => 
              JSON.stringify(selected) === JSON.stringify(item)
            );

            return (
              <tr
                key={index}
                onClick={() => onRowClick?.(item)}
                className={`
                  ${onRowClick ? 'cursor-pointer' : ''}
                  ${isSelected ? 'table-primary' : ''}
                  ${rowClassName ? rowClassName(item, index) : ''}
                `}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {selection?.selectable && (
                  <td>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={isSelected}
                      onChange={() => handleRowSelect(item)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    style={{ textAlign: column.align || 'left' }}
                  >
                    {column.render
                      ? column.render(item[column.key], item)
                      : String(item[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <nav aria-label="Table pagination">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${pagination.currentPage === 1 ? 'disabled' : ''}`}>
              <button
                className="page-link"
                onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
              >
                Previous
              </button>
            </li>
            
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
              <li
                key={page}
                className={`page-item ${page === pagination.currentPage ? 'active' : ''}`}
              >
                <button
                  className="page-link"
                  onClick={() => pagination.onPageChange(page)}
                >
                  {page}
                </button>
              </li>
            ))}
            
            <li className={`page-item ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}`}>
              <button
                className="page-link"
                onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}

// Export default component
export default GenericTable;