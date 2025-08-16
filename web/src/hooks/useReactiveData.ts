import { useEffect, useCallback, useRef } from 'react';
import { useAppStore, useExpenses, useIncomeSources, useBudgetSources } from '../state/Store';
// import { Expense, IncomeSource, OutcomeSource as BudgetSource } from '../types/budget'; // Not used in this hook

// Reactive hook for expense data with real-time updates
export const useReactiveExpenses = () => {
  const expenses = useExpenses();
  const { updateExpenseStream, addEvent } = useAppStore();
  const lastUpdateRef = useRef<number>(0);

  // Update stream when expenses change
  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current > 100) { // Debounce updates
      updateExpenseStream(expenses);
      lastUpdateRef.current = now;
      
      addEvent('expense_stream_updated', {
        count: expenses.length,
        timestamp: new Date().toISOString(),
      });
    }
  }, [expenses, updateExpenseStream, addEvent]);

  return expenses;
};

// Reactive hook for income data
export const useReactiveIncome = () => {
  const incomeSources = useIncomeSources();
  const { updateIncomeStream, addEvent } = useAppStore();
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current > 100) {
      updateIncomeStream(incomeSources);
      lastUpdateRef.current = now;
      
      addEvent('income_stream_updated', {
        count: incomeSources.length,
        timestamp: new Date().toISOString(),
      });
    }
  }, [incomeSources, updateIncomeStream, addEvent]);

  return incomeSources;
};

// Reactive hook for budget data
export const useReactiveBudget = () => {
  const budgetSources = useBudgetSources();
  const { updateBudgetStream, addEvent } = useAppStore();
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current > 100) {
      updateBudgetStream(budgetSources);
      lastUpdateRef.current = now;
      
      addEvent('budget_stream_updated', {
        count: budgetSources.length,
        timestamp: new Date().toISOString(),
      });
    }
  }, [budgetSources, updateBudgetStream, addEvent]);

  return budgetSources;
};

