import React from 'react';
import { useTranslation } from 'react-i18next';
import IncomeSources from './IncomeSources';
import OutcomeSources from './OutcomeSources';
import type { IncomeSource as IncomeItem, OutcomeSource as OutcomeItem } from '../types/budget';

interface Props {
  isDarkMode: boolean;
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
    <div className="planning-cards d-flex flex-wrap gap-3">
      {/* Incomes Card */}
      <div className="card flex-grow-1 flex-shrink-0 planning-card-wide">
        <div className="card-header py-1">
          <h6 className="card-title h6 mb-0">
            {t('section.incomes', { defaultValue: 'Incomes' })}
          </h6>
        </div>
        <div className="card-body p-1 small">
          <IncomeSources
            title=""
            helpText={
              incomeHelp ||
              t('section.predictedIncome.desc', {
                defaultValue: 'Manage your expected monthly income streams',
              })
            }
            sources={incomeSources}
            isDarkMode={isDarkMode}
            parseLocaleAmount={parseLocaleAmount}
            onUpdate={onIncomeUpdate}
            onBlurSave={onIncomeBlurSave}
            onRemoveUnsaved={onIncomeRemoveUnsaved}
            onDeletePersisted={onIncomeDeletePersisted}
            onAddEmpty={onIncomeAddEmpty}
            addButtonText={t('btn.addIncomeSource', { defaultValue: '+ Income' })}
          />
        </div>
      </div>
      {/* Summary Card */}
      <div className="card flex-grow-1 flex-shrink-0 planning-card-narrow">
        <div className="card-header py-1 d-flex justify-content-between align-items-center">
          <h6 className="card-title h6 mb-0">
            {t('section.summary', { defaultValue: 'Summary' })}
          </h6>
          <span className="badge bg-secondary">{monthLabel}</span>
        </div>
        <div className="card-body p-1 small">
          <div className="d-flex flex-column gap-2">
            <div className="d-flex justify-content-between">
              <span>{totalIncomeLabel}</span>
              <strong className="text-success">{formatCurrency(totalIncome)}</strong>
            </div>
            <div className="d-flex justify-content-between">
              <span>{totalOutcomeLabel}</span>
              <strong className="text-warning">{formatCurrency(totalOutcome)}</strong>
            </div>
            <div className="d-flex justify-content-between">
              <span>{differenceLabel}</span>
              <strong className={difference >= 0 ? 'text-success' : 'text-danger'}>
                {formatCurrency(difference)}
              </strong>
            </div>
          </div>
          <hr className="my-2" />
          <div className="small text-muted">
            {t('section.predictedBudget.desc', {
              defaultValue: 'Plan your month by defining income and outcome sources.',
            })}
          </div>
        </div>
      </div>
      {/* Outcomes Card */}
      <div className="card flex-grow-1 flex-shrink-0 planning-card-wide">
        <div className="card-header py-1">
          <h6 className="card-title h6 mb-0">
            {t('section.outcomes', { defaultValue: 'Outcomes' })}
          </h6>
        </div>
        <div className="card-body p-1 small">
          <OutcomeSources
            title=""
            helpText={
              outcomeHelp ||
              t('section.predictedOutcome.desc', {
                defaultValue: 'Plan and track your expected expenses',
              })
            }
            sources={outcomeSources}
            isDarkMode={isDarkMode}
            parseLocaleAmount={parseLocaleAmount}
            onUpdate={onOutcomeUpdate}
            onBlurSave={onOutcomeBlurSave}
            onRemoveUnsaved={onOutcomeRemoveUnsaved}
            onDeletePersisted={onOutcomeDeletePersisted}
            onAddEmpty={onOutcomeAddEmpty}
            addButtonText={t('btn.addOutcomeSource', { defaultValue: '+ Outcome' })}
          />
        </div>
      </div>
    </div>
  );
};

export default PlanningSection;
