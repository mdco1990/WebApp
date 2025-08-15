import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import IncomeSources from '../IncomeSources';

// Mock the toast hook
jest.mock('../../shared/toast', () => ({
  useToast: () => ({
    push: jest.fn(),
  }),
}));

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options: any) => options?.defaultValue || key,
  }),
}));

describe('IncomeSources', () => {
  const defaultProps = {
    sources: [],
    isDarkMode: false,
    parseLocaleAmount: (v: string) => parseFloat(v) || 0,
    onUpdate: jest.fn(),
    onBlurSave: jest.fn(),
    onRemoveUnsaved: jest.fn(),
    onDeletePersisted: jest.fn().mockResolvedValue(undefined),
    onAddEmpty: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty state', () => {
    render(<IncomeSources {...defaultProps} />);

    expect(screen.getByText('Income Sources')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add income source/i })).toBeInTheDocument();
  });

  it('should render existing sources', () => {
    const sources = [
      { client_id: '1', name: 'Salary', amount_cents: 500000 },
      { client_id: '2', name: 'Freelance', amount_cents: 200000 },
    ];

    render(<IncomeSources {...defaultProps} sources={sources} />);

    expect(screen.getByDisplayValue('Salary')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5000')).toBeInTheDocument(); // $5000
    expect(screen.getByDisplayValue('Freelance')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2000')).toBeInTheDocument(); // $2000
  });

  it('should call onAddEmpty when add button is clicked', () => {
    const onAddEmpty = jest.fn();
    render(<IncomeSources {...defaultProps} onAddEmpty={onAddEmpty} />);

    fireEvent.click(screen.getByRole('button', { name: /add income source/i }));

    expect(onAddEmpty).toHaveBeenCalledTimes(1);
  });

  it('should call onUpdate when source name is changed', () => {
    const sources = [{ client_id: '1', name: 'Old Name', amount_cents: 100000 }];
    const onUpdate = jest.fn();

    render(<IncomeSources {...defaultProps} sources={sources} onUpdate={onUpdate} />);

    const nameInput = screen.getByDisplayValue('Old Name');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

    expect(onUpdate).toHaveBeenCalledWith(0, {
      client_id: '1',
      name: 'New Name',
      amount_cents: 100000,
    });
  });

  it('should call onBlurSave when name input loses focus', () => {
    const sources = [{ client_id: '1', name: 'Salary', amount_cents: 100000 }];
    const onBlurSave = jest.fn();

    render(<IncomeSources {...defaultProps} sources={sources} onBlurSave={onBlurSave} />);

    const nameInput = screen.getByDisplayValue('Salary');
    fireEvent.blur(nameInput);

    expect(onBlurSave).toHaveBeenCalledWith(0);
  });

  it('should call onUpdate when amount is changed', () => {
    const sources = [{ client_id: '1', name: 'Salary', amount_cents: 100000 }];
    const onUpdate = jest.fn();

    render(<IncomeSources {...defaultProps} sources={sources} onUpdate={onUpdate} />);

    const amountInput = screen.getByDisplayValue('1000');
    fireEvent.change(amountInput, { target: { value: '2000' } });

    expect(onUpdate).toHaveBeenCalledWith(0, {
      client_id: '1',
      name: 'Salary',
      amount_cents: 200000, // $2000 in cents
    });
  });

  it('should call onBlurSave when amount input loses focus', () => {
    const sources = [{ client_id: '1', name: 'Salary', amount_cents: 100000 }];
    const onBlurSave = jest.fn();

    render(<IncomeSources {...defaultProps} sources={sources} onBlurSave={onBlurSave} />);

    const amountInput = screen.getByDisplayValue('1000');
    fireEvent.blur(amountInput);

    expect(onBlurSave).toHaveBeenCalledWith(0);
  });

  it('should call onRemoveUnsaved for sources without id', () => {
    const sources = [{ client_id: '1', name: 'Unsaved', amount_cents: 100000 }];
    const onRemoveUnsaved = jest.fn();

    render(<IncomeSources {...defaultProps} sources={sources} onRemoveUnsaved={onRemoveUnsaved} />);

    const deleteButton = screen.getByRole('button', { name: /delete this source/i });
    fireEvent.click(deleteButton);

    expect(onRemoveUnsaved).toHaveBeenCalledWith(0);
  });

  it('should call onDeletePersisted for sources with id', async () => {
    const sources = [{ id: 123, client_id: '1', name: 'Saved', amount_cents: 100000 }];
    const onDeletePersisted = jest.fn().mockResolvedValue(undefined);

    render(
      <IncomeSources {...defaultProps} sources={sources} onDeletePersisted={onDeletePersisted} />
    );

    const deleteButton = screen.getByRole('button', { name: /delete this source/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(onDeletePersisted).toHaveBeenCalledWith(123);
    });
  });

  it('should apply dark mode styles', () => {
    const sources = [{ client_id: '1', name: 'Salary', amount_cents: 100000 }];

    render(<IncomeSources {...defaultProps} sources={sources} isDarkMode={true} />);

    const nameInput = screen.getByDisplayValue('Salary');
    const amountInput = screen.getByDisplayValue('1000');

    expect(nameInput).toHaveClass('bg-dark', 'text-light', 'border-secondary');
    expect(amountInput).toHaveClass('bg-dark', 'text-light', 'border-secondary');
  });

  it('should display custom title and help text', () => {
    render(<IncomeSources {...defaultProps} title="Custom Title" helpText="This is help text" />);

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('This is help text')).toBeInTheDocument();
  });

  it('should use custom button text', () => {
    render(<IncomeSources {...defaultProps} addButtonText="Custom Add Button" />);

    expect(screen.getByRole('button', { name: 'Custom Add Button' })).toBeInTheDocument();
  });

  it('should handle amount input focus and maintain local state', () => {
    const sources = [{ client_id: '1', name: 'Salary', amount_cents: 100000 }];

    render(<IncomeSources {...defaultProps} sources={sources} />);

    const amountInput = screen.getByDisplayValue('1000');

    // Focus should maintain the display
    fireEvent.focus(amountInput);
    expect(amountInput).toHaveValue(1000);

    // Change value while focused
    fireEvent.change(amountInput, { target: { value: '1500' } });
    expect(amountInput).toHaveValue(1500);
  });

  it('should handle parseLocaleAmount errors gracefully', () => {
    const sources = [{ client_id: '1', name: 'Salary', amount_cents: 100000 }];
    const parseLocaleAmount = jest.fn(() => {
      throw new Error('Parse error');
    });

    render(
      <IncomeSources {...defaultProps} sources={sources} parseLocaleAmount={parseLocaleAmount} />
    );

    const amountInput = screen.getByDisplayValue('1000');

    // Should not crash when parseLocaleAmount throws
    expect(() => {
      fireEvent.change(amountInput, { target: { value: 'invalid' } });
    }).not.toThrow();
  });
});