// Reactive hook for expense analytics with memoization
export const useReactiveExpenseAnalytics = () => {
  const expenses = useReactiveExpenses();
  const { addEvent } = useAppStore();

  const analytics = useCallback(() => {
    if (expenses.length === 0) {
      return {
        total: 0,
        average: 0,
        categoryBreakdown: {},
        topCategories: [],
        recentExpenses: [],
      };
    }

    const total = expenses.reduce((sum, expense) => sum + expense.amount_cents, 0);
    const average = total / expenses.length;
    
    const categoryBreakdown = expenses.reduce((acc, expense) => {
      if (expense.category) {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount_cents;
      }
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryBreakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({ category, amount }));

    const recentExpenses = expenses
      .sort((a, b) => {
        const dateA = new Date(a.year || new Date().getFullYear(), (a.month || new Date().getMonth() + 1) - 1);
        const dateB = new Date(b.year || new Date().getFullYear(), (b.month || new Date().getMonth() + 1) - 1);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 10);

    return {
      total,
      average,
      categoryBreakdown,
      topCategories,
      recentExpenses,
    };
  }, [expenses]);

  // Log analytics updates
  useEffect(() => {
    const currentAnalytics = analytics();
    addEvent('analytics_updated', {
      total: currentAnalytics.total,
      average: currentAnalytics.average,
      categoryCount: Object.keys(currentAnalytics.categoryBreakdown).length,
    });
  }, [analytics, addEvent]);

  return analytics();
};

// Reactive hook for financial summary
export const useReactiveFinancialSummary = () => {
  const expenses = useReactiveExpenses();
  const incomeSources = useReactiveIncome();
  const budgetSources = useReactiveBudget();
  const { addEvent } = useAppStore();

  const summary = useCallback(() => {
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount_cents, 0);
    const totalIncome = incomeSources.reduce((sum, income) => sum + income.amount_cents, 0);
    const totalBudget = budgetSources.reduce((sum, budget) => sum + budget.amount_cents, 0);
    const remaining = totalIncome + totalBudget - totalExpenses;

    return {
      totalExpenses,
      totalIncome,
      totalBudget,
      remaining,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
      budgetUtilization: totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0,
    };
  }, [expenses, incomeSources, budgetSources]);

  // Log summary updates
  useEffect(() => {
    const currentSummary = summary();
    addEvent('financial_summary_updated', {
      remaining: currentSummary.remaining,
      savingsRate: currentSummary.savingsRate,
      budgetUtilization: currentSummary.budgetUtilization,
    });
  }, [summary, addEvent]);

  return summary();
};

// Reactive hook for filtered expenses with search
export const useReactiveFilteredExpenses = (searchTerm: string = '', categoryFilter: string = '') => {
  const expenses = useReactiveExpenses();
  const { addEvent } = useAppStore();

  const filteredExpenses = useCallback(() => {
    let filtered = expenses;

    if (searchTerm) {
      filtered = filtered.filter(expense =>
        expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (expense.category && expense.category.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(expense =>
        expense.category && expense.category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    return filtered;
  }, [expenses, searchTerm, categoryFilter]);

  // Log filter updates
  useEffect(() => {
    const filtered = filteredExpenses();
    addEvent('expenses_filtered', {
      searchTerm,
      categoryFilter,
      originalCount: expenses.length,
      filteredCount: filtered.length,
    });
  }, [filteredExpenses, searchTerm, categoryFilter, expenses.length, addEvent]);

  return filteredExpenses();
};

// Reactive hook for expense trends
export const useReactiveExpenseTrends = (days: number = 30) => {
  const expenses = useReactiveExpenses();
  const { addEvent } = useAppStore();

  const trends = useCallback(() => {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    const recentExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.year || new Date().getFullYear(), (expense.month || new Date().getMonth() + 1) - 1);
      return expenseDate >= cutoffDate;
    });

    // Group by date
    const dailyTotals = recentExpenses.reduce((acc, expense) => {
      const expenseDate = new Date(expense.year || new Date().getFullYear(), (expense.month || new Date().getMonth() + 1) - 1);
      const date = expenseDate.toDateString();
      acc[date] = (acc[date] || 0) + expense.amount_cents;
      return acc;
    }, {} as Record<string, number>);

    // Calculate trend
    const dates = Object.keys(dailyTotals).sort();
    const values = dates.map(date => dailyTotals[date]);
    
    let trend = 0;
    if (values.length > 1) {
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
      trend = secondAvg - firstAvg;
    }

    return {
      dailyTotals,
      trend,
      averageDaily: values.reduce((sum, val) => sum + val, 0) / values.length,
      totalPeriod: values.reduce((sum, val) => sum + val, 0),
    };
  }, [expenses, days]);

  // Log trend updates
  useEffect(() => {
    const currentTrends = trends();
    addEvent('expense_trends_updated', {
      days,
      trend: currentTrends.trend,
      averageDaily: currentTrends.averageDaily,
      totalPeriod: currentTrends.totalPeriod,
    });
  }, [trends, days, addEvent]);

  return trends();
};

// Reactive hook for category insights
export const useReactiveCategoryInsights = () => {
  const expenses = useReactiveExpenses();
  const { addEvent } = useAppStore();

  const insights = useCallback(() => {
    const categoryStats = expenses.reduce((acc, expense) => {
      if (expense.category) {
        if (!acc[expense.category]) {
          acc[expense.category] = {
            total: 0,
            count: 0,
            average: 0,
            min: Infinity,
            max: 0,
          };
        }
        
        acc[expense.category].total += expense.amount_cents;
        acc[expense.category].count += 1;
        acc[expense.category].min = Math.min(acc[expense.category].min, expense.amount_cents);
        acc[expense.category].max = Math.max(acc[expense.category].max, expense.amount_cents);
      }
      
      return acc;
    }, {} as Record<string, { total: number; count: number; average: number; min: number; max: number }>);

    // Calculate averages
    Object.values(categoryStats).forEach(stat => {
      stat.average = stat.total / stat.count;
    });

    // Find top spending categories
    const topCategories = Object.entries(categoryStats)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 5);

    // Find most frequent categories
    const frequentCategories = Object.entries(categoryStats)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5);

    return {
      categoryStats,
      topCategories,
      frequentCategories,
      totalCategories: Object.keys(categoryStats).length,
    };
  }, [expenses]);

  // Log insights updates
  useEffect(() => {
    const currentInsights = insights();
    addEvent('category_insights_updated', {
      totalCategories: currentInsights.totalCategories,
      topCategory: currentInsights.topCategories[0]?.[0],
      topCategoryAmount: currentInsights.topCategories[0]?.[1].total,
    });
  }, [insights, addEvent]);

  return insights();
};

