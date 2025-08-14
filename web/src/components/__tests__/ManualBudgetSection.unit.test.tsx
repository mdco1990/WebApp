import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import ManualBudgetSection from '../ManualBudgetSection';

describe('ManualBudgetSection (unit)', () => {
  const parse = (v: string) => {
    const n = v.replace(/,/g, '.');
    return parseFloat(n) || 0;
  };
  const format = (c: number) => `$${(c / 100).toFixed(2)}`;

  it('parses comma decimal values', () => {
    const mockSetManualBudget = jest.fn();
    const initialState = { bankAmount: 0, items: [] };
    const { getByLabelText } = render(
      <ManualBudgetSection
        isDarkMode={false}
        title="Manual Budget"
        monthLabel="Jan"
        currencySymbol="$"
        manualBudget={initialState}
        setManualBudget={mockSetManualBudget}
        parseLocaleAmount={parse}
        formatCurrency={format}
        resetLabel="Reset"
        bankLabel="Bank"
        plannedLabel="Planned"
        formulaHint="Bank + Items = Remaining"
        toggleTitle="Toggle"
        deleteLabel="Del"
        addItemLabel="Add"
        remainingLabel="Remaining"
        positiveNegativeHint="+/- allowed"
      />
    );
    const bankInput = getByLabelText('Bank');
    fireEvent.change(bankInput, { target: { value: '123,45' } });

    // Check that setManualBudget was called with the correctly parsed value
    expect(mockSetManualBudget).toHaveBeenCalledWith({
      bankAmount: 123.45,
      items: []
    });
  });
});
