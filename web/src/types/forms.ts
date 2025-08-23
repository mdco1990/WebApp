// --- Validation rule helpers to reduce complexity ---
function checkRequired(value: unknown, message: string): string | undefined {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return message;
  }
}

function checkMinLength(value: unknown, rule: ValidationRule): string | undefined {
  if (typeof value === 'string' && typeof rule.value === 'number' && value.length < rule.value) {
    return rule.message;
  }
}

function checkMaxLength(value: unknown, rule: ValidationRule): string | undefined {
  if (typeof value === 'string' && typeof rule.value === 'number' && value.length > rule.value) {
    return rule.message;
  }
}

function checkMin(value: unknown, rule: ValidationRule): string | undefined {
  if (typeof value === 'number' && typeof rule.value === 'number' && value < rule.value) {
    return rule.message;
  }
}

function checkMax(value: unknown, rule: ValidationRule): string | undefined {
  if (typeof value === 'number' && typeof rule.value === 'number' && value > rule.value) {
    return rule.message;
  }
}

function checkEmail(value: unknown, message: string): string | undefined {
  if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return message;
  }
}

function checkPattern(value: unknown, rule: ValidationRule): string | undefined {
  if (
    typeof value === 'string' &&
    (typeof rule.value === 'string' || rule.value instanceof RegExp) &&
    !new RegExp(rule.value).test(value)
  ) {
    return rule.message;
  }
}

function checkCustom(value: unknown, rule: ValidationRule): string | undefined {
  if (rule.validator) {
    const result = rule.validator(value);
    if (typeof result === 'string') {
      return result;
    }
    if (!result) {
      return rule.message;
    }
  }
}

// Validation schema type for forms
// ...existing code...
// Mapped types for dynamic form handling
// This file provides comprehensive form types with type safety and validation

// User type imported from budget module

// Base form field types
export type FormFieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'select'
  | 'textarea'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'file';

// Form field configuration
export type FormFieldConfig<T> = {
  key: keyof T;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: ValidationRule[];
  dependsOn?: keyof T; // Field dependency for conditional rendering
  dependsOnValue?: unknown; // Value that should trigger this field
  disabled?: boolean;
  hidden?: boolean;
  defaultValue?: T[keyof T];
  className?: string;
  style?: React.CSSProperties;
};

// Validation rule types
// Validation schema type for forms
export type ValidationSchema<T> = {
  [K in keyof T]?: ValidationRule[];
};

// Validation schema for ExpenseForm fields
export const expenseFormValidation: ValidationSchema<ExpenseForm> = {
  description: [
    { type: 'required', message: 'Description is required.' },
    { type: 'minLength', value: 2, message: 'Description must be at least 2 characters.' },
    { type: 'maxLength', value: 100, message: 'Description must be at most 100 characters.' },
  ],
  amount: [
    { type: 'required', message: 'Amount is required.' },
    { type: 'min', value: 0.01, message: 'Amount must be greater than 0.' },
  ],
  category: [{ type: 'required', message: 'Category is required.' }],
  date: [
    { type: 'required', message: 'Date is required.' },
    // Optionally add a pattern or custom validator for date format
  ],
  notes: [
    // Notes are optional, but you can add maxLength if needed
    { type: 'maxLength', value: 500, message: 'Notes must be at most 500 characters.' },
  ],
};
export type ValidationRule = {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom' | 'email' | 'min' | 'max';
  value?: unknown;
  message: string;
  validator?: (value: unknown, formData?: unknown) => boolean | string;
};

// Form validation errors using mapped types
export type FormErrors<T> = {
  [K in keyof T]?: string;
};

// Form touched state using mapped types
export type FormTouched<T> = {
  [K in keyof T]?: boolean;
};

// Form field state using mapped types
export type FormFieldState<T> = {
  [K in keyof T]: {
    value: T[K];
    error?: string;
    touched: boolean;
    required: boolean;
    disabled: boolean;
    hidden: boolean;
  };
};

// Form state using mapped types
export type FormState<T> = {
  values: T;
  errors: FormErrors<T>;
  touched: FormTouched<T>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
  submitCount: number;
};

// Form configuration using mapped types
export type FormConfig<T> = {
  fields: FormFieldConfig<T>[];
  initialValues: T;
  onSubmit: (values: T) => void | Promise<void>;
  onValidate?: (values: T) => FormErrors<T>;
  className?: string;
  submitText?: string;
  resetText?: string;
  showReset?: boolean;
};

// Dynamic form field types based on field type
export type DynamicFormField<T> = {
  [K in keyof T]: FormFieldConfig<T> extends { type: infer U } ? U : never;
};

// Conditional form fields using mapped types
export type ConditionalFormFields<T> = {
  [K in keyof T]: FormFieldConfig<T> extends { dependsOn: keyof T; dependsOnValue: unknown }
    ? {
        field: K;
        dependsOn: FormFieldConfig<T>['dependsOn'];
        value: FormFieldConfig<T>['dependsOnValue'];
      }
    : never;
}[keyof T];

// Form submission result
export type FormSubmissionResult<T> = {
  success: boolean;
  data?: T;
  errors?: FormErrors<T>;
  message?: string;
};

// Form field change event
export type FormFieldChangeEvent<T> = {
  field: keyof T;
  value: T[keyof T];
  type: 'change' | 'blur' | 'focus';
};

