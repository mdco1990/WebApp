import React from 'react';
import PlanningSection from './PlanningSection';
import type { IncomeSource, OutcomeSource } from '../types/budget';

interface PlanningSectionWrapperProps {
  isDarkMode: boolean;
  title: string;
  monthLabel: string;
  incomeSources: IncomeSource[];
  outcomeSources: OutcomeSource[];
  parseLocaleAmount: (value: string) => number;
  formatCurrency: (cents: number) => string;
  onIncomeUpdate: (index: number, next: IncomeSource) => void;
  onIncomeBlurSave: (index: number) => void;
  onIncomeRemoveUnsaved: (index: number) => void;
  onIncomeDeletePersisted: (id: number) => Promise<void>;
  onIncomeAddEmpty: () => void;
  onOutcomeUpdate: (index: number, next: OutcomeSource) => void;
  onOutcomeBlurSave: (index: number) => void;
  onOutcomeRemoveUnsaved: (index: number) => void;
  onOutcomeDeletePersisted: (id: number) => Promise<void>;
  onOutcomeAddEmpty: () => void;
  totalIncome: number;
  totalOutcome: number;
  difference: number;
  totalIncomeLabel: string;
  totalOutcomeLabel: string;
  differenceLabel: string;
  incomeHelp: string;
  outcomeHelp: string;
}

const PlanningSectionWrapper: React.FC<PlanningSectionWrapperProps> = (props) => {
  return (
    <div className="col-md-6 col-sm-12 mb-4">
      <PlanningSection {...props} />
    </div>
  );
};

export default PlanningSectionWrapper;
