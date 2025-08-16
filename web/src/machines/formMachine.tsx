import React, { useState, useCallback, useRef } from 'react';

// Form Data Types
export interface FormData {
  description: string;
  amount_cents: number;
  category: string;
  year_month: { year: number; month: number };
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => string | null;
}

export interface ValidationErrors {
  description?: string;
  amount_cents?: string;
  category?: string;
  year_month?: string;
  general?: string;
}

// Form state machine types
type FormState =
  | { status: 'idle'; data: FormData; errors: ValidationErrors }
  | { status: 'editing'; data: FormData; errors: ValidationErrors }
  | { status: 'validating'; data: FormData; errors: ValidationErrors }
  | { status: 'submitting'; data: FormData; errors: ValidationErrors }
  | { status: 'success'; data: FormData; errors: ValidationErrors }
  | { status: 'error'; data: FormData; errors: ValidationErrors; error: string };

type FormEvent =
  | { type: 'EDIT'; field: keyof FormData; value: FormData[keyof FormData] }
  | { type: 'VALIDATE' }
  | { type: 'VALIDATION_SUCCESS' }
  | { type: 'VALIDATION_ERROR'; errors: ValidationErrors }
  | { type: 'SUBMIT' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; error: string }
  | { type: 'RESET' };

// Form state machine
export function formMachine(
  initialState: FormData,
  validate: (data: FormData) => Promise<ValidationErrors>
): [FormState, (event: FormEvent) => void] {
  const [state, setState] = useState<FormState>({
    status: 'idle',
    data: initialState,
    errors: {},
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const send = useCallback((event: FormEvent) => {
    switch (event.type) {
      case 'EDIT':
        setState(prevState => ({
          ...prevState,
          status: 'editing',
          data: {
            ...prevState.data,
            [event.field]: event.value,
          },
          errors: {
            ...prevState.errors,
            [event.field]: undefined,
          },
        }));
        break;

      case 'VALIDATE':
        setState(prevState => ({ ...prevState, status: 'validating' }));
        validate(stateRef.current.data)
          .then(errors => {
            const hasErrors = Object.keys(errors).length > 0;
            if (hasErrors) {
              setState(prevState => ({ ...prevState, status: 'error', errors, error: 'Validation failed' }));
            } else {
              setState(prevState => ({ ...prevState, status: 'editing', errors: {} }));
            }
          })
          .catch(() => {
            setState(prevState => ({ ...prevState, status: 'error', errors: { general: 'Validation failed' }, error: 'Validation failed' }));
          });
        break;

      case 'SUBMIT':
        setState(prevState => ({ ...prevState, status: 'submitting' }));
        break;

      case 'SUBMIT_SUCCESS':
        setState(prevState => ({ ...prevState, status: 'success' }));
        break;

      case 'SUBMIT_ERROR':
        setState(prevState => ({ ...prevState, status: 'error', error: event.error }));
        break;

      case 'RESET':
        setState({
          status: 'idle',
          data: initialState,
          errors: {},
        });
        break;
    }
  }, [validate, initialState]);

  return [state, send];
}

// Validation Functions
export async function validateExpenseForm(data: FormData): Promise<ValidationErrors> {
  const errors: ValidationErrors = {};

  // Description validation
  if (!data.description || data.description.trim().length === 0) {
    errors.description = 'Description is required';
  } else if (data.description.length > 100) {
    errors.description = 'Description must be less than 100 characters';
  }

  // Amount validation
  if (typeof data.amount_cents === 'number') {
    if (data.amount_cents <= 0) {
      errors.amount_cents = 'Amount must be positive';
    } else if (data.amount_cents > 999999999) {
      errors.amount_cents = 'Amount is too large';
    }
  } else {
    errors.amount_cents = 'Amount must be a number';
  }

  // Category validation
  const validCategories = ['food', 'transport', 'entertainment', 'utilities', 'health', 'education', 'other'];
  if (typeof data.category === 'string') {
    if (!validCategories.includes(data.category)) {
      errors.category = 'Invalid category selected';
    }
  } else {
    errors.category = 'Category is required';
  }

  // Date validation
  if (data.year_month && typeof data.year_month === 'object') {
    if (!data.year_month.year || !data.year_month.month) {
      errors.year_month = 'Date is required';
    } else {
      if (data.year_month.year < 2020 || data.year_month.year > 2030) {
        errors.year_month = 'Year must be between 2020 and 2030';
      }
      if (data.year_month.month < 1 || data.year_month.month > 12) {
        errors.year_month = 'Month must be between 1 and 12';
      }
    }
  } else {
    errors.year_month = 'Date is required';
  }

  return errors;
}

export async function validateIncomeForm(data: FormData): Promise<ValidationErrors> {
  const errors: ValidationErrors = {};

  // Description validation
  if (!data.description || data.description.trim().length === 0) {
    errors.description = 'Description is required';
  } else if (data.description.length > 100) {
    errors.description = 'Description must be less than 100 characters';
  }

  // Amount validation
  if (typeof data.amount_cents === 'number') {
    if (data.amount_cents <= 0) {
      errors.amount_cents = 'Amount must be positive';
    } else if (data.amount_cents > 999999999) {
      errors.amount_cents = 'Amount is too large';
    }
  } else {
    errors.amount_cents = 'Amount must be a number';
  }

  // Date validation
  if (data.year_month && typeof data.year_month === 'object') {
    if (!data.year_month.year || !data.year_month.month) {
      errors.year_month = 'Date is required';
    } else {
      if (data.year_month.year < 2020 || data.year_month.year > 2030) {
        errors.year_month = 'Year must be between 2020 and 2030';
      }
      if (data.year_month.month < 1 || data.year_month.month > 12) {
        errors.year_month = 'Month must be between 1 and 12';
      }
    }
  } else {
    errors.year_month = 'Date is required';
  }

  return errors;
}

export async function validateBudgetForm(data: FormData): Promise<ValidationErrors> {
  const errors: ValidationErrors = {};

  // Description validation
  if (!data.description || data.description.trim().length === 0) {
    errors.description = 'Description is required';
  } else if (data.description.length > 100) {
    errors.description = 'Description must be less than 100 characters';
  }

  // Amount validation
  if (typeof data.amount_cents === 'number') {
    if (data.amount_cents < 0) {
      errors.amount_cents = 'Amount cannot be negative';
    } else if (data.amount_cents > 999999999) {
      errors.amount_cents = 'Amount is too large';
    }
  } else {
    errors.amount_cents = 'Amount must be a number';
  }

  // Date validation
  if (data.year_month && typeof data.year_month === 'object') {
    if (!data.year_month.year || !data.year_month.month) {
      errors.year_month = 'Date is required';
    } else {
      if (data.year_month.year < 2020 || data.year_month.year > 2030) {
        errors.year_month = 'Year must be between 2020 and 2030';
      }
      if (data.year_month.month < 1 || data.year_month.month > 12) {
        errors.year_month = 'Month must be between 1 and 12';
      }
    }
  } else {
    errors.year_month = 'Date is required';
  }

  return errors;
}