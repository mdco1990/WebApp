import React, { useState, useCallback, ReactNode } from 'react';
import { Expense } from '../../types/budget';
import { DataFetcher } from './DataFetcher';
import { FormHandler } from './FormHandler';





// Render props pattern for data filtering and sorting
interface DataProcessorProps<T> {
  data: T[];
  children: (processedData: T[], processors: {
    sortBy: (field: keyof T, direction: 'asc' | 'desc') => void;
    filterBy: (predicate: (item: T) => boolean) => void;
    searchBy: (query: string, fields: (keyof T)[]) => void;
    reset: () => void;
  }) => ReactNode;
}

export function DataProcessor<T>({ data, children }: DataProcessorProps<T>) {
  const [processedData, setProcessedData] = useState<T[]>(data);
  const [originalData] = useState<T[]>(data);

  const sortBy = useCallback((field: keyof T, direction: 'asc' | 'desc') => {
    setProcessedData(prev => {
      const sorted = [...prev].sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      });
      return sorted;
    });
  }, []);

  const filterBy = useCallback((predicate: (item: T) => boolean) => {
    setProcessedData(originalData.filter(predicate));
  }, [originalData]);

  const searchBy = useCallback((query: string, fields: (keyof T)[]) => {
    if (!query.trim()) {
      setProcessedData(originalData);
      return;
    }
    
    const lowerQuery = query.toLowerCase();
    setProcessedData(originalData.filter(item => 
      fields.some(field => {
        const value = item[field];
        return String(value).toLowerCase().includes(lowerQuery);
      })
    ));
  }, [originalData]);

  const reset = useCallback(() => {
    setProcessedData(originalData);
  }, [originalData]);

  return (
    <>
      {children(processedData, {
        sortBy,
        filterBy,
        searchBy,
        reset,
      })}
    </>
  );
}

// Render props pattern for modal/dialog management
interface ModalManagerProps {
  children: (modalProps: {
    isOpen: boolean;
    openModal: () => void;
    closeModal: () => void;
    toggleModal: () => void;
  }) => ReactNode;
}

export function ModalManager({ children }: ModalManagerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);
  const toggleModal = useCallback(() => setIsOpen(prev => !prev), []);

  return (
    <>
      {children({
        isOpen,
        openModal,
        closeModal,
        toggleModal,
      })}
    </>
  );
}

// Render props pattern for pagination
interface PaginationManagerProps<T> {
  data: T[];
  itemsPerPage: number;
  children: (paginationProps: {
    currentPage: number;
    totalPages: number;
    currentData: T[];
    goToPage: (page: number) => void;
    nextPage: () => void;
    prevPage: () => void;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  }) => ReactNode;
}

export function PaginationManager<T>({ data, itemsPerPage, children }: PaginationManagerProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(data.length / itemsPerPage);
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  return (
    <>
      {children({
        currentPage,
        totalPages,
        currentData,
        goToPage,
        nextPage,
        prevPage,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      })}
    </>
  );
}

// Render props pattern for data export
interface DataExporterProps<T> {
  data: T[];
  children: (exportProps: {
    exportToCSV: () => void;
    exportToJSON: () => void;
    exportToPDF: () => void;
    isExporting: boolean;
  }) => ReactNode;
}

export function DataExporter<T extends Record<string, unknown>>({ data, children }: DataExporterProps<T>) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = useCallback(async () => {
    setIsExporting(true);
    try {
      // Simple CSV export implementation
      const headers = Object.keys(data[0] || {}).join(',');
      const rows = data.map(item => Object.values(item).join(',')).join('\n');
      const csv = `${headers}\n${rows}`;
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // CSV export error handled silently
    } finally {
      setIsExporting(false);
    }
  }, [data]);

  const exportToJSON = useCallback(async () => {
    setIsExporting(true);
    try {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // JSON export error handled silently
    } finally {
      setIsExporting(false);
    }
  }, [data]);

  const exportToPDF = useCallback(async () => {
    setIsExporting(true);
    try {
      // Placeholder for PDF export
      // PDF export not implemented
    } catch {
      // PDF export error handled silently
    } finally {
      setIsExporting(false);
    }
  }, []);

  return (
    <>
      {children({
        exportToCSV,
        exportToJSON,
        exportToPDF,
        isExporting,
      })}
    </>
  );
}

// Render props pattern for data visualization
interface ChartRendererProps<T> {
  data: T[];
  chartType: 'bar' | 'line' | 'pie' | 'doughnut';
  children: (chartProps: {
    chartData: Record<string, unknown>;
    chartOptions: Record<string, unknown>;
    updateData: (newData: T[]) => void;
    updateChartType: (type: 'bar' | 'line' | 'pie' | 'doughnut') => void;
  }) => ReactNode;
}

