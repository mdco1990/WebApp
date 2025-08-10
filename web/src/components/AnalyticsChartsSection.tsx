import React from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner } from 'react-bootstrap';
import BudgetOverviewChart from './BudgetOverviewChart';
import SavingsProgressChart from './SavingsProgressChart';
import KpiTrendChart from './KpiTrendChart';
import ManualBudgetDailyChart from './ManualBudgetDailyChart';
import IncomeBreakdownChart from './IncomeBreakdownChart';
import OutcomeBreakdownChart from './OutcomeBreakdownChart';
import type { IncomeSource, OutcomeSource } from '../types/budget';

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
    targetAmount: number;
    currentAmount: number;
    monthlyContribution: number;
  };
  setSavingsTracker: (tracker: any) => void;
  currentDate: Date;
  manualBudget: {
    bankAmount: number;
    items: Array<{ amount: number }>;
  };
  formatCurrency: (cents: number) => string;
}

const AnalyticsChartsSection: React.FC<AnalyticsChartsSectionProps> = ({
  isDarkMode,
  dataLoaded,
  predictedBudget,
  savingsTracker,
  setSavingsTracker,
  currentDate,
  manualBudget,
  formatCurrency,
}) => {
  const { t } = useTranslation();

  // Chart data
  const monthShort = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const kpiLabels = monthShort.slice(0, Math.max(8, currentDate.getMonth() + 1));
  const kpiIncomeSeries = [...Array(kpiLabels.length)].map((_, idx) =>
    idx < kpiLabels.length - 1
      ? [4200, 4150, 4300, 4250, 4180, 4220, 4280][idx % 7]
      : predictedBudget.totalIncome / 100
  );
  const kpiOutcomeSeries = [...Array(kpiLabels.length)].map((_, idx) =>
    idx < kpiLabels.length - 1
      ? [2800, 2950, 3100, 2875, 2920, 3050, 2980][idx % 7]
      : predictedBudget.totalOutcome / 100
  );

  return (
    <div className="row">
      {/* Income Sources Pie Chart */}
      <div className="col-lg-6 mb-4">
        <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
          <div className="card-header">
            <h3>{t('section.incomeBreakdown')}</h3>
          </div>
          <div className="card-body">
            <div style={{ height: '300px' }}>
              {predictedBudget.incomeSources.length > 0 ? (
                <IncomeBreakdownChart
                  isDarkMode={isDarkMode}
                  items={predictedBudget.incomeSources}
                  formatCurrency={formatCurrency}
                />
              ) : (
                <div className="text-center text-muted pt-5">
                  <p>No income sources available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Outcome Sources Pie Chart */}
      <div className="col-lg-6 mb-4">
        <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
          <div className="card-header">
            <h3>Outcome Sources Breakdown</h3>
          </div>
          <div className="card-body">
            <div style={{ height: '300px' }}>
              {predictedBudget.outcomeSources.length > 0 ? (
                <OutcomeBreakdownChart
                  isDarkMode={isDarkMode}
                  items={predictedBudget.outcomeSources}
                  formatCurrency={formatCurrency}
                />
              ) : (
                <div className="text-center text-muted pt-5">
                  <p>No outcome sources available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Budget Overview Chart */}
      <div className="col-lg-6 mb-4">
        <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
          <div className="card-header">
            <h3>{t('section.budgetOverview')}</h3>
          </div>
          <div className="card-body">
            <div style={{ height: '300px' }}>
              {!dataLoaded ? (
                <div
                  className="d-flex justify-content-center align-items-center h-100"
                  aria-busy="true"
                  aria-live="polite"
                >
                  <Spinner animation="border" />
                </div>
              ) : (
                <BudgetOverviewChart
                  isDarkMode={isDarkMode}
                  labels={[t('label.totalIncomes'), t('label.totalOutcomes')]}
                  data={[predictedBudget.totalIncome / 100, predictedBudget.totalOutcome / 100]}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Savings Tracker */}
      <div className="col-xl-6 col-lg-12 mb-4">
        <div className={`card h-100 ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
          <div className="card-header">
            <h3>{t('section.savings')}</h3>
          </div>
          <div className="card-body">
            <div className="row g-3 mb-3">
              <div className="col-md-6 col-12">
                <label className="form-label">{t('label.targetAmount')}</label>
                <input
                  type="number"
                  className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                  value={savingsTracker.targetAmount}
                  onChange={(e) =>
                    setSavingsTracker({
                      ...savingsTracker,
                      targetAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  inputMode="decimal"
                  step="0.01"
                />
              </div>
              <div className="col-md-6 col-12">
                <label className="form-label">{t('label.currentAmount')}</label>
                <input
                  type="number"
                  className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                  value={savingsTracker.currentAmount}
                  onChange={(e) =>
                    setSavingsTracker({
                      ...savingsTracker,
                      currentAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  inputMode="decimal"
                  step="0.01"
                />
              </div>
            </div>
            <div className="row g-3 mb-3">
              <div className="col-md-6 col-12">
                <label className="form-label">{t('label.monthlyContribution')}</label>
                <input
                  type="number"
                  className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                  value={savingsTracker.monthlyContribution}
                  onChange={(e) =>
                    setSavingsTracker({
                      ...savingsTracker,
                      monthlyContribution: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="col-md-6 col-12">
                <div className="form-label">{t('label.monthsToTarget')}</div>
                <div className="form-control-plaintext">
                  {Math.ceil(
                    (savingsTracker.targetAmount - savingsTracker.currentAmount) /
                      Math.max(savingsTracker.monthlyContribution, 1)
                  )}{' '}
                  months
                </div>
              </div>
            </div>
            <div style={{ height: '200px' }}>
              {!dataLoaded ? (
                <div
                  className="d-flex justify-content-center align-items-center h-100"
                  aria-busy="true"
                  aria-live="polite"
                >
                  <Spinner animation="border" />
                </div>
              ) : (
                <SavingsProgressChart
                  isDarkMode={isDarkMode}
                  currentAmount={savingsTracker.currentAmount}
                  targetAmount={savingsTracker.targetAmount}
                  formatCurrency={formatCurrency}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI: Income vs Outcomes Trend */}
      <div className="col-12 mb-4">
        <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
          <div className="card-header">
            <h3>{t('section.kpiTrend', { defaultValue: 'Income vs Outcomes Trend' })}</h3>
          </div>
          <div className="card-body">
            <div style={{ height: '300px' }}>
              {!dataLoaded ? (
                <div className="d-flex justify-content-center align-items-center h-100">
                  <Spinner animation="border" />
                </div>
              ) : (
                <KpiTrendChart
                  isDarkMode={isDarkMode}
                  labels={kpiLabels}
                  incomeSeries={kpiIncomeSeries}
                  outcomeSeries={kpiOutcomeSeries}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Budget Daily Series */}
      <div className="col-12 mb-4">
        <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
          <div className="card-header">
            <h3>
              {t('section.manualBudgetDaily', { defaultValue: 'Manual Budget (Daily Series)' })}
            </h3>
          </div>
          <div className="card-body">
            <div style={{ height: '300px' }}>
              {!dataLoaded ? (
                <div
                  className="d-flex justify-content-center align-items-center h-100"
                  aria-busy="true"
                  aria-live="polite"
                >
                  <Spinner animation="border" />
                </div>
              ) : (
                <ManualBudgetDailyChart
                  isDarkMode={isDarkMode}
                  year={currentDate.getFullYear()}
                  monthIndex0={currentDate.getMonth()}
                  bankAmount={manualBudget.bankAmount}
                  itemsTotal={manualBudget.items.reduce((s, i) => s + (i.amount || 0), 0)}
                />
              )}
            </div>
            <div className="text-muted small mt-2">
              {t('label.noteDailySeries') ??
                'Note: series are plotted per day. Items are planned totals (no dates), so lines are flat unless values change.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsChartsSection;
