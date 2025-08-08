import { useCallback, useEffect, useMemo, useState } from 'react'
import { addExpense, deleteExpense, getSummary, listExpenses, setBudget, setSalary, type Expense, type YearMonth } from './api'

function cents(n: number){ return (n/100).toFixed(2) }

export default function App(){
  const today = new Date()
  const [ym, setYm] = useState<YearMonth>({ year: today.getFullYear(), month: today.getMonth()+1 })
  const [summary, setSummary] = useState<any>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [salary, setSalaryInput] = useState('')
  const [budget, setBudgetInput] = useState('')
  const [form, setForm] = useState({ category: '', description: '', amount: '' })
  const [error, setError] = useState<string | null>(null)
  const ymStr = useMemo(()=> `${ym.year}-${String(ym.month).padStart(2,'0')}`, [ym])

  useEffect(() => {
    let isCancelled = false
    
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Add timeout to prevent hanging requests
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        )
        
        const result = await Promise.race([
          Promise.all([getSummary(ym), listExpenses(ym)]),
          timeoutPromise
        ]) as [any, Expense[]]
        
        const [s, e] = result
        
        // Only update state if the effect hasn't been cancelled
        if (!isCancelled) {
          setSummary(s || { 
            year: ym.year, 
            month: ym.month, 
            salary_cents: 0, 
            budget_cents: 0, 
            expense_cents: 0, 
            remaining_cents: 0 
          })
          setExpenses(Array.isArray(e) ? e : [])
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Error in refresh:', error)
          const errorMessage = error instanceof Error ? error.message : 'Failed to load data'
          setError(errorMessage)
          
          // Set default values to prevent app crash
          setSummary({ 
            year: ym.year, 
            month: ym.month, 
            salary_cents: 0, 
            budget_cents: 0, 
            expense_cents: 0, 
            remaining_cents: 0 
          })
          setExpenses([])
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    fetchData()

    // Cleanup function to prevent state updates if component unmounts or effect re-runs
    return () => {
      isCancelled = true
    }
  }, [ym])

  const refresh = useCallback(async () => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [s, e] = await Promise.all([getSummary(ym), listExpenses(ym)])
        setSummary(s || { 
          year: ym.year, 
          month: ym.month, 
          salary_cents: 0, 
          budget_cents: 0, 
          expense_cents: 0, 
          remaining_cents: 0 
        })
        setExpenses(Array.isArray(e) ? e : [])
      } catch (error) {
        console.error('Error in refresh:', error)
        setError(error instanceof Error ? error.message : 'Unknown error occurred')
        // Set default values to prevent app crash
        setSummary({ year: ym.year, month: ym.month, salary_cents: 0, budget_cents: 0, expense_cents: 0, remaining_cents: 0 })
        setExpenses([])
      } finally {
        setLoading(false)
      }
    }
    await fetchData()
  }, [ym])

  async function saveSalary(){ 
    try {
      await setSalary(ym, Math.round(Number(salary)*100)); 
      setSalaryInput(''); 
      await refresh() 
    } catch (error) {
      console.error('Error saving salary:', error)
      alert('Failed to save salary')
    }
  }
  async function saveBudget(){ 
    try {
      await setBudget(ym, Math.round(Number(budget)*100)); 
      setBudgetInput(''); 
      await refresh() 
    } catch (error) {
      console.error('Error saving budget:', error)
      alert('Failed to save budget')
    }
  }
  async function add(){ 
    try {
      await addExpense({ year: ym.year, month: ym.month, category: form.category, description: form.description, amount_cents: Math.round(Number(form.amount)*100) }); 
      setForm({category:'', description:'', amount:''}); 
      await refresh() 
    } catch (error) {
      console.error('Error adding expense:', error)
      alert('Failed to add expense')
    }
  }

  return (
    <div className="container">
      <h1 className="mb-3">Budget Tracker</h1>
      {error && (
        <div className="alert alert-danger">
          <strong>Error:</strong> {error}
        </div>
      )}
      {loading && (
        <div className="alert alert-info">
          <div className="spinner-border spinner-border-sm me-2" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          Loading data...
        </div>
      )}
      <div className="row g-3 align-items-end">
        <div className="col-auto">
          <label className="form-label">Year</label>
          <input className="form-control" type="number" value={ym.year} onChange={e=> setYm(v=>({...v, year: Number(e.target.value)}))} />
        </div>
        <div className="col-auto">
          <label className="form-label">Month</label>
          <input className="form-control" type="number" min={1} max={12} value={ym.month} onChange={e=> setYm(v=>({...v, month: Number(e.target.value)}))} />
        </div>
      </div>

      <hr/>

      <div className="row g-3">
        <div className="col-md-4">
          <div className="card"><div className="card-body">
            <h5 className="card-title">Summary {ymStr}</h5>
            {summary ? (
              <ul className="list-unstyled">
                <li>Salary: ${cents(summary.salary_cents)}</li>
                <li>Budget: ${cents(summary.budget_cents)}</li>
                <li>Expenses: ${cents(summary.expense_cents)}</li>
                <li><strong>Remaining: ${cents(summary.remaining_cents)}</strong></li>
              </ul>
            ) : (
              <p className="text-muted">No data available</p>
            )}
          </div></div>
        </div>

        <div className="col-md-4">
          <div className="card"><div className="card-body">
            <h5 className="card-title">Set Salary</h5>
            <div className="input-group">
              <span className="input-group-text">$</span>
              <input className="form-control" value={salary} onChange={e=> setSalaryInput(e.target.value)} placeholder="e.g., 3500"/>
              <button className="btn btn-primary" onClick={saveSalary}>Save</button>
            </div>
          </div></div>
          <div className="card mt-3"><div className="card-body">
            <h5 className="card-title">Set Budget</h5>
            <div className="input-group">
              <span className="input-group-text">$</span>
              <input className="form-control" value={budget} onChange={e=> setBudgetInput(e.target.value)} placeholder="e.g., 500"/>
              <button className="btn btn-secondary" onClick={saveBudget}>Save</button>
            </div>
          </div></div>
        </div>

        <div className="col-md-4">
          <div className="card"><div className="card-body">
            <h5 className="card-title">Add Expense</h5>
            <input className="form-control mb-2" placeholder="Category (optional)" value={form.category} onChange={e=> setForm({...form, category: e.target.value})} />
            <input className="form-control mb-2" placeholder="Description" value={form.description} onChange={e=> setForm({...form, description: e.target.value})} />
            <div className="input-group mb-2">
              <span className="input-group-text">$</span>
              <input className="form-control" placeholder="Amount" value={form.amount} onChange={e=> setForm({...form, amount: e.target.value})} />
            </div>
            <button className="btn btn-success" onClick={add}>Add</button>
          </div></div>
        </div>
      </div>

      <hr/>

      <h3>Expenses</h3>
      {expenses && expenses.length > 0 ? (
        <table className="table table-striped">
          <thead>
            <tr><th>ID</th><th>Category</th><th>Description</th><th>Amount</th><th></th></tr>
          </thead>
          <tbody>
            {expenses.map(e=> (
              <tr key={e.id}>
                <td>{e.id}</td>
                <td>{e.category}</td>
                <td>{e.description}</td>
                <td>${cents(e.amount_cents)}</td>
                <td><button className="btn btn-sm btn-outline-danger" onClick={async()=>{ 
                  try {
                    await deleteExpense(e.id); 
                    await refresh(); 
                  } catch (error) {
                    console.error('Error deleting expense:', error)
                    alert('Failed to delete expense')
                  }
                }}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-muted">No expenses found</p>
      )}
    </div>
  )
}