export function ChartRenderer<T>({ data, chartType, children }: ChartRendererProps<T>) {
  const [currentData, setCurrentData] = useState<T[]>(data);
  const [currentChartType, setCurrentChartType] = useState(chartType);

  const updateData = useCallback((newData: T[]) => {
    setCurrentData(newData);
  }, []);

  const updateChartType = useCallback((type: 'bar' | 'line' | 'pie' | 'doughnut') => {
    setCurrentChartType(type);
  }, []);

  // Generate chart data based on current data and chart type
  const generateChartData = useCallback(() => {
    // This is a simplified implementation
    // In a real app, you'd use a charting library like Chart.js
    return {
      labels: currentData.map((_, _index) => `Item ${_index + 1}`),
      datasets: [{
        label: 'Data',
        data: currentData.map((_, _index) => Math.random() * 100), // Placeholder
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      }],
    };
  }, [currentData]);

  const generateChartOptions = useCallback(() => {
    return {
      responsive: true,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: `${currentChartType.toUpperCase()} Chart`,
        },
      },
    };
  }, [currentChartType]);

  return (
    <>
      {children({
        chartData: generateChartData(),
        chartOptions: generateChartOptions(),
        updateData,
        updateChartType,
      })}
    </>
  );
}

// Example usage components

export function ExpenseListWithRenderProps() {
  return (
    <DataFetcher<Expense[]> url="/api/expenses">
      {(expenses, loading, error, _refetch) => (
        <DataProcessor data={expenses || []}>
          {(processedExpenses, processors) => (
            <PaginationManager data={processedExpenses} itemsPerPage={10}>
              {(paginationProps) => (
                <div>
                  {loading && <div>Loading...</div>}
                  {error && <div>Error: {error}</div>}
                  
                  <div>
                    <button onClick={() => processors.sortBy('amount_cents', 'desc')}>
                      Sort by Amount
                    </button>
                    <button onClick={() => processors.filterBy(exp => exp.amount_cents > 1000)}>
                      Filter High Expenses
                    </button>
                  </div>
                  
                  <div>
                    {paginationProps.currentData.map(expense => (
                      <div key={expense.id}>
                        {expense.description} - ${expense.amount_cents / 100}
                      </div>
                    ))}
                  </div>
                  
                  <div>
                    <button 
                      onClick={paginationProps.prevPage} 
                      disabled={!paginationProps.hasPrevPage}
                    >
                      Previous
                    </button>
                    <span>Page {paginationProps.currentPage} of {paginationProps.totalPages}</span>
                    <button 
                      onClick={paginationProps.nextPage} 
                      disabled={!paginationProps.hasNextPage}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </PaginationManager>
          )}
        </DataProcessor>
      )}
    </DataFetcher>
  );
}

export function ExpenseFormWithRenderProps() {
  return (
    <FormHandler
      initialValues={{
        description: '',
        amount_cents: 0,
        category: '',
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
      }}
      validate={(values) => {
        const errors: Record<string, string> = {};
        if (!values.description.trim()) {
          errors.description = 'Description is required';
        }
        if (values.amount_cents <= 0) {
          errors.amount_cents = 'Amount must be positive';
        }
        return errors;
      }}
      onSubmit={async (_values) => {
        // Submit logic here
      }}
    >
      {({ values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit, resetForm }) => (
        <form onSubmit={handleSubmit}>
          <div>
            <label>Description:</label>
            <input
              type="text"
              value={values.description}
              onChange={handleChange('description')}
              onBlur={handleBlur('description')}
            />
            {touched.description && errors.description && (
              <span style={{ color: 'red' }}>{errors.description}</span>
            )}
          </div>
          
          <div>
            <label>Amount (cents):</label>
            <input
              type="number"
              value={values.amount_cents}
              onChange={handleChange('amount_cents')}
              onBlur={handleBlur('amount_cents')}
            />
            {touched.amount_cents && errors.amount_cents && (
              <span style={{ color: 'red' }}>{errors.amount_cents}</span>
            )}
          </div>
          
          <div>
            <label>Category:</label>
            <input
              type="text"
              value={values.category}
              onChange={handleChange('category')}
              onBlur={handleBlur('category')}
            />
          </div>
          
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
          
          <button type="button" onClick={resetForm}>
            Reset
          </button>
        </form>
      )}
    </FormHandler>
  );
}