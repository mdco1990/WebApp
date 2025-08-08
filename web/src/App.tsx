import { useEffect, useMemo, useState } from 'react'
import { addExpense, deleteExpense, getSummary, listExpenses, setBudget, setSalary, type Expense, type YearMonth } from './api'

function cents(n: number){ return (n/100).toFixed(2) }

export default function App(){
  const today = new Date()
  const [ym, setYm] = useState<YearMonth>({ year: today.getFullYear(), month: today.getMonth()+1 })
  const [summary, setSummary] = useState<any>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [salary, setSalaryInput] = useState('')
  const [budget, setBudgetInput] = useState('')
  const [form, setForm] = useState({ category: '', description: '', amount: '' })
  const ymStr = useMemo(()=> `${ym.year}-${String(ym.month).padStart(2,'0')}`, [ym])

  useEffect(()=>{ refresh() }, [ym])

  async function refresh(){
    const [s, e] = await Promise.all([getSummary(ym), listExpenses(ym)])
    setSummary(s); setExpenses(e)
  }

  async function saveSalary(){ await setSalary(ym, Math.round(Number(salary)*100)); setSalaryInput(''); await refresh() }
  async function saveBudget(){ await setBudget(ym, Math.round(Number(budget)*100)); setBudgetInput(''); await refresh() }
  async function add(){ await addExpense({ year: ym.year, month: ym.month, category: form.category, description: form.description, amount_cents: Math.round(Number(form.amount)*100) }); setForm({category:'', description:'', amount:''}); await refresh() }

  return (
    <div className="container">
      <h1 className="mb-3">Budget Tracker</h1>
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
            {summary && (
              <ul className="list-unstyled">
                <li>Salary: ${cents(summary.salary_cents)}</li>
                <li>Budget: ${cents(summary.budget_cents)}</li>
                <li>Expenses: ${cents(summary.expense_cents)}</li>
                <li><strong>Remaining: ${cents(summary.remaining_cents)}</strong></li>
              </ul>
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
              <td><button className="btn btn-sm btn-outline-danger" onClick={async()=>{ await deleteExpense(e.id); await refresh(); }}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
