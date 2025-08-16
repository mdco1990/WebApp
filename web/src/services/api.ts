// API Service Layer - Frontend-Backend Integration
// This service layer connects React components to Go backend APIs

// React state management instead of Vue reactivity
// React imports removed as they're not used in this service file
import { EventIntegration } from './EventIntegration';
import { 
  Expense, 
  IncomeSource, 
  OutcomeSource as BudgetSource, 
  MonthlyData,
  FinancialSummary,
  YearMonth as _YearMonth
} from '../types/budget';

// Re-export types for compatibility
export type { Expense, IncomeSource, BudgetSource, MonthlyData, FinancialSummary };

export interface EventMetrics {
  published_events: number;
  handled_events: number;
  failed_events: number;
  active_subscribers: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
const API_TIMEOUT = 10000; // 10 seconds

// API State (will be managed by React hooks in components)
export interface ApiState {
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  metrics: EventMetrics | null;
}

// Default API state
export const defaultApiState: ApiState = {
  loading: false,
  error: null,
  lastUpdated: null,
  metrics: null,
};

// HTTP Client with error handling and retry logic
class ApiClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL: string, timeout: number) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Loading state will be managed by React hooks in components

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      // Last updated will be managed by React hooks in components

      return {
        data,
        success: true,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Error state will be managed by React hooks in components
      
      return {
        error: errorMessage,
        success: false,
      };
    } finally {
      // Loading state will be managed by React hooks in components
    }
  }

  // GET request
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, data: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put<T>(endpoint: string, data: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// API Client instance
const apiClient = new ApiClient(API_BASE_URL, API_TIMEOUT);

// API Service Layer
export class ApiService {
  // Health Check
  static async healthCheck(): Promise<ApiResponse<unknown>> {
    return apiClient.get('/healthz');
  }

  // Manual Budget API
  static async getManualBudget(year: number, month: number): Promise<ApiResponse<unknown>> {
    return apiClient.get(`/api/v1/manual-budget?year=${year}&month=${month}`);
  }

  static async saveManualBudget(year: number, month: number, data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    return apiClient.post('/api/v1/manual-budget', { year, month, ...data });
  }

  // Expense Management
  static async addExpense(expense: Expense, userId: number): Promise<ApiResponse<{ id: number }>> {
    return apiClient.post('/api/v1/expenses', { ...expense, user_id: userId });
  }

  static async listExpenses(year: number, month: number): Promise<ApiResponse<Expense[]>> {
    return apiClient.get(`/api/v1/expenses?year=${year}&month=${month}`);
  }

  static async getExpense(id: number): Promise<ApiResponse<Expense>> {
    return apiClient.get(`/api/v1/expenses/${id}`);
  }

  static async updateExpense(id: number, expense: Partial<Expense>): Promise<ApiResponse<Expense>> {
    return apiClient.put(`/api/v1/expenses/${id}`, expense);
  }

  static async deleteExpense(id: number): Promise<ApiResponse<void>> {
    return apiClient.delete(`/api/v1/expenses/${id}`);
  }

  // Income Source Management
  static async createIncomeSource(incomeSource: Omit<IncomeSource, 'id'>): Promise<ApiResponse<IncomeSource>> {
    return apiClient.post('/api/v1/income-sources', {
      user_id: incomeSource.user_id,
      name: incomeSource.name,
      year: incomeSource.year,
      month: incomeSource.month,
      amount_cents: incomeSource.amount_cents,
    });
  }

  static async getIncomeSources(year: number, month: number): Promise<ApiResponse<IncomeSource[]>> {
    return apiClient.get(`/api/v1/income-sources?year=${year}&month=${month}`);
  }

  // Budget Source Management
  static async createBudgetSource(budgetSource: Omit<BudgetSource, 'id'>): Promise<ApiResponse<BudgetSource>> {
    return apiClient.post('/api/v1/budget-sources', {
      user_id: budgetSource.user_id,
      name: budgetSource.name,
      year: budgetSource.year,
      month: budgetSource.month,
      amount_cents: budgetSource.amount_cents,
    });
  }

  static async getBudgetSources(year: number, month: number): Promise<ApiResponse<BudgetSource[]>> {
    return apiClient.get(`/api/v1/budget-sources?year=${year}&month=${month}`);
  }

  static async updateIncomeSource(
    id: number,
    updates: Partial<IncomeSource>
  ): Promise<ApiResponse<IncomeSource>> {
    return apiClient.put(`/api/v1/income-sources/${id}`, updates);
  }

  static async deleteIncomeSource(id: number): Promise<ApiResponse<void>> {
    return apiClient.delete(`/api/v1/income-sources/${id}`);
  }

  static async updateBudgetSource(
    id: number,
    updates: Partial<BudgetSource>
  ): Promise<ApiResponse<BudgetSource>> {
    return apiClient.put(`/api/v1/budget-sources/${id}`, updates);
  }

  static async deleteBudgetSource(id: number): Promise<ApiResponse<void>> {
    return apiClient.delete(`/api/v1/budget-sources/${id}`);
  }

  // Monthly Data (Concurrent)
  static async getMonthlyData(year: number, month: number): Promise<ApiResponse<MonthlyData>> {
    return apiClient.get(`/api/v1/monthly-data?year=${year}&month=${month}`);
  }

  // Event Metrics
  static async getEventMetrics(): Promise<ApiResponse<EventMetrics>> {
    const response = await apiClient.get<EventMetrics>('/api/v1/events/metrics');
    // Metrics will be managed by React hooks in components
    return response;
  }

  // System Health
  static async publishSystemHealth(
    status: string,
    message: string,
    metrics: Record<string, unknown>
  ): Promise<ApiResponse<void>> {
    return apiClient.post('/api/v1/system/health', {
      status,
      message,
      metrics,
    });
  }



  // Logging and Monitoring
  static async getLogs(limit: number = 100): Promise<ApiResponse<unknown[]>> {
    return apiClient.get(`/api/v1/logs?limit=${limit}`);
  }

  // User Management
  static async getPendingUsers(): Promise<ApiResponse<unknown[]>> {
    return apiClient.get('/api/v1/users/pending');
  }

  static async getAllUsers(): Promise<ApiResponse<unknown[]>> {
    return apiClient.get('/api/v1/users');
  }

  static async approveUser(userId: number): Promise<ApiResponse<void>> {
    return apiClient.post(`/api/v1/users/${userId}/approve`, {});
  }

  static async rejectUser(userId: number): Promise<ApiResponse<void>> {
    return apiClient.post(`/api/v1/users/${userId}/reject`, {});
  }

  static async deleteUser(userId: number): Promise<ApiResponse<void>> {
    return apiClient.delete(`/api/v1/users/${userId}`);
  }
}

// Data Store for Frontend-Backend Integration
export class DataStore {
  private static instance: DataStore;
  private data = {
    monthlyData: null as MonthlyData | null,
    expenses: [] as Expense[],
    incomeSources: [] as IncomeSource[],
    budgetSources: [] as BudgetSource[],
    summary: null as FinancialSummary | null,
  };

  private constructor() {}

  static getInstance(): DataStore {
    if (!DataStore.instance) {
      DataStore.instance = new DataStore();
    }
    return DataStore.instance;
  }

  // Getters
  get monthlyData() {
    return this.data.monthlyData;
  }

  get expenses() {
    return this.data.expenses;
  }

  get incomeSources() {
    return this.data.incomeSources;
  }

  get budgetSources() {
    return this.data.budgetSources;
  }

  get summary() {
    return this.data.summary;
  }

  // Data update methods
  updateMonthlyData(data: MonthlyData) {
    this.data.monthlyData = data;
    this.data.expenses = data.expenses;
    this.data.incomeSources = data.income_sources;
    this.data.budgetSources = data.budget_sources;
    this.data.summary = data.summary || null;
  }

  addExpense(expense: Expense) {
    this.data.expenses.push(expense);
    this.updateSummary();
  }

  updateExpense(updatedExpense: Expense) {
    const index = this.data.expenses.findIndex(e => e.id === updatedExpense.id);
    if (index !== -1) {
      this.data.expenses[index] = updatedExpense;
      this.updateSummary();
    }
  }

  removeExpense(expenseId: number) {
    this.data.expenses = this.data.expenses.filter(e => e.id !== expenseId);
    this.updateSummary();
  }

  private updateSummary() {
    if (this.data.monthlyData) {
      const totalExpenses = this.data.expenses.reduce((sum, e) => sum + e.amount_cents, 0);
      const totalIncome = this.data.incomeSources.reduce((sum, i) => sum + i.amount_cents, 0);
      const totalBudget = this.data.budgetSources.reduce((sum, b) => sum + b.amount_cents, 0);

      const categories: Record<string, number> = {};
      this.data.expenses.forEach(expense => {
        const category = expense.category || 'uncategorized';
        categories[category] = (categories[category] || 0) + expense.amount_cents;
      });

      this.data.summary = {
        total_income: totalIncome,
        total_budget: totalBudget,
        total_expenses: totalExpenses,
        remaining: totalBudget - totalExpenses,
        categories,
      };
    }
  }
}

// EventIntegration is now imported from './EventIntegration'

// Custom hooks for React integration
export const useApi = () => {
  return {
    // API methods
    healthCheck: ApiService.healthCheck,
    getManualBudget: ApiService.getManualBudget,
    saveManualBudget: ApiService.saveManualBudget,
    addExpense: ApiService.addExpense,
    listExpenses: ApiService.listExpenses,
    getExpense: ApiService.getExpense,
    updateExpense: ApiService.updateExpense,
    deleteExpense: ApiService.deleteExpense,
    createIncomeSource: ApiService.createIncomeSource,
    getIncomeSources: ApiService.getIncomeSources,
    createBudgetSource: ApiService.createBudgetSource,
    getBudgetSources: ApiService.getBudgetSources,
    getMonthlyData: ApiService.getMonthlyData,
    getEventMetrics: ApiService.getEventMetrics,
    publishSystemHealth: ApiService.publishSystemHealth,
    getLogs: ApiService.getLogs,
    getPendingUsers: ApiService.getPendingUsers,
    getAllUsers: ApiService.getAllUsers,
    approveUser: ApiService.approveUser,
    rejectUser: ApiService.rejectUser,
    deleteUser: ApiService.deleteUser,

    // Data store
    dataStore: DataStore.getInstance(),

    // Event integration
    EventIntegration,
  };
};

// Export default API service
export default ApiService;
