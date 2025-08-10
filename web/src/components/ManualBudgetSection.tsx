import React from 'react';

export interface ManualBudgetItem {
  id: string;
  name: string;
  amount: number;
}
export interface ManualBudgetState {
  bankAmount: number;
  items: ManualBudgetItem[];
}

interface Props {
  isDarkMode: boolean;
  monthLabel: string;
  currencySymbol: string;
  manualBudget: ManualBudgetState;
  setManualBudget: (next: ManualBudgetState) => void;
  parseLocaleAmount: (v: string) => number;
  formatCurrency: (cents: number) => string;
  resetLabel: string;
  bankLabel: string;
  plannedLabel: string;
  formulaHint: string;
  toggleTitle: string;
  deleteLabel: string;
  addItemLabel: string;
  remainingLabel: string;
  positiveNegativeHint: string;
}

const ManualBudgetSection: React.FC<Props> = ({
  isDarkMode,
  monthLabel,
  currencySymbol,
  manualBudget,
  setManualBudget,
  parseLocaleAmount,
  formatCurrency,
  resetLabel,
  bankLabel,
  plannedLabel,
  formulaHint,
  toggleTitle,
  deleteLabel,
  addItemLabel,
  remainingLabel,
  positiveNegativeHint,
}) => {
  const remaining =
    manualBudget.bankAmount + manualBudget.items.reduce((s, i) => s + (i.amount || 0), 0);
  return (
    <div className="row">
      <div className="col-lg-12 mb-4">
        <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
          <div className="card-header d-flex justify-content-between align-items-center">
            <h3 className="mb-0">Manual Budget</h3>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-secondary">{monthLabel}</span>
              <div className="small text-muted me-2">{formulaHint}</div>
              <button
                type="button"
                className="btn btn-sm btn-outline-warning"
                onClick={() => setManualBudget({ bankAmount: 0, items: [] })}
                title={resetLabel}
              >
                {resetLabel}
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="row g-3 mb-3">
              <div className="col-md-4">
                <label className="form-label">{bankLabel}</label>
                <input
                  type="text"
                  className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                  value={manualBudget.bankAmount}
                  onChange={(e) =>
                    setManualBudget({
                      ...manualBudget,
                      bankAmount: parseLocaleAmount(e.target.value),
                    })
                  }
                  inputMode="decimal"
                />
              </div>
              <div className="col-md-8">
                <label className="form-label">{plannedLabel}</label>
                <div className="row g-2">
                  {manualBudget.items.map((it, idx) => (
                    <div className="col-12" key={it.id}>
                      <div className="input-group input-group-sm">
                        <input
                          type="text"
                          className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                          placeholder={'Item name'}
                          value={it.name}
                          onChange={(e) => {
                            const items = [...manualBudget.items];
                            items[idx] = { ...items[idx], name: e.target.value };
                            setManualBudget({ ...manualBudget, items });
                          }}
                        />
                        <span className="input-group-text">{currencySymbol}</span>
                        <input
                          type="text"
                          className={`form-control ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                          placeholder={'Amount'}
                          value={it.amount}
                          onChange={(e) => {
                            const items = [...manualBudget.items];
                            items[idx] = {
                              ...items[idx],
                              amount: parseLocaleAmount(e.target.value),
                            };
                            setManualBudget({ ...manualBudget, items });
                          }}
                          inputMode="decimal"
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          title={toggleTitle}
                          onClick={() => {
                            const items = [...manualBudget.items];
                            items[idx] = { ...items[idx], amount: (items[idx].amount || 0) * -1 };
                            setManualBudget({ ...manualBudget, items });
                          }}
                        >
                          ±
                        </button>
                        <button
                          className="btn btn-outline-danger"
                          onClick={() => {
                            setManualBudget({
                              ...manualBudget,
                              items: manualBudget.items.filter((x) => x.id !== it.id),
                            });
                          }}
                        >
                          {deleteLabel}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  className="btn btn-sm btn-outline-primary mt-2"
                  onClick={() => {
                    setManualBudget({
                      ...manualBudget,
                      items: [
                        ...manualBudget.items,
                        { id: Math.random().toString(36).slice(2), name: '', amount: 0 },
                      ],
                    });
                  }}
                >
                  {addItemLabel}
                </button>
              </div>
            </div>

            <div className="row g-3">
              <div className="col-md-4">
                <div className="text-center">
                  <h5>{remainingLabel}</h5>
                  <div className="text-muted small mb-1">{positiveNegativeHint}</div>
                  <h4 className={remaining >= 0 ? 'text-success' : 'text-danger'}>
                    {/* remaining is in currency units, convert to cents for formatter */}
                    {formatCurrency(Math.round(remaining * 100))}
                  </h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualBudgetSection;
