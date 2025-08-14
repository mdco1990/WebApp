/* eslint-disable no-console */
import { useState, useRef, useEffect, useCallback } from 'react';

interface ManualBudgetItem {
  id: string;
  name: string;
  amount: number; // currency units
}

interface ManualBudgetState {
  bankAmount: number; // currency units
  items: ManualBudgetItem[];
}

export const useManualBudgetFixed = (currentDate: Date) => {
  const [manualBudget, setManualBudget] = useState<ManualBudgetState>(() => ({
    bankAmount: 0,
    items: [],
  }));

  // Prevent overwriting saved manualBudget on first mount before load runs
  const manualBudgetLoadedRef = useRef(false);
  // Debounce timer for saves
  const saveTimer = useRef<number | null>(null);

  // Generate localStorage key for current month
  const getStorageKey = (date: Date) => {
    return `manualBudget:${date.getFullYear()}-${date.getMonth() + 1}`;
  };

  // Save to localStorage with debouncing
  const saveToStorage = useCallback((data: ManualBudgetState, date: Date) => {
    const key = getStorageKey(date);
    
    // Clear existing timer
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }
    
    // Debounce saves
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`✅ Manual budget saved to localStorage: ${key}`, data);
      } catch (error) {
        console.error('❌ Failed to save manual budget to localStorage:', error);
      }
    }, 200); // Faster save for better UX
  }, []);

  // Load from localStorage
  const loadFromStorage = useCallback((date: Date): ManualBudgetState | null => {
    const key = getStorageKey(date);
    
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as ManualBudgetState;
        console.log(`✅ Manual budget loaded from localStorage: ${key}`, parsed);
        return parsed;
      }
    } catch (error) {
      console.error('❌ Failed to load manual budget from localStorage:', error);
    }
    
    return null;
  }, []);

  // Save effect - triggers when manualBudget changes
  useEffect(() => {
    // Don't save until we've loaded initial data
    if (!manualBudgetLoadedRef.current) return;

    console.log('💾 Manual budget changed, saving...', {
      date: currentDate.toISOString(),
      bankAmount: manualBudget.bankAmount,
      itemsCount: manualBudget.items.length,
      items: manualBudget.items
    });

    saveToStorage(manualBudget, currentDate);
  }, [manualBudget, currentDate, saveToStorage]);

  // Load effect - triggers when currentDate changes
  useEffect(() => {
    console.log('🔄 Loading manual budget for month:', {
      date: currentDate.toISOString(),
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      key: getStorageKey(currentDate)
    });

    // Block saves until load completes
    manualBudgetLoadedRef.current = false;

    // Load data for this month
    const savedData = loadFromStorage(currentDate);
    
    if (savedData) {
      setManualBudget(savedData);
    } else {
      console.log('ℹ️ No saved data found, using default state');
      setManualBudget({ bankAmount: 0, items: [] });
    }

    // Allow saves after loading
    manualBudgetLoadedRef.current = true;
  }, [currentDate, loadFromStorage]);

  return {
    manualBudget,
    setManualBudget,
  };
};
