import { YearMonth, Expense } from '../types/budget';

function baseHeaders() {
  const apiKey = sessionStorage.getItem('api_key') || '';
  const sessionId = localStorage.getItem('session_id') || '';
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) h['X-API-Key'] = apiKey;
  if (sessionId) h['Authorization'] = `Bearer ${sessionId}`;
  return h;
}

// Helper function to handle fetch with timeout and better error messages
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      credentials: 'include',
      headers: { ...baseHeaders(), ...(options.headers || {}) },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      } else if (response.status === 404) {
        throw new Error('API endpoint not found');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection');
      }
      throw error;
    }
    throw new Error('Network request failed');
  }
}

export async function getSummary(ym: YearMonth) {
  const u = new URL('/api/v1/summary', location.origin);
  u.searchParams.set('year', String(ym.year));
  u.searchParams.set('month', String(ym.month));

  const res = await fetchWithTimeout(u.toString());
  const data = await res.json();

  return {
    year: data?.year || ym.year,
    month: data?.month || ym.month,
    salary_cents: data?.salary_cents || 0,
    budget_cents: data?.budget_cents || 0,
    expense_cents: data?.expense_cents || 0,
    remaining_cents: data?.remaining_cents || 0,
  };
}

export async function setSalary(ym: YearMonth, amount_cents: number) {
  const res = await fetchWithTimeout('/api/v1/salary', {
    method: 'POST',
    body: JSON.stringify({ ...ym, amount_cents }),
  });
  return res;
}

export async function setBudget(ym: YearMonth, amount_cents: number) {
  const res = await fetchWithTimeout('/api/v1/budget', {
    method: 'POST',
    body: JSON.stringify({ ...ym, amount_cents }),
  });
  return res;
}

// Enhanced API
export async function getMonthlyData(ym: YearMonth) {
  const u = new URL('/api/v1/monthly-data', location.origin);
  u.searchParams.set('year', String(ym.year));
  u.searchParams.set('month', String(ym.month));
  const res = await fetchWithTimeout(u.toString());
  return res.json();
}

export async function seedDefaults(ym: YearMonth) {
  return fetchWithTimeout('/api/v1/seed-defaults', {
    method: 'POST',
    body: JSON.stringify(ym),
  });
}

// Income sources
export async function listIncomeSources(ym: YearMonth) {
  const u = new URL('/api/v1/income-sources/', location.origin);
  u.searchParams.set('year', String(ym.year));
  u.searchParams.set('month', String(ym.month));
  const res = await fetchWithTimeout(u.toString());
  return res.json();
}
export async function createIncomeSource(payload: {
  name: string;
  year: number;
  month: number;
  amount_cents: number;
}) {
  return fetchWithTimeout('/api/v1/income-sources/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
export async function updateIncomeSource(
  id: number,
  payload: { name: string; amount_cents: number }
) {
  return fetchWithTimeout(`/api/v1/income-sources/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
export async function deleteIncomeSource(id: number) {
  return fetchWithTimeout(`/api/v1/income-sources/${id}`, { method: 'DELETE' });
}

// Budget sources
export async function listBudgetSources(ym: YearMonth) {
  const u = new URL('/api/v1/budget-sources/', location.origin);
  u.searchParams.set('year', String(ym.year));
  u.searchParams.set('month', String(ym.month));
  const res = await fetchWithTimeout(u.toString());
  return res.json();
}
export async function createBudgetSource(payload: {
  name: string;
  year: number;
  month: number;
  amount_cents: number;
}) {
  return fetchWithTimeout('/api/v1/budget-sources/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
export async function updateBudgetSource(
  id: number,
  payload: { name: string; amount_cents: number }
) {
  return fetchWithTimeout(`/api/v1/budget-sources/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
export async function deleteBudgetSource(id: number) {
  return fetchWithTimeout(`/api/v1/budget-sources/${id}`, { method: 'DELETE' });
}

// Manual budget
export async function getManualBudget(ym: YearMonth) {
  const u = new URL('/api/v1/manual-budget', location.origin);
  u.searchParams.set('year', String(ym.year));
  u.searchParams.set('month', String(ym.month));
  const res = await fetchWithTimeout(u.toString());
  return res.json();
}
export async function saveManualBudget(payload: {
  year: number;
  month: number;
  bank_amount_cents: number;
  items: Array<{ id?: string | number; name: string; amount_cents: number }>;
}) {
  return fetchWithTimeout('/api/v1/manual-budget', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function listExpenses(ym: YearMonth): Promise<Expense[]> {
  const u = new URL('/api/v1/expenses', location.origin);
  u.searchParams.set('year', String(ym.year));
  u.searchParams.set('month', String(ym.month));

  const res = await fetchWithTimeout(u.toString());
  const data = await res.json();

  return Array.isArray(data) ? data : [];
}

export async function addExpense(e: Omit<Expense, 'id'>) {
  const res = await fetchWithTimeout('/api/v1/expenses', {
    method: 'POST',
    body: JSON.stringify(e),
  });
  return res;
}

export async function deleteExpense(id: number) {
  const res = await fetchWithTimeout(`/api/v1/expenses/${id}`, { method: 'DELETE' });
  return res;
}

// User management APIs for admin
export async function getPendingUsers() {
  const res = await fetchWithTimeout('/api/v1/admin/users/pending');
  return res.json();
}

export async function getAllUsers() {
  const res = await fetchWithTimeout('/api/v1/admin/users');
  return res.json();
}

export async function approveUser(userId: number) {
  const res = await fetchWithTimeout(`/api/v1/admin/users/${userId}/approve`, {
    method: 'POST',
  });
  return res;
}

export async function deleteUser(userId: number) {
  const res = await fetchWithTimeout(`/api/v1/admin/users/${userId}`, { method: 'DELETE' });
  return res;
}

export async function getLogs() {
  const res = await fetchWithTimeout('/api/v1/admin/logs');
  return res.json();
}

export async function rejectUser(userId: number) {
  const res = await fetchWithTimeout(`/api/v1/admin/users/${userId}/reject`, { method: 'POST' });
  return res;
}
