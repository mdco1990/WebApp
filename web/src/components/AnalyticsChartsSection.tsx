import React from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner } from 'react-bootstrap';
import BudgetOverviewChart from './BudgetOverviewChart';
import CurrentMonthBudgetBarChart from './CurrentMonthBudgetBarChart';
import KpiTrendChart from './KpiTrendChart';
import ManualBudgetDailyChart from './ManualBudgetDailyChart';
import IncomeBreakdownChart from './IncomeBreakdownChart';
import OutcomeBreakdownChart from './OutcomeBreakdownChart';
import SavingsProgressChart from './SavingsProgressChart';
import SavingsCategoriesChart from './SavingsCategoriesChart';
import type { IncomeSource, OutcomeSource } from '../types/budget';

// Hoisted helper components to keep stable identities between renders
const Loadable = React.memo<{ loaded: boolean; height?: string; children: React.ReactNode }>(
  ({ loaded, height = '300px', children }) => (
    <div style={{ height }}>
      {loaded ? (
        <>{children}</>
      ) : (
        <div
          className="d-flex justify-content-center align-items-center h-100"
          aria-busy="true"
          aria-live="polite"
        >
          <Spinner animation="border" />
        </div>
      )}
    </div>
  )
);
Loadable.displayName = 'Loadable';

const BreakdownCard = React.memo<{
  title: string;
  isDarkMode: boolean;
  hasItems: boolean;
  emptyText: string;
  children: React.ReactNode;
}>(({ title, isDarkMode, hasItems, emptyText, children }) => (
  <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
    <div className="card-header">
      <h6>{title}</h6>
    </div>
    <div className="card-body">
      <div style={{ height: '300px' }}>
        {hasItems ? (
          <>{children}</>
        ) : (
          <div className="text-center text-muted pt-5">
            <p>{emptyText}</p>
          </div>
        )}
      </div>
    </div>
  </div>
));
BreakdownCard.displayName = 'BreakdownCard';

interface AnalyticsChartsSectionProps {
  isDarkMode: boolean;
  dataLoaded: boolean;
  predictedBudget: {
    incomeSources: IncomeSource[];
    outcomeSources: OutcomeSource[];
    totalIncome: number;
    totalOutcome: number;
  };
  savingsTracker: {
    currentAmount: number;
    targetAmount: number;
    categories: Array<{ id: string; name: string; amount: number; color: string }>;
  };
  currentDate: Date;
  manualBudget: {
    bankAmount: number;
    items: Array<{ amount: number }>;
  };
  formatCurrency: (cents: number) => string;
}

