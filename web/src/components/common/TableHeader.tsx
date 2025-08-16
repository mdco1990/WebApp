import React from 'react';

interface TableHeaderProps<T> {
  columns: Array<{
    key: keyof T;
    label: string;
    sortable?: boolean;
    filterable?: boolean;
    width?: string;
    align?: 'left' | 'center' | 'right';
  }>;
  selectable: boolean;
  sortable: boolean;
  filterable: boolean;
  sortConfig: { key: keyof T; direction: 'asc' | 'desc' } | null;
  allSelected: boolean;
  someSelected: boolean;
  onSort: (key: keyof T) => void;
  onSelectAll: () => void;
  onFilter: (key: keyof T, value: string) => void;
}

export function TableHeader<T>({
  columns,
  selectable,
  sortable: _sortable,
  filterable,
  sortConfig,
  allSelected,
  someSelected,
  onSort,
  onSelectAll,
  onFilter,
}: TableHeaderProps<T>) {
  return (
    <thead className="table-light">
      <tr>
        {/* Selection checkbox */}
        {selectable && (
          <th style={{ width: '40px' }}>
            <input
              type="checkbox"
              className="form-check-input"
              checked={allSelected}
              ref={input => {
                if (input) input.indeterminate = someSelected;
              }}
              onChange={onSelectAll}
            />
          </th>
        )}
        
        {/* Column headers */}
        {columns.map(column => (
          <th
            key={String(column.key)}
            style={{ width: column.width }}
            className={`
              ${column.sortable ? 'cursor-pointer' : ''}
              ${column.align ? `text-${column.align}` : ''}
            `}
            onClick={() => column.sortable && onSort(column.key)}
          >
            <div className="d-flex align-items-center">
              <span>{column.label}</span>
              {column.sortable && sortConfig?.key === column.key && (
                <i className={`bi bi-arrow-${sortConfig.direction === 'asc' ? 'up' : 'down'} ms-1`}></i>
              )}
            </div>
            
            {/* Filter input */}
            {filterable && column.filterable && (
              <input
                type="text"
                className="form-control form-control-sm mt-1"
                placeholder={`Filter ${column.label.toLowerCase()}...`}
                onChange={(e) => onFilter(column.key, e.target.value)}
              />
            )}
          </th>
        ))}
      </tr>
    </thead>
  );
}