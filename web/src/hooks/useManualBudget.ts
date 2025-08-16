/* eslint-disable no-console */
import { useState, useRef, useEffect } from 'react';
import { ApiService } from '../services/api';

interface ManualBudgetItem {
  id: string;
  name: string;
  amount: number; // currency units
}

interface ManualBudgetState {
  bankAmount: number; // currency units
  items: ManualBudgetItem[];
}

export const useManualBudget = (currentDate: Date) => {
  const [manualBudget, setManualBudget] = useState<ManualBudgetState>(() => ({
    bankAmount: 0,
    items: [],
  }));

  // Prevent overwriting saved manualBudget on first mount before load runs
  const manualBudgetLoadedRef = useRef(false);
  // Debounce timer for server saves
  const manualBudgetSaveTimer = useRef<number | null>(null);

  useEffect(() => {
    const key = `manualBudget:${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;
    // Avoid saving until we've attempted to load once for this month
    if (!manualBudgetLoadedRef.current) return;

    // Debug: Log saving operation
    // console.log('💾 Manual Budget - Saving data:', {
    // 	key,
    // 	bankAmount: manualBudget.bankAmount,
    // 	itemsCount: manualBudget.items.length,
    // 	items: manualBudget.items
    // });

    try {
      localStorage.setItem(key, JSON.stringify(manualBudget));
      // console.log('✅ localStorage saved successfully');
    } catch {
      console.error('❌ localStorage save failed');
      // ignore storage quota or availability issues
    }

    // Also attempt to save to backend (best-effort)
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const payload = {
      year,
      month,
      bank_amount_cents: Math.round(manualBudget.bankAmount * 100),
      items: manualBudget.items.map((it) => ({
        id: it.id,
        name: it.name,
        amount_cents: Math.round(it.amount * 100),
      })),
    };

    // debounce to reduce network chatter
    if (manualBudgetSaveTimer.current) window.clearTimeout(manualBudgetSaveTimer.current);
    manualBudgetSaveTimer.current = window.setTimeout(async () => {
      // console.log('📡 Attempting server save:', payload);

      // Check if user is authenticated before trying server save
      const sessionId = localStorage.getItem('session_id');
      if (!sessionId) {
        // No session, skipping server save
        return;
      }

      try {
        await ApiService.saveManualBudget(payload.year, payload.month, {
          bank_amount_cents: payload.bank_amount_cents,
          items: payload.items,
        });
        // console.log('✅ Server save successful');
      } catch {
        // Server save failed
        // ignore - backend may not implement this yet; localStorage remains the fallback
      }
    }, 400);
  }, [manualBudget, currentDate]);

  useEffect(() => {
    // We're changing month: block saves until load completes
    manualBudgetLoadedRef.current = false;
    const key = `manualBudget:${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;

    // Manual Budget - Loading month data

    const load = async () => {
      // Check if user is authenticated before trying server
      const sessionId = localStorage.getItem('session_id');
      if (!sessionId) {
        // No session, skipping server load
        // Fall through to localStorage only
      } else {
        // Try server first
        try {
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth() + 1;
          // Attempting server load
          const response = await ApiService.getManualBudget(year, month);
          const data = response.data;
          // Server response received

          if (data && typeof (data as { bank_amount_cents?: number; items?: unknown[] }).bank_amount_cents === 'number' && Array.isArray((data as { bank_amount_cents?: number; items?: unknown[] }).items)) {
            interface ServerItem {
              id?: string | number;
              client_id?: string | number;
              name?: unknown;
              amount_cents?: number;
            }
            const fromServer: ManualBudgetState = {
              bankAmount: ((data as { bank_amount_cents?: number; items?: unknown[] }).bank_amount_cents || 0) / 100,
              items: ((data as { bank_amount_cents?: number; items?: unknown[] }).items as ServerItem[]).map((it) => ({
                id: String(it.id ?? it.client_id ?? Math.random().toString(36).slice(2)),
                name: String(it.name ?? ''),
                amount: (it.amount_cents ?? 0) / 100,
              })),
            };
            // Server data loaded
            setManualBudget(fromServer);
            // cache locally as well
            try {
              localStorage.setItem(key, JSON.stringify(fromServer));
            } catch {
              // ignore localStorage failures
            }
            manualBudgetLoadedRef.current = true;
            return;
          }
                  } catch {
            // Server load failed, using localStorage
            // fall back to localStorage
          }
      }

      // Loading from localStorage
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as ManualBudgetState;
          // localStorage data loaded
          setManualBudget(parsed);
        } catch {
          // ignore parse errors; fall through to default state
        }
      } else {
        // No saved data, using default state
        // default zero state for months without saved data
        setManualBudget({ bankAmount: 0, items: [] });
      }
      manualBudgetLoadedRef.current = true;
    };

    load();
  }, [currentDate]);

  return {
    manualBudget,
    setManualBudget,
  };
};