// Reactive hook for budget vs actual comparison
export const useReactiveBudgetComparison = () => {
  const expenses = useReactiveExpenses();
  const budgetSources = useReactiveBudget();
  const { addEvent } = useAppStore();

  const comparison = useCallback(() => {
    const expenseByCategory = expenses.reduce((acc, expense) => {
      if (expense.category) {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount_cents;
      }
      return acc;
    }, {} as Record<string, number>);

    const budgetByCategory = budgetSources.reduce((acc, budget) => {
      acc[budget.name] = (acc[budget.name] || 0) + budget.amount_cents;
      return acc;
    }, {} as Record<string, number>);

    const comparisons = Object.keys(expenseByCategory).map(category => {
      const actual = expenseByCategory[category];
      const budgeted = budgetByCategory[category] || 0;
      const variance = budgeted - actual;
      const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0;

      return {
        category,
        actual,
        budgeted,
        variance,
        variancePercent,
        status: variance >= 0 ? 'under_budget' : 'over_budget',
      };
    });

    const totalActual = Object.values(expenseByCategory).reduce((sum, val) => sum + val, 0);
    const totalBudgeted = Object.values(budgetByCategory).reduce((sum, val) => sum + val, 0);
    const totalVariance = totalBudgeted - totalActual;

    return {
      comparisons,
      totalActual,
      totalBudgeted,
      totalVariance,
      overallStatus: totalVariance >= 0 ? 'under_budget' : 'over_budget',
    };
  }, [expenses, budgetSources]);

  // Log comparison updates
  useEffect(() => {
    const currentComparison = comparison();
    addEvent('budget_comparison_updated', {
      totalActual: currentComparison.totalActual,
      totalBudgeted: currentComparison.totalBudgeted,
      totalVariance: currentComparison.totalVariance,
      overallStatus: currentComparison.overallStatus,
    });
  }, [comparison, addEvent]);

  return comparison();
};

// Reactive hook for real-time notifications
export const useReactiveNotifications = () => {
  const { events } = useAppStore();
  const notifications = useCallback(() => {
    const recentEvents = events
      .filter(event => {
        const eventTime = new Date(event.timestamp).getTime();
        const now = Date.now();
        return now - eventTime < 5 * 60 * 1000; // Last 5 minutes
      })
      .map(event => ({
        id: event.id,
        type: event.type,
        message: getEventMessage(event),
        timestamp: event.timestamp,
        severity: getEventSeverity(event.type),
      }));

    return recentEvents;
  }, [events]);

  return notifications();
};

// Helper function to get event messages
const getEventMessage = (event: { type: string; data: Record<string, unknown> }) => {
  switch (event.type) {
    case 'expense_added':
      return `Added expense: ${event.data.description}`;
    case 'expense_deleted':
      return `Deleted expense`;
    case 'budget_comparison_updated':
      return `Budget status: ${event.data.overallStatus}`;
    case 'analytics_updated':
      return `Analytics updated`;
    default:
      return `Event: ${event.type}`;
  }
};

// Helper function to get event severity
const getEventSeverity = (eventType: string): 'info' | 'warning' | 'error' | 'success' => {
  switch (eventType) {
    case 'expense_added':
    case 'income_added':
    case 'budget_added':
      return 'success';
    case 'expense_deleted':
    case 'income_deleted':
    case 'budget_deleted':
      return 'warning';
    case 'validation_error':
      return 'error';
    default:
      return 'info';
  }
};