// Integrated Dashboard Component
// Demonstrates frontend-backend integration using all implemented patterns

import React, { useCallback, useMemo, useEffect } from 'react';
import { useExpenses } from '../hooks/useExpenses';
import { useIncomeSources } from '../hooks/useIncomeSources';
import { useBudgetSources } from '../hooks/useBudgetSources';
import { useManualBudget, useEventMetrics, useSystemHealth, useHealthCheck } from '../hooks/useApi';
import { useMonthlyData } from '../hooks/useMonthlyData';
import { useBackgroundTask } from '../hooks/useBackgroundTask';
import { useOptimisticMonthlyData } from '../hooks/useOptimisticMonthlyData';
import { useEventIntegration } from '../hooks/useEventIntegration';
import { useFinancialCalculations } from '../hooks/useFinancialCalculations';
import { useDashboardData } from '../hooks/useDashboardData';
import { useEventIntegrationSetup } from '../hooks/useEventIntegrationSetup';
import { IntegratedDashboardComponents } from './IntegratedDashboardComponents';
import { IntegratedDashboardForms } from './IntegratedDashboardForms';
import { IntegratedDashboardLists } from './IntegratedDashboardLists';
import { IntegratedDashboardData } from './IntegratedDashboardData';
import { MonthlyData, Expense, IncomeSource, OutcomeSource as BudgetSource, FinancialSummary } from '../types/budget';
import { EventMetrics } from '../types/events';
import { DashboardErrorDisplay } from './DashboardErrorDisplay';

interface IntegratedDashboardProps {
  year: number;
  month: number;
}

export function IntegratedDashboard({ year = 2024, month = 1 }: IntegratedDashboardProps) {
  // Get monthly data
  const monthlyData = useMonthlyData();
  
  // Get individual data sources
  const expenses = useExpenses(year, month);
  const incomeSources = useIncomeSources(year, month);
  const budgetSources = useBudgetSources(year, month);
  
  // Get additional data
  const manualBudget = useManualBudget(year, month);
  const eventMetrics = useEventMetrics();
  const systemHealth = useSystemHealth();
  const healthCheck = useHealthCheck();
  
  // Get integration hooks
  const backgroundTask = useBackgroundTask();
  const optimisticData = useOptimisticMonthlyData();
  const eventIntegration = useEventIntegration();
  useEventIntegrationSetup();
  
  // Calculate financial metrics
  const formatCurrency = useCallback((cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  }, []);

  const calculations = useFinancialCalculations(
    expenses.expenses || [],
    incomeSources.incomeSources || [],
    budgetSources.budgetSources || []
  );

  const dataStore = useDashboardData(
    monthlyData.data,
    expenses.expenses || [],
    incomeSources.incomeSources || [],
    budgetSources.budgetSources || []
  );

  // Auto-load data when year/month changes
  useEffect(() => {
    expenses.loadExpenses();
    incomeSources.loadIncomeSources();
    budgetSources.loadBudgetSources();
    healthCheck.checkHealth();
  }, [year, month, expenses.loadExpenses, incomeSources.loadIncomeSources, budgetSources.loadBudgetSources, healthCheck.checkHealth]);

  return (
    <div className="container-fluid py-4">
      <div className="integrated-dashboard">
        <h1>Integrated Dashboard - {year}/{month.toString().padStart(2, '0')}</h1>

        <IntegratedDashboardComponents.HealthStatus 
          healthCheck={{
            healthStatus: Boolean(healthCheck.healthStatus),
            loading: healthCheck.loading,
            checkHealth: healthCheck.checkHealth
          }}
          eventIntegration={eventIntegration} 
        />
        
        <IntegratedDashboardComponents.EventMetrics 
          eventMetrics={{
            metrics: eventMetrics.metrics as unknown as Record<string, unknown>,
            loading: eventMetrics.loading,
            loadEventMetrics: eventMetrics.loadEventMetrics
          }}
        />

        <IntegratedDashboardComponents.FinancialSummary 
          totalExpenses={calculations.totalExpenses}
          totalIncome={calculations.totalIncome}
          totalBudget={calculations.totalBudget}
          remaining={calculations.remaining}
          formatCurrency={formatCurrency}
        />

        <IntegratedDashboardForms
          expenses={expenses}
          incomeSources={{
            ...incomeSources,
            createIncomeSource: async (userId: number, name: string, amountCents: number) => {
              const incomeSource: Omit<IncomeSource, 'id'> = {
                user_id: userId,
                name,
                year,
                month,
                amount_cents: amountCents,
              };
              return await incomeSources.addIncomeSource(incomeSource);
            }
          }}
          budgetSources={{
            ...budgetSources,
            createBudgetSource: async (userId: number, name: string, amountCents: number) => {
              const budgetSource: Omit<BudgetSource, 'id'> = {
                user_id: userId,
                name,
                year,
                month,
                amount_cents: amountCents,
              };
              return await budgetSources.addBudgetSource(budgetSource);
            }
          }}
          year={year}
          month={month}
          userId={1}
          systemHealth={{
            publishSystemHealth: systemHealth.publishSystemHealth
          }}
        />

        <IntegratedDashboardLists
          expenses={{
            loading: expenses.loading,
            expenses: expenses.expenses?.map(exp => ({
              id: exp.id ?? 0,
              description: exp.description,
              amount_cents: exp.amount_cents,
              category: exp.category ?? ''
            })) || [],
            deleteExpense: async (id: number) => {
              await expenses.deleteExpense(id);
              return true;
            }
          }}
          incomeSources={{
            loading: incomeSources.loading,
            incomeSources: incomeSources.incomeSources?.map(inc => ({
              id: inc.id ?? 0,
              name: inc.name,
              amount_cents: inc.amount_cents
            })) || [],
            deleteIncomeSource: async (id: number) => {
              await incomeSources.deleteIncomeSource(id);
              return true;
            }
          }}
          budgetSources={{
            loading: budgetSources.loading,
            budgetSources: budgetSources.budgetSources?.map(bud => ({
              id: bud.id ?? 0,
              name: bud.name,
              amount_cents: bud.amount_cents
            })) || [],
            deleteBudgetSource: async (id: number) => {
              await budgetSources.deleteBudgetSource(id);
              return true;
            }
          }}
          formatCurrency={formatCurrency}
        />

        <IntegratedDashboardData
          monthlyData={{
            loading: monthlyData.loading,
            error: monthlyData.error,
            monthlyData: monthlyData.data
          }}
          formatCurrency={formatCurrency}
          manualBudget={{
            loading: manualBudget.loading,
            error: manualBudget.error,
            manualBudget: manualBudget.manualBudget as { bank_amount_cents: number; items?: { name: string; amount_cents: number; }[] } | null
          }}
          dataStore={{
            monthlyData: dataStore.monthlyData as unknown,
            expenses: dataStore.expenses as unknown[],
            incomeSources: dataStore.incomeSources as unknown[],
            budgetSources: dataStore.budgetSources as unknown[],
            summary: dataStore.summary as { total_income: number; total_budget: number; total_expenses: number; remaining: number } | undefined
          }}
        />

        <DashboardErrorDisplay 
          errors={[
            expenses.error,
            incomeSources.error,
            budgetSources.error,
            manualBudget.error,
            eventMetrics.error,
            healthCheck.error
          ].filter(Boolean)}
        />
      </div>
    </div>
  );
}