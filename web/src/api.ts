export type YearMonth = { year: number; month: number }
export type Expense = { id: number; year: number; month: number; category?: string; description: string; amount_cents: number }
export type Summary = { year: number; month: number; salary_cents: number; budget_cents: number; expense_cents: number; remaining_cents: number }

const apiKey = localStorage.getItem('api_key') || ''
const headers = { 'Content-Type': 'application/json', ...(apiKey ? { 'X-API-Key': apiKey } : {}) }

export async function getSummary(ym: YearMonth): Promise<Summary> {
  const u = new URL('/api/v1/summary', location.origin)
  u.searchParams.set('year', String(ym.year))
  u.searchParams.set('month', String(ym.month))
  const res = await fetch(u.toString(), { headers })
  if (!res.ok) throw new Error('Failed to fetch summary')
  return res.json()
}

export async function setSalary(ym: YearMonth, amount_cents: number) {
  const res = await fetch('/api/v1/salary', { method: 'POST', headers, body: JSON.stringify({ ...ym, amount_cents }) })
  if (!res.ok) throw new Error('Failed to set salary')
}

export async function setBudget(ym: YearMonth, amount_cents: number) {
  const res = await fetch('/api/v1/budget', { method: 'POST', headers, body: JSON.stringify({ ...ym, amount_cents }) })
  if (!res.ok) throw new Error('Failed to set budget')
}

export async function listExpenses(ym: YearMonth): Promise<Expense[]> {
  const u = new URL('/api/v1/expenses', location.origin)
  u.searchParams.set('year', String(ym.year))
  u.searchParams.set('month', String(ym.month))
  const res = await fetch(u.toString(), { headers })
  if (!res.ok) throw new Error('Failed to fetch expenses')
  return res.json()
}

export async function addExpense(e: Omit<Expense, 'id'>) {
  const res = await fetch('/api/v1/expenses', { method: 'POST', headers, body: JSON.stringify(e) })
  if (!res.ok) throw new Error('Failed to add expense')
}

export async function deleteExpense(id: number) {
  const res = await fetch(`/api/v1/expenses/${id}`, { method: 'DELETE', headers })
  if (!res.ok) throw new Error('Failed to delete expense')
}
