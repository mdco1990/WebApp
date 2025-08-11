import React from 'react';
import { useTranslation } from 'react-i18next';
import IncomeSources from './IncomeSources';
import OutcomeSources from './OutcomeSources';
import type { IncomeSource as IncomeItem, OutcomeSource as OutcomeItem } from '../types/budget';

interface Props {
  isDarkMode: boolean;
  title: string;
  monthLabel: string;
  // Lists
  incomeSources: IncomeItem[];
  outcomeSources: OutcomeItem[];
  // Formatting & parsing
  parseLocaleAmount: (v: string) => number;
  formatCurrency: (cents: number) => string;
  // Income handlers
  onIncomeUpdate: (index: number, next: IncomeItem) => void;
  onIncomeBlurSave: (index: number) => void;
  onIncomeRemoveUnsaved: (index: number) => void;
  onIncomeDeletePersisted: (id: number) => Promise<void>;
  onIncomeAddEmpty: () => void;
  // Outcome handlers
  onOutcomeUpdate: (index: number, next: OutcomeItem) => void;
  onOutcomeBlurSave: (index: number) => void;
  onOutcomeRemoveUnsaved: (index: number) => void;
  onOutcomeDeletePersisted: (id: number) => Promise<void>;
  onOutcomeAddEmpty: () => void;
  // Summary
  totalIncome: number;
  totalOutcome: number;
  difference: number;
  totalIncomeLabel: string;
  totalOutcomeLabel: string;
  differenceLabel: string;
  incomeHelp?: string;
  outcomeHelp?: string;
}

const PlanningSection: React.FC<Props> = ({
  isDarkMode,
  title,
  monthLabel,
  incomeSources,
  outcomeSources,
  parseLocaleAmount,
  formatCurrency,
  onIncomeUpdate,
  onIncomeBlurSave,
  onIncomeRemoveUnsaved,
  onIncomeDeletePersisted,
  onIncomeAddEmpty,
  onOutcomeUpdate,
  onOutcomeBlurSave,
  onOutcomeRemoveUnsaved,
  onOutcomeDeletePersisted,
  onOutcomeAddEmpty,
  totalIncome,
  totalOutcome,
  difference,
  totalIncomeLabel,
  totalOutcomeLabel,
  differenceLabel,
  incomeHelp,
  outcomeHelp,
}) => {
  const { t } = useTranslation();
  return (
    <div className="row">
      <div className="col-lg-12 mb-4">
        <div className={`card h-100 ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
          <div className="card-header d-flex align-items-center justify-content-between">
            <h3 className="mb-0">{title}</h3>
            <span className="badge bg-secondary">{monthLabel}</span>
          </div>
          <div className="card-body">
            <div className="row">
              <IncomeSources
                title=""
                helpText={incomeHelp}
                sources={incomeSources}
                isDarkMode={isDarkMode}
                parseLocaleAmount={parseLocaleAmount}
                onUpdate={onIncomeUpdate}
                onBlurSave={onIncomeBlurSave}
                onRemoveUnsaved={onIncomeRemoveUnsaved}
                onDeletePersisted={onIncomeDeletePersisted}
                onAddEmpty={onIncomeAddEmpty}
                addButtonText={t('btn.addIncomeSource', { defaultValue: '+ Add Income Source' })}
              />

              <OutcomeSources
                title=""
                helpText={outcomeHelp}
                sources={outcomeSources}
                isDarkMode={isDarkMode}
                parseLocaleAmount={parseLocaleAmount}
                onUpdate={onOutcomeUpdate}
                onBlurSave={onOutcomeBlurSave}
                onRemoveUnsaved={onOutcomeRemoveUnsaved}
                onDeletePersisted={onOutcomeDeletePersisted}
                onAddEmpty={onOutcomeAddEmpty}
                addButtonText={t('btn.addOutcomeSource', { defaultValue: '+ Add Outcome Source' })}
              />
            </div>

            {/* Summary */}
            <div className="row g-2">
              <div className="col-md-4 col-12">
                <div className="text-center">
                  <strong>{totalIncomeLabel}</strong>
                  <div className="h5 text-success">{formatCurrency(totalIncome)}</div>
                </div>
              </div>
              <div className="col-md-4 col-12">
                <div className="text-center">
                  <strong>{totalOutcomeLabel}</strong>
                  <div className="h5 text-warning">{formatCurrency(totalOutcome)}</div>
                </div>
              </div>
              <div className="col-md-4 col-12">
                <div className="text-center">
                  <strong>{differenceLabel}</strong>
                  <div className={`h5 ${difference >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatCurrency(difference)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanningSection;
