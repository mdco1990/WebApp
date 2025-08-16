import React from 'react';

interface TableBodyProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    render?: (value: T[keyof T], item: T) => React.ReactNode;
    align?: 'left' | 'center' | 'right';
  }>;
  selectable: boolean;
  selectedItems: T[];
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T, index: number) => string;
  onRowSelect: (item: T) => void;
  getKey: (item: T, index: number) => string | number;
}

export function TableBody<T>({
  data,
  columns,
  selectable,
  selectedItems,
  onRowClick,
  rowClassName,
  onRowSelect,
  getKey,
}: TableBodyProps<T>) {
  return (
    <tbody>
      {data.map((item, index) => {
        const key = getKey(item, index);
        const isSelected = selectedItems.some(selected => getKey(selected, 0) === key);
        
        return (
          <tr
            key={key}
            className={`
              ${onRowClick ? 'cursor-pointer' : ''}
              ${isSelected ? 'table-active' : ''}
              ${rowClassName ? rowClassName(item, index) : ''}
            `}
            onClick={() => onRowClick?.(item)}
          >
            {/* Selection checkbox */}
            {selectable && (
              <td onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={isSelected}
                  onChange={() => onRowSelect(item)}
                />
              </td>
            )}
            
            {/* Data cells */}
            {columns.map(column => (
              <td
                key={String(column.key)}
                className={column.align ? `text-${column.align}` : ''}
              >
                {column.render
                  ? column.render(item[column.key], item)
                  : String(item[column.key] ?? '')
                }
              </td>
            ))}
          </tr>
        );
      })}
    </tbody>
  );
}