// Form validation context
export type FormValidationContext<T> = {
  values: T;
  errors: FormErrors<T>;
  touched: FormTouched<T>;
  setFieldError: (field: keyof T, error: string) => void;
  clearFieldError: (field: keyof T) => void;
  validateField: (field: keyof T) => void;
  validateForm: () => void;
};

// Form field renderer function type
export type FormFieldRenderer<T> = (
  field: FormFieldConfig<T>,
  value: unknown,
  onChange: (value: unknown) => void,
  onBlur: () => void,
  error?: string,
  touched?: boolean
) => React.ReactNode;

// Specific form types for the application
export type LoginForm = {
  username: string;
  password: string;
  rememberMe: boolean;
};

export type RegistrationForm = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
};

export type ExpenseForm = {
  description: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
};

export type BudgetForm = {
  category: string;
  amount: number;
  month: string;
  year: number;
  description?: string;
};

export type IncomeForm = {
  source: string;
  amount: number;
  frequency: 'monthly' | 'weekly' | 'biweekly' | 'yearly';
  startDate: string;
  endDate?: string;
  notes?: string;
};

export type UserProfileForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  timezone: string;
  currency: string;
  language: string;
};

// Form validation schemas using mapped types
// ...existing code...

// ...existing code...

export const expenseFormConfig: FormConfig<ExpenseForm> = {
  fields: [
    {
      key: 'description',
      label: 'Description',
      type: 'text',
      required: true,
      placeholder: 'Enter expense description',
      validation: expenseFormValidation.description,
    },
    {
      key: 'amount',
      label: 'Amount',
      type: 'number',
      required: true,
      placeholder: '0.00',
      validation: expenseFormValidation.amount,
    },
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      required: true,
      options: [
        { value: 'food', label: 'Food & Dining' },
        { value: 'transport', label: 'Transportation' },
        { value: 'entertainment', label: 'Entertainment' },
        { value: 'shopping', label: 'Shopping' },
        { value: 'utilities', label: 'Utilities' },
        { value: 'other', label: 'Other' },
      ],
      validation: expenseFormValidation.category,
    },
    {
      key: 'date',
      label: 'Date',
      type: 'date',
      required: true,
      validation: expenseFormValidation.date,
    },
    {
      key: 'notes',
      label: 'Notes',
      type: 'textarea',
      required: false,
      placeholder: 'Additional notes (optional)',
    },
  ],
  initialValues: {
    description: '',
    amount: 0,
    category: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  },
  onSubmit: async (_values) => {
    // Handle expense submission
    // Form submission logic would go here
  },
};

// Utility types for form handling
export type FormFieldValue<T, K extends keyof T> = T[K];

export type FormFieldError<T, K extends keyof T> = FormErrors<T>[K];

export type FormFieldTouched<T, K extends keyof T> = FormTouched<T>[K];

// Form state selector types
export type FormSelector<T, R> = (state: FormState<T>) => R;

// Common form selectors
export const selectFormValues =
  <T>(): FormSelector<T, T> =>
  (state) =>
    state.values;
export const selectFormErrors =
  <T>(): FormSelector<T, FormErrors<T>> =>
  (state) =>
    state.errors;
export const selectFormTouched =
  <T>(): FormSelector<T, FormTouched<T>> =>
  (state) =>
    state.touched;
export const selectFormIsValid =
  <T>(): FormSelector<T, boolean> =>
  (state) =>
    state.isValid;
export const selectFormIsSubmitting =
  <T>(): FormSelector<T, boolean> =>
  (state) =>
    state.isSubmitting;
export const selectFormIsDirty =
  <T>(): FormSelector<T, boolean> =>
  (state) =>
    state.isDirty;

// Form field selector types
export const selectFieldValue =
  <T, K extends keyof T>(field: K): FormSelector<T, T[K]> =>
  (state) =>
    state.values[field];

export const selectFieldError =
  <T, K extends keyof T>(field: K): FormSelector<T, string | undefined> =>
  (state) =>
    state.errors[field];

export const selectFieldTouched =
  <T, K extends keyof T>(field: K): FormSelector<T, boolean> =>
  (state) =>
    state.touched[field] || false;

// Form validation utilities
export const validateField = <T>(
  field: keyof T,
  value: T[keyof T],
  validation: ValidationRule[]
): string | undefined => {
  const ruleHandlers: Record<string, (value: unknown, rule: ValidationRule) => string | undefined> =
    {
      required: (v, r) => checkRequired(v, r.message),
      minLength: checkMinLength,
      maxLength: checkMaxLength,
      min: checkMin,
      max: checkMax,
      email: (v, r) => checkEmail(v, r.message),
      pattern: checkPattern,
      custom: checkCustom,
    };
  for (const rule of validation) {
    const handler = ruleHandlers[rule.type];
    if (handler) {
      const result = handler(value, rule);
      if (result) return result;
    }
  }
  return undefined;
};

// Validation schema type for forms
// ...existing code...

export const validateForm = <T>(
  values: T,
  validationSchema: ValidationSchema<T>
): FormErrors<T> => {
  const errors: FormErrors<T> = {};

  for (const [field, rules] of Object.entries(validationSchema)) {
    if (rules) {
      const error = validateField(
        field as keyof T,
        values[field as keyof T],
        Array.isArray(rules) ? rules : []
      );
      if (error) {
        errors[field as keyof T] = error;
      }
    }
  }

  return errors;
};
