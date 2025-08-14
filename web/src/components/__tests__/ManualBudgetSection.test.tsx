import React from 'react';
import { render } from '@testing-library/react';
import ManualBudgetSection, { ManualBudgetState } from '../ManualBudgetSection';

describe('ManualBudgetSection basic render', () => {
	it('renders with zero state and shows title', () => {
		const state: ManualBudgetState = { bankAmount: 0, items: [] };
		const { getByText } = render(
			<ManualBudgetSection
				isDarkMode={false}
				title="Manual Budget"
				monthLabel="Jan"
				currencySymbol="$"
				manualBudget={state}
				setManualBudget={() => { }}
				parseLocaleAmount={(v) => parseFloat(v) || 0}
				formatCurrency={(c) => `$${(c / 100).toFixed(2)}`}
				resetLabel="Reset"
				bankLabel="Bank"
				plannedLabel="Planned"
				formulaHint="Bank + Items = Remaining"
				toggleTitle="Toggle"
				deleteLabel="Del"
				addItemLabel="Add"
				remainingLabel="Remaining"
				positiveNegativeHint="+/-" />
		);
		expect(getByText('Manual Budget')).toBeInTheDocument();
	});
});