const AnalyticsChartsSection = React.memo<AnalyticsChartsSectionProps>(
  ({
    isDarkMode,
    dataLoaded,
    predictedBudget,
    savingsTracker,
    currentDate,
    manualBudget,
    formatCurrency,
  }) => {
    const { t, i18n } = useTranslation();

    // Loadable hoisted above

    // Chart data
    const monthShort = React.useMemo(() => {
      const locale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';
      return Array.from({ length: 12 }, (_, idx) =>
        new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(2000, idx, 1))
      );
    }, [i18n.language]);
    const kpiLabels = React.useMemo(
      () => monthShort.slice(0, Math.max(8, currentDate.getMonth() + 1)),
      [monthShort, currentDate]
    );
    const kpiIncomeSeries = React.useMemo(
      () =>
        [...Array(kpiLabels.length)].map((_, idx) =>
          idx < kpiLabels.length - 1
            ? [4200, 4150, 4300, 4250, 4180, 4220, 4280][idx % 7]
            : predictedBudget.totalIncome / 100
        ),
      [kpiLabels.length, predictedBudget.totalIncome]
    );
    const kpiOutcomeSeries = React.useMemo(
      () =>
        [...Array(kpiLabels.length)].map((_, idx) =>
          idx < kpiLabels.length - 1
            ? [2800, 2950, 3100, 2875, 2920, 3050, 2980][idx % 7]
            : predictedBudget.totalOutcome / 100
        ),
      [kpiLabels.length, predictedBudget.totalOutcome]
    );

    // BreakdownCard hoisted above

    // Memoize all translated labels and chart props
    const incomeBreakdownTitle = React.useMemo(() => t('section.incomeBreakdown'), [t]);
    const outcomeBreakdownTitle = React.useMemo(() => t('section.outcomeBreakdown'), [t]);
    const budgetOverviewTitle = React.useMemo(() => t('section.budgetOverview'), [t]);
    const budgetOverviewLabels = React.useMemo(
      () => [t('label.totalIncomes'), t('label.totalOutcomes')],
      [t]
    );
    const budgetOverviewLegend = React.useMemo(
      () => t('legend.amount', { defaultValue: 'Amount' }),
      [t]
    );
    const kpiLegendIncome = React.useMemo(
      () => t('legend.predictedIncome', { defaultValue: 'Predicted Income' }),
      [t]
    );
    const kpiLegendOutcome = React.useMemo(
      () => t('legend.predictedOutcomes', { defaultValue: 'Predicted Outcomes' }),
      [t]
    );
    const dailyLegendBank = React.useMemo(() => t('legend.bank', { defaultValue: 'Bank' }), [t]);
    const dailyLegendItems = React.useMemo(
      () => t('legend.itemsTotal', { defaultValue: 'Items Total' }),
      [t]
    );
    const dailyLegendRemaining = React.useMemo(
      () => t('legend.remaining', { defaultValue: 'Remaining' }),
      [t]
    );
    const emptyIncomeText = React.useMemo(() => t('empty.noIncome'), [t]);
    const emptyOutcomeText = React.useMemo(() => t('empty.noOutcome'), [t]);
    const kpiTrendTitle = React.useMemo(
      () => t('section.kpiTrend', { defaultValue: 'Income vs Outcomes Trend' }),
      [t]
    );
    const manualBudgetDailyTitle = React.useMemo(
      () => t('section.manualBudgetDaily', { defaultValue: 'Manual Budget (Daily Series)' }),
      [t]
    );
    const noteDailySeries = React.useMemo(
      () =>
        t('label.noteDailySeries') ??
        'Note: series are plotted per day. Items are planned totals (no dates), so lines are flat unless values change.',
      [t]
    );

    // Memoize chart data arrays
    const budgetOverviewData = React.useMemo(
      () => [predictedBudget.totalIncome / 100, predictedBudget.totalOutcome / 100],
      [predictedBudget.totalIncome, predictedBudget.totalOutcome]
    );
    const manualBudgetItemsTotal = React.useMemo(
      () => manualBudget.items.reduce((s, i) => s + (i.amount || 0), 0),
      [manualBudget.items]
    );

    return (
      <div className="row">
        {/* Income Sources Pie Chart */}
        <div className="col-lg-6 mb-4">
          <BreakdownCard
            title={incomeBreakdownTitle}
            isDarkMode={isDarkMode}
            hasItems={predictedBudget.incomeSources.length > 0}
            emptyText={emptyIncomeText}
          >
            <IncomeBreakdownChart
              isDarkMode={isDarkMode}
              items={predictedBudget.incomeSources}
              formatCurrency={formatCurrency}
            />
          </BreakdownCard>
        </div>

        {/* Outcome Sources Pie Chart */}
        <div className="col-lg-6 mb-4">
          <BreakdownCard
            title={outcomeBreakdownTitle}
            isDarkMode={isDarkMode}
            hasItems={predictedBudget.outcomeSources.length > 0}
            emptyText={emptyOutcomeText}
          >
            <OutcomeBreakdownChart
              isDarkMode={isDarkMode}
              items={predictedBudget.outcomeSources}
              formatCurrency={formatCurrency}
            />
          </BreakdownCard>
        </div>

        {/* Budget Overview Chart */}
        <div className="col-lg-6 mb-4">
          <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
            <div className="card-header">
              <h6>{budgetOverviewTitle}</h6>
            </div>
            <div className="card-body">
              <Loadable loaded={dataLoaded}>
                <BudgetOverviewChart
                  isDarkMode={isDarkMode}
                  labels={budgetOverviewLabels}
                  data={budgetOverviewData}
                  legendLabel={budgetOverviewLegend}
                />
              </Loadable>
            </div>
          </div>
        </div>

        {/* Current Month Budget Bar Chart */}
        <div className="col-lg-6 mb-4">
          <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
            <div className="card-header">
              <h6>{t('section.currentMonthBudget', { defaultValue: 'Current Month Budget' })}</h6>
            </div>
            <div className="card-body">
              <Loadable loaded={dataLoaded}>
                <CurrentMonthBudgetBarChart
                  isDarkMode={isDarkMode}
                  labels={[
                    t('label.bankAmount', { defaultValue: 'Bank' }),
                    t('label.items', { defaultValue: 'Items' }),
                    t('label.remaining', { defaultValue: 'Remaining' }),
                  ]}
                  data={[
                    manualBudget.bankAmount / 100,
                    manualBudgetItemsTotal / 100,
                    (manualBudget.bankAmount + manualBudgetItemsTotal) / 100,
                  ]}
                  legendLabel={t('legend.amount', { defaultValue: 'Amount' })}
                />
              </Loadable>
            </div>
          </div>
        </div>

        {/* KPI: Income vs Outcomes Trend */}
        <div className="col-12 mb-4">
          <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
            <div className="card-header">
              <h6>{kpiTrendTitle}</h6>
            </div>
            <div className="card-body">
              <Loadable loaded={dataLoaded}>
                <KpiTrendChart
                  isDarkMode={isDarkMode}
                  labels={kpiLabels}
                  incomeSeries={kpiIncomeSeries}
                  outcomeSeries={kpiOutcomeSeries}
                  legendIncome={kpiLegendIncome}
                  legendOutcome={kpiLegendOutcome}
                />
              </Loadable>
            </div>
          </div>
        </div>

        {/* Manual Budget Daily Series */}
        <div className="col-12 mb-4">
          <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
            <div className="card-header">
              <h6>{manualBudgetDailyTitle}</h6>
            </div>
            <div className="card-body">
              <Loadable loaded={dataLoaded}>
                <ManualBudgetDailyChart
                  isDarkMode={isDarkMode}
                  year={currentDate.getFullYear()}
                  monthIndex0={currentDate.getMonth()}
                  bankAmount={manualBudget.bankAmount}
                  itemsTotal={manualBudgetItemsTotal}
                  legendBank={dailyLegendBank}
                  legendItemsTotal={dailyLegendItems}
                  legendRemaining={dailyLegendRemaining}
                />
              </Loadable>
              <div className="text-muted small mt-2">{noteDailySeries}</div>
            </div>
          </div>
        </div>

        {/* Savings Progress Chart */}
        <div className="col-lg-6 mb-4">
          <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
            <div className="card-header">
              <h6>{t('section.savingsProgress', { defaultValue: 'Savings Progress' })}</h6>
            </div>
            <div className="card-body">
              <Loadable loaded={dataLoaded}>
                <SavingsProgressChart
                  isDarkMode={isDarkMode}
                  currentAmount={savingsTracker.currentAmount}
                  targetAmount={savingsTracker.targetAmount}
                  formatCurrency={formatCurrency}
                  legendCurrent={t('legend.current', { defaultValue: 'Current' })}
                  legendRemaining={t('legend.remaining', { defaultValue: 'Remaining' })}
                />
              </Loadable>
            </div>
          </div>
        </div>

        {/* Savings Categories Chart */}
        <div className="col-lg-6 mb-4">
          <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
            <div className="card-header">
              <h6>{t('section.savingsCategories', { defaultValue: 'Savings Categories' })}</h6>
            </div>
            <div className="card-body">
              <Loadable loaded={dataLoaded}>
                <SavingsCategoriesChart
                  isDarkMode={isDarkMode}
                  categories={savingsTracker.categories}
                  formatCurrency={formatCurrency}
                />
              </Loadable>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
AnalyticsChartsSection.displayName = 'AnalyticsChartsSection';

export default AnalyticsChartsSection;
