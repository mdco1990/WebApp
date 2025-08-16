import React, { createContext, useContext, ReactNode } from 'react';

// Table context types
interface TableContextType<T extends Record<string, unknown>> {
  data: T[];
  columns: Array<{
    key: keyof T;
    label: string;
    sortable?: boolean;
    filterable?: boolean;
    width?: string;
    align?: 'left' | 'center' | 'right';
    render?: (value: T[keyof T], item: T) => React.ReactNode;
  }>;
  sortable: boolean;
  filterable: boolean;
  selectable: boolean;
  sortConfig: { key: keyof T; direction: 'asc' | 'desc' } | null;
  filters: Record<keyof T, string>;
  selectedItems: T[];
  onSort: (key: keyof T) => void;
  onFilter: (key: keyof T, value: string) => void;
  onSelect: (item: T) => void;
  onSelectAll: () => void;
}

// Table props
interface TableProps<T extends Record<string, unknown>> {
  data: T[];
  children: ReactNode;
  getItemKey: (item: T) => string | number;
}

// Create context with proper generic constraint
const TableContext = createContext<TableContextType<Record<string, unknown>> | null>(null);

// Table component
export function Table<T extends Record<string, unknown>>({ data, children, getItemKey }: TableProps<T>) {
  const contextValue: TableContextType<T> = {
    data,
    columns: [],
    sortable: false,
    filterable: false,
    selectable: false,
    sortConfig: null,
    filters: {} as Record<keyof T, string>,
    selectedItems: [],
    onSort: () => {},
    onFilter: () => {},
    onSelect: () => {},
    onSelectAll: () => {},
  };

  return (
    <TableContext.Provider value={contextValue as TableContextType<Record<string, unknown>>}>
      <div className="table-responsive">
        <table className="table table-striped table-hover">
          {children}
        </table>
      </div>
    </TableContext.Provider>
  );
}

// Table header props
interface TableHeaderProps {
  children: ReactNode;
}

// Table header component
export function TableHeader({ children }: TableHeaderProps) {
  return <thead className="table-light">{children}</thead>;
}

// Table body props
interface TableBodyProps {
  children: ReactNode;
}

// Table body component
export function TableBody({ children }: TableBodyProps) {
  return <tbody>{children}</tbody>;
}

// Table row props
interface TableRowProps<T extends Record<string, unknown>> {
  item: T;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

// Table row component
export function TableRow<T extends Record<string, unknown>>({ item, children, onClick, className }: TableRowProps<T>) {
  return (
    <tr 
      className={`${onClick ? 'cursor-pointer' : ''} ${className || ''}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

// Table cell props
interface TableCellProps {
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

// Table cell component
export function TableCell({ children, align = 'left', className }: TableCellProps) {
  return (
    <td className={`text-${align} ${className || ''}`}>
      {children}
    </td>
  );
}

// Hook to use table context
export function useTableContext<T extends Record<string, unknown>>(): TableContextType<T> {
  const context = useContext(TableContext);
  if (!context) {
    throw new Error('useTableContext must be used within a Table component');
  }
  return context as TableContextType<T>;
}