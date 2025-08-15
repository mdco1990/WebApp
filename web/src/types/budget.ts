// Shared frontend types for budget app

export type YearMonth = { year: number; month: number };

export interface IncomeSource {
  id?: number;
  // client_id is a frontend-only stable identifier for unsaved (not yet persisted) rows
  client_id?: string;
  name: string;
  amount_cents: number;
}

export interface OutcomeSource {
  id?: number;
  // client_id is a frontend-only stable identifier for unsaved (not yet persisted) rows
  client_id?: string;
  name: string;
  amount_cents: number;
}

export interface Expense {
  id: number;
  year?: number;
  month?: number;
  description: string;
  amount_cents: number;
  category?: string;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  is_admin?: boolean;
}

export interface LoginData {
  success: boolean;
  message: string;
  session_id?: string;
  user?: User;
}

export interface MonthlyData {
  year: number;
  month: number;
  month_name?: string;
  income_sources: IncomeSource[];
  budget_sources: OutcomeSource[];
  expenses: Expense[];
  total_income_cents: number;
  total_budget_cents: number;
  total_expenses_cents: number;
  remaining_cents: number;
}
