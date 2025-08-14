import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../shared/toast';

export interface SourceItem {
  id?: number;
  client_id?: string; // frontend-only stable key before persistence
  name: string;
  amount_cents: number;
}

interface Props {
  title?: string;
  helpText?: string;
  sources: SourceItem[];
  isDarkMode: boolean;
  parseLocaleAmount: (v: string) => number;
  onUpdate: (index: number, next: SourceItem) => void;
  onBlurSave: (index: number) => void;
  onRemoveUnsaved: (index: number) => void;
  onDeletePersisted: (id: number) => Promise<void>;
  onAddEmpty: () => void;
  addButtonText?: string;
}

// Simple controlled amount input component
const AmountInput: React.FC<{
  value: number; // in cents
  isDarkMode: boolean;
  parseLocaleAmount: (v: string) => number;
  onChange: (amountCents: number) => void;
  onBlur: () => void;
}> = ({ value, isDarkMode, parseLocaleAmount, onChange, onBlur }) => {
  const [localValue, setLocalValue] = useState('');
  const [hasBeenFocused, setHasBeenFocused] = useState(false);

  // Initialize local value from props only once or when not focused
  React.useEffect(() => {
    if (!hasBeenFocused) {
      setLocalValue((value / 100).toString());
    }
  }, [value, hasBeenFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    try {
      const amountCents = Math.round(parseLocaleAmount(newValue || '0') * 100);
      onChange(amountCents);
    } catch {
      // If parsing fails, don't update the parent but keep the local value for editing
    }
  };

  const handleFocus = () => {
    setHasBeenFocused(true);
  };

  const handleBlur = () => {
    onBlur();
  };

  return (
    <input
      type="number"
      className={`form-control form-control-sm ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      inputMode="decimal"
      step="0.01"
    />
  );
};

const IncomeSources: React.FC<Props> = ({
  title = 'Income Sources',
  helpText,
  sources,
  isDarkMode,
  parseLocaleAmount,
  onUpdate,
  onBlurSave,
  onRemoveUnsaved,
  onDeletePersisted,
  onAddEmpty,
  addButtonText,
}) => {
  const { push } = useToast();
  const { t } = useTranslation();
  const buttonLabel =
    addButtonText ?? t('btn.addIncomeSource', { defaultValue: '+ Add Income Source' });
  return (
    <div className="mb-2">
      {title ? <h6 className="h6 mb-2">{title}</h6> : null}
      {helpText ? <p className="text-muted small mb-3">{helpText}</p> : null}
      <div className="row g-2">
        {sources.map((source, index) => (
          <div key={source.id ?? source.client_id ?? index} className="col-12">
            <div className="row g-2">
              <div className="col-sm-6 col-12">
                <input
                  type="text"
                  className={`form-control form-control-sm ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                  value={source.name}
                  placeholder={t('placeholder.incomeSourceName', {
                    defaultValue: 'Income source name',
                  })}
                  onChange={(e) => onUpdate(index, { ...source, name: e.target.value })}
                  onBlur={() => onBlurSave(index)}
                />
              </div>
              <div className="col-sm-4 col-8">
                <AmountInput
                  value={source.amount_cents}
                  isDarkMode={isDarkMode}
                  parseLocaleAmount={parseLocaleAmount}
                  onChange={(amountCents: number) =>
                    onUpdate(index, { ...source, amount_cents: amountCents })
                  }
                  onBlur={() => onBlurSave(index)}
                />
              </div>
              <div className="col-sm-2 col-4">
                <button
                  className="btn btn-sm btn-outline-danger w-100"
                  onClick={async () => {
                    if (!source.id) {
                      onRemoveUnsaved(index);
                      return;
                    }
                    try {
                      await onDeletePersisted(source.id);
                    } catch {
                      push('Failed to delete. Please try again.', 'error');
                    }
                  }}
                  title={t('btn.deleteSource', { defaultValue: 'Delete this source' })}
                  aria-label={t('btn.deleteSource', { defaultValue: 'Delete this source' })}
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-sm btn-outline-primary mt-2" onClick={onAddEmpty}>
        {buttonLabel}
      </button>
    </div>
  );
};

export default IncomeSources;
