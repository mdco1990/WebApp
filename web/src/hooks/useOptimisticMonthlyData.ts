import { useState, useCallback } from 'react';
import { MonthlyData } from '../types/budget';

export interface OptimisticUpdate {
  id: string;
  type: 'expense' | 'income' | 'budget';
  action: 'add' | 'update' | 'delete';
  data: unknown;
  timestamp: Date;
}

export interface OptimisticMonthlyDataHook {
  optimisticData: MonthlyData | null;
  pendingUpdates: OptimisticUpdate[];
  applyOptimisticUpdate: (update: Omit<OptimisticUpdate, 'id' | 'timestamp'>) => void;
  clearOptimisticData: () => void;
}

export function useOptimisticMonthlyData(): OptimisticMonthlyDataHook {
  const [optimisticData, setOptimisticData] = useState<MonthlyData | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<OptimisticUpdate[]>([]);

  const applyOptimisticUpdate = useCallback((update: Omit<OptimisticUpdate, 'id' | 'timestamp'>) => {
    const fullUpdate: OptimisticUpdate = {
      ...update,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };

    setPendingUpdates(prev => [...prev, fullUpdate]);

    // Apply optimistic update to data
    // This is a simplified implementation
    setOptimisticData(prev => {
      if (!prev) return null;
      
      // For now, just return the same data
      // In a real implementation, you'd apply the optimistic changes
      return prev;
    });
  }, []);

  const clearOptimisticData = useCallback(() => {
    setOptimisticData(null);
    setPendingUpdates([]);
  }, []);

  return {
    optimisticData,
    pendingUpdates,
    applyOptimisticUpdate,
    clearOptimisticData,
  };
}