/* eslint-disable no-console */
import { useState, useRef, useEffect } from 'react';
import { getManualBudget, saveManualBudget } from '../services/api';

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
      // Check if user is authenticated before trying server save
      const sessionId = localStorage.getItem('session_id');
      if (!sessionId) {
        console.log('⏭️ No session, skipping server save');
        return;
      }

      try {
        await saveManualBudget(payload);
      } catch (error) {
        console.error('❌ Server save failed:', error);
        // ignore - backend may not implement this yet; localStorage remains the fallback
      }
    }, 400);
  }, [manualBudget, currentDate]);

  useEffect(() => {
    // We're changing month: block saves until load completes
    manualBudgetLoadedRef.current = false;
    const key = `manualBudget:${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;

    console.log('🔄 Manual Budget - Loading month data:', {
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      key,
    });

    const load = async () => {
      // Check if user is authenticated before trying server
      const sessionId = localStorage.getItem('session_id');
      if (!sessionId) {
        console.log('⏭️ No session, skipping server load');
        // Fall through to localStorage only
      } else {
        // Try server first
        try {
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth() + 1;
          console.log('📡 Attempting server load');
          const data = await getManualBudget({ year, month });
          console.log('📡 Server response:', data);

          if (data && typeof data.bank_amount_cents === 'number' && Array.isArray(data.items)) {
            interface ServerItem {
              id?: string | number;
              client_id?: string | number;
              name?: unknown;
              amount_cents?: number;
            }
            const fromServer: ManualBudgetState = {
              bankAmount: (data.bank_amount_cents || 0) / 100,
              items: (data.items as ServerItem[]).map((it) => ({
                id: String(it.id ?? it.client_id ?? /* fallback */ Date.now().toString(36)),
                name: String(it.name ?? ''),
                amount: (it.amount_cents ?? 0) / 100,
              })),
            };
            console.log('✅ Server data loaded:', fromServer);
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
        } catch (error) {
          console.error('❌ Server load failed, using localStorage:', error);
          // fall back to localStorage
        }
      }

      console.log('📱 Loading from localStorage');
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as ManualBudgetState;
          console.log('✅ localStorage data loaded:', parsed);
          setManualBudget(parsed);
        } catch {
          // ignore parse errors; fall through to default state
        }
      } else {
        console.log('ℹ️ No saved data, using default state');
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
