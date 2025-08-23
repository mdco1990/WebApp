import React from 'react';
import { randomColor } from '../utils/secureRandom';
import { useTranslation } from 'react-i18next';
import { Spinner } from 'react-bootstrap';
// Charts removed here to avoid duplication (moved to Analytics section)
import type { SavingsCategory } from '../hooks/useBudgetState';

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

type SavingsTracker = {
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  monthsToTarget: number;
  categories: SavingsCategory[];
};

interface SavingsSectionProps {
  isDarkMode: boolean;
  dataLoaded: boolean;
  savingsTracker: SavingsTracker;
  setSavingsTracker: React.Dispatch<React.SetStateAction<SavingsTracker>>;
  formatCurrency: (cents: number) => string;
}

const SavingsSection = React.memo<SavingsSectionProps>(
  ({ isDarkMode, dataLoaded: _dataLoaded, savingsTracker, setSavingsTracker, formatCurrency }) => {
    const { t, i18n } = useTranslation();

    // Memoize all translated labels
    const savingsTitle = React.useMemo(() => t('section.savings'), [t]);
    const targetAmountLabel = React.useMemo(() => t('label.targetAmount'), [t]);
    const currentAmountLabel = React.useMemo(() => t('label.currentAmount'), [t]);
    const monthlyContributionLabel = React.useMemo(() => t('label.monthlyContribution'), [t]);
    const monthsToTargetLabel = React.useMemo(() => t('label.monthsToTarget'), [t]);
    // Legends kept if reintroducing small inline visuals later

    // Category management functions
    const addCategory = () => {
      const newCategory: SavingsCategory = {
        id: Date.now().toString(),
        name: '',
        amount: 0,
        color: randomColor(),
      };
      setSavingsTracker((prev) => ({
        ...prev,
        categories: [...prev.categories, newCategory],
      }));
    };

    const updateCategory = (id: string, updates: Partial<SavingsCategory>) => {
      setSavingsTracker((prev) => ({
        ...prev,
        categories: prev.categories.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat)),
      }));
    };

    const deleteCategory = (id: string) => {
      setSavingsTracker((prev) => ({
        ...prev,
        categories: prev.categories.filter((cat) => cat.id !== id),
      }));
    };

    return (
      <div className="row gy-3">
        {/* Tracker Card */}
        <div className="col-lg-6 col-12">
          <div className={`card h-100 ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
            <div className="card-header py-2 d-flex justify-content-between align-items-center">
              <h6 className="h6 mb-0">{savingsTitle}</h6>
              <span className="badge bg-info text-uppercase">
                {t('label.tracker', { defaultValue: 'Tracker' })}
              </span>
            </div>
            <div className="card-body p-3">
              <p className="text-muted small mb-3">
                {t('section.savings.desc', {
                  defaultValue: 'Track your savings goals and allocations.',
                })}
              </p>
              <div className="row g-2">
                <div className="col-12">
                  <div className="row g-3 mb-3">
                    <div className="col-12">
                      <label className="form-label">{targetAmountLabel}</label>
                      <input
                        type="number"
                        className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                        value={savingsTracker.targetAmount}
                        onChange={(e) => {
                          const next = {
                            ...savingsTracker,
                            targetAmount: parseFloat(e.target.value) || 0,
                          };
                          setSavingsTracker(next);
                        }}
                        inputMode="decimal"
                        step="0.01"
                        placeholder="10000"
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">{currentAmountLabel}</label>
                      <input
                        type="number"
                        className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                        value={savingsTracker.currentAmount}
                        onChange={(e) => {
                          const next = {
                            ...savingsTracker,
                            currentAmount: parseFloat(e.target.value) || 0,
                          };
                          setSavingsTracker(next);
                        }}
                        inputMode="decimal"
                        step="0.01"
                        placeholder="2500"
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">{monthlyContributionLabel}</label>
                      <input
                        type="number"
                        className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                        value={savingsTracker.monthlyContribution}
                        onChange={(e) => {
                          const next = {
                            ...savingsTracker,
                            monthlyContribution: parseFloat(e.target.value) || 0,
                          };
                          setSavingsTracker(next);
                        }}
                        inputMode="decimal"
                        step="0.01"
                        placeholder="500"
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label d-block">{monthsToTargetLabel}</label>
                      <span className="badge bg-secondary">
                        {(() => {
                          const months = Math.ceil(
                            (savingsTracker.targetAmount - savingsTracker.currentAmount) /
                              Math.max(savingsTracker.monthlyContribution, 1)
                          );
                          let label: string;
                          if (i18n.language?.startsWith('fr')) {
                            label = t('label.months', { defaultValue: 'mois' });
                          } else if (months === 1) {
                            label = t('label.month', { defaultValue: 'month' });
                          } else {
                            label = t('label.months', { defaultValue: 'months' });
                          }
                          return `${months} ${label}`;
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Categories Card */}
        <div className="col-lg-6 col-12">
          <div className={`card h-100 ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
            <div className="card-header py-2 d-flex justify-content-between align-items-center">
              <h6 className="h6 mb-0">
                {t('section.savingsCategories', { defaultValue: 'Savings Categories' })}
              </h6>
              <div className="btn-group btn-group-sm">
                <button className="btn btn-outline-primary" onClick={addCategory}>
                  + {t('btn.add', { defaultValue: 'Add' })}
                </button>
                <button
                  className="btn btn-outline-danger"
                  disabled={savingsTracker.categories.length === 0}
                  onClick={() =>
                    deleteCategory(
                      savingsTracker.categories[savingsTracker.categories.length - 1].id
                    )
                  }
                >
                  − {t('btn.remove', { defaultValue: 'Remove' })}
                </button>
              </div>
            </div>
            <div className="card-body p-2">
              <div
                className="table-responsive mb-2"
                style={{ maxHeight: '280px', overflowY: 'auto' }}
              >
                <table className={`table table-sm align-middle ${isDarkMode ? 'table-dark' : ''}`}>
                  <thead className="sticky-top" style={{ top: 0 }}>
                    <tr>
                      <th style={{ width: '40px' }}></th>
                      <th>{t('table.category', { defaultValue: 'Category' })}</th>
                      <th style={{ width: '120px' }}>
                        {t('table.amount', { defaultValue: 'Amount' })}
                      </th>
                      <th style={{ width: '60px' }}>
                        {t('table.action', { defaultValue: 'Action' })}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {savingsTracker.categories.map((cat) => (
                      <tr key={cat.id}>
                        <td>
                          <input
                            type="color"
                            value={cat.color}
                            onChange={(e) => updateCategory(cat.id, { color: e.target.value })}
                            className="form-control form-control-color form-control-sm"
                            style={{ width: '32px' }}
                            title={t('label.color', { defaultValue: 'Color' })}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={cat.name}
                            onChange={(e) => updateCategory(cat.id, { name: e.target.value })}
                            className={`form-control form-control-sm ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                            placeholder={t('placeholder.categoryName', { defaultValue: 'Name' })}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={cat.amount}
                            onChange={(e) =>
                              updateCategory(cat.id, { amount: parseFloat(e.target.value) || 0 })
                            }
                            className={`form-control form-control-sm ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                            step="0.01"
                            placeholder="0.00"
                          />
                        </td>
                        <td>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => deleteCategory(cat.id)}
                            title={t('btn.delete', { defaultValue: 'Delete' })}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                    {savingsTracker.categories.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-3 small">
                          {t('empty.noCategories', {
                            defaultValue: 'No categories yet. Add one to get started!',
                          })}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Summary */}
              {savingsTracker.categories.length > 0 && (
                <div className="small">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">
                      {t('label.totalAllocated', { defaultValue: 'Allocated' })}
                    </span>
                    <strong className="text-info">
                      {formatCurrency(
                        Math.round(
                          savingsTracker.categories.reduce((sum, c) => sum + c.amount, 0) * 100
                        )
                      )}
                    </strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">
                      {t('label.unallocated', { defaultValue: 'Unallocated' })}
                    </span>
                    <strong
                      className={
                        savingsTracker.currentAmount -
                          savingsTracker.categories.reduce((s, c) => s + c.amount, 0) >=
                        0
                          ? 'text-success'
                          : 'text-warning'
                      }
                    >
                      {formatCurrency(
                        Math.round(
                          (savingsTracker.currentAmount -
                            savingsTracker.categories.reduce((s, c) => s + c.amount, 0)) *
                            100
                        )
                      )}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
SavingsSection.displayName = 'SavingsSection';

export default SavingsSection;
