export type YearMonth = { year: number; month: number }
export type Expense = { id: number; year: number; month: number; category?: string; description: string; amount_cents: number }
export type Summary = { year: number; month: number; salary_cents: number; budget_cents: number; expense_cents: number; remaining_cents: number }

const apiKey = localStorage.getItem('api_key') || ''
const headers = { 'Content-Type': 'application/json', ...(apiKey ? { 'X-API-Key': apiKey } : {}) }

// Helper function to handle fetch with timeout and better error messages
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 5000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { ...headers, ...(options.headers || {}) }
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error(`Server error: ${response.status}`)
      } else if (response.status === 404) {
        throw new Error('API endpoint not found')
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    }
    
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection')
      }
      throw error
    }
    throw new Error('Network request failed')
  }
}

export async function getSummary(ym: YearMonth): Promise<Summary> {
  const u = new URL('/api/v1/summary', location.origin)
  u.searchParams.set('year', String(ym.year))
  u.searchParams.set('month', String(ym.month))
  
  const res = await fetchWithTimeout(u.toString())
  const data = await res.json()
  
  // Ensure we have all required fields with defaults
  return {
    year: data?.year || ym.year,
    month: data?.month || ym.month,
    salary_cents: data?.salary_cents || 0,
    budget_cents: data?.budget_cents || 0,
    expense_cents: data?.expense_cents || 0,
    remaining_cents: data?.remaining_cents || 0
  }
}

export async function setSalary(ym: YearMonth, amount_cents: number) {
  const res = await fetchWithTimeout('/api/v1/salary', { 
    method: 'POST', 
    body: JSON.stringify({ ...ym, amount_cents }) 
  })
  return res
}

export async function setBudget(ym: YearMonth, amount_cents: number) {
  const res = await fetchWithTimeout('/api/v1/budget', { 
    method: 'POST', 
    body: JSON.stringify({ ...ym, amount_cents }) 
  })
  return res
}

export async function listExpenses(ym: YearMonth): Promise<Expense[]> {
  const u = new URL('/api/v1/expenses', location.origin)
  u.searchParams.set('year', String(ym.year))
  u.searchParams.set('month', String(ym.month))
  
  const res = await fetchWithTimeout(u.toString())
  const data = await res.json()
  
  // Ensure we always return an array
  return Array.isArray(data) ? data : []
}

export async function addExpense(e: Omit<Expense, 'id'>) {
  const res = await fetchWithTimeout('/api/v1/expenses', { 
    method: 'POST', 
    body: JSON.stringify(e) 
  })
  return res
}

export async function deleteExpense(id: number) {
  const res = await fetchWithTimeout(`/api/v1/expenses/${id}`, { method: 'DELETE' })
  return res
}
