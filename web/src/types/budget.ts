// Shared frontend types for budget app

export type YearMonth = { year: number; month: number };

export interface IncomeSource {
  id?: number;
  // client_id is a frontend-only stable identifier for unsaved (not yet persisted) rows
  client_id?: string;
  user_id?: number;
  name: string;
  amount_cents: number;
  year?: number;
  month?: number;
  created_at?: string;
  updated_at?: string;
}

export interface OutcomeSource {
  id?: number;
  // client_id is a frontend-only stable identifier for unsaved (not yet persisted) rows
  client_id?: string;
  user_id?: number;
  name: string;
  amount_cents: number;
  year?: number;
  month?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Expense {
  id?: number;
  year?: number;
  month?: number;
  description: string;
  amount_cents: number;
  category?: string;
  created_at?: string;
  updated_at?: string;
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
  year_month: {
    year: number;
    month: number;
  };
  year?: number;
  month?: number;
  month_name?: string;
  income_sources: IncomeSource[];
  budget_sources: OutcomeSource[];
  expenses: Expense[];
  total_income_cents?: number;
  total_budget_cents?: number;
  total_expenses_cents?: number;
  remaining_cents?: number;
  summary?: FinancialSummary;
}

export interface FinancialSummary {
  total_income: number;
  total_budget: number;
  total_expenses: number;
  remaining: number;
  categories: Record<string, number>;
}
