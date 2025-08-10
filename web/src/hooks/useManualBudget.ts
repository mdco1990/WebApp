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

  // Persist and load manual budget per month
  useEffect(() => {
    const key = `manualBudget:${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;
    // Avoid saving until we've attempted to load once for this month
    if (!manualBudgetLoadedRef.current) return;

    try {
      localStorage.setItem(key, JSON.stringify(manualBudget));
    } catch {}

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
      try {
        await saveManualBudget(payload);
      } catch {
        // ignore - backend may not implement this yet; localStorage remains the fallback
      }
    }, 400);
  }, [manualBudget, currentDate]);

  useEffect(() => {
    // We're changing month: block saves until load completes
    manualBudgetLoadedRef.current = false;
    const key = `manualBudget:${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;

    const load = async () => {
      // Try server first
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const data = await getManualBudget({ year, month });
        if (data && typeof data.bank_amount_cents === 'number' && Array.isArray(data.items)) {
          const fromServer: ManualBudgetState = {
            bankAmount: (data.bank_amount_cents || 0) / 100,
            items: data.items.map((it: any) => ({
              id: String(it.id ?? it.client_id ?? Math.random().toString(36).slice(2)),
              name: String(it.name ?? ''),
              amount: (it.amount_cents || 0) / 100,
            })),
          };
          setManualBudget(fromServer);
          // cache locally as well
          try {
            localStorage.setItem(key, JSON.stringify(fromServer));
          } catch {}
          manualBudgetLoadedRef.current = true;
          return;
        }
      } catch {
        // fall back to localStorage
      }

      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as ManualBudgetState;
          setManualBudget(parsed);
        } catch {}
      } else {
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
