// Mapped types for dynamic form handling with backend integration

// Base form values type
export type FormValues = {
  name: string;
  email: string;
  age: number;
  category: string;
  description?: string;
  amount_cents?: number;
  year?: number;
  month?: number;
};

// Mapped types for form validation errors
export type FormErrors<T> = {
  [K in keyof T]?: string;
};

// Mapped types for form field touch state
export type FormTouched<T> = {
  [K in keyof T]?: boolean;
};

// Mapped types for form field validation state
export type FormFieldState<T> = {
  [K in keyof T]: FormField<T[K]>;
};

// Individual form field type
export type FormField<T> = {
  value: T;
  error?: string;
  touched: boolean;
  required: boolean;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
};

// Complete form state with all mapped types
export type FormState<T> = {
  values: T;
  errors: FormErrors<T>;
  touched: FormTouched<T>;
  fields: FormFieldState<T>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
  submitCount: number;
};

// Validation rule types
export type ValidationRule<T> = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: T) => Promise<string | null>;
  backendValidation?: boolean; // Flag to trigger backend validation
};

// Validation rules for form fields
export type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule<T[K]>;
};

// Form field configuration
export type FormFieldConfig<T> = {
  [K in keyof T]: {
    type: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'date' | 'checkbox';
    label: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    options?: Array<{ value: string; label: string }>; // For select fields
    validation?: ValidationRule<T[K]>;
    conditional?: {
      field: keyof T;
      value: unknown;
      operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    };
  };
};

// Backend validation response type
export type BackendValidationResponse = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

// Form submission response type
export type FormSubmissionResponse<T> = {
  success: boolean;
  data?: T;
  errors?: FormErrors<T>;
  message?: string;
};

// Form action types for reducer pattern
export type FormAction<T> = 
  | { type: 'SET_FIELD_VALUE'; field: keyof T; value: T[keyof T] }
  | { type: 'SET_FIELD_ERROR'; field: keyof T; error: string }
  | { type: 'CLEAR_FIELD_ERROR'; field: keyof T }
  | { type: 'SET_FIELD_TOUCHED'; field: keyof T; touched: boolean }
  | { type: 'SET_FIELD_DISABLED'; field: keyof T; disabled: boolean }
  | { type: 'SET_ALL_ERRORS'; errors: FormErrors<T> }
  | { type: 'CLEAR_ALL_ERRORS' }
  | { type: 'SET_SUBMITTING'; submitting: boolean }
  | { type: 'SET_VALUES'; values: Partial<T> }
  | { type: 'RESET_FORM'; initialValues?: T }
  | { type: 'SET_DIRTY'; dirty: boolean }
  | { type: 'INCREMENT_SUBMIT_COUNT' };

// Form reducer function
export function formReducer<T>(state: FormState<T>, action: FormAction<T>): FormState<T> {
  switch (action.type) {
    case 'SET_FIELD_VALUE':
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
        errors: { ...state.errors, [action.field]: undefined },
        isDirty: true,
      };

    case 'SET_FIELD_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.error },
        isValid: false,
      };

    case 'CLEAR_FIELD_ERROR': {
      const newErrors = { ...state.errors };
      delete newErrors[action.field];
      return {
        ...state,
        errors: newErrors,
        isValid: Object.keys(newErrors).length === 0,
      };
    }

    case 'SET_FIELD_TOUCHED':
      return {
        ...state,
        touched: { ...state.touched, [action.field]: action.touched },
      };

    case 'SET_FIELD_DISABLED':
      return {
        ...state,
        fields: {
          ...state.fields,
          [action.field]: {
            ...state.fields[action.field],
            disabled: action.disabled,
          },
        },
      };

    case 'SET_ALL_ERRORS':
      return {
        ...state,
        errors: action.errors,
        isValid: Object.keys(action.errors).length === 0,
      };

    case 'CLEAR_ALL_ERRORS':
      return {
        ...state,
        errors: {} as FormErrors<T>,
        isValid: true,
      };

    case 'SET_SUBMITTING':
      return {
        ...state,
        isSubmitting: action.submitting,
      };

    case 'SET_VALUES':
      return {
        ...state,
        values: { ...state.values, ...action.values },
        isDirty: true,
      };

    case 'RESET_FORM': {
      const initialValues = action.initialValues || state.values;
      return {
        ...state,
        values: initialValues,
        errors: {} as FormErrors<T>,
        touched: {} as FormTouched<T>,
        isValid: true,
        isSubmitting: false,
        isDirty: false,
        submitCount: 0,
      };
    }

    case 'SET_DIRTY':
      return {
        ...state,
        isDirty: action.dirty,
      };

    case 'INCREMENT_SUBMIT_COUNT':
      return {
        ...state,
        submitCount: state.submitCount + 1,
      };

    default:
      return state;
  }
}

// Utility function to create initial form state
export function createInitialFormState<T extends object>(initialValues: T, config?: FormFieldConfig<T>): FormState<T> {
  const fields: FormFieldState<T> = {} as FormFieldState<T>;
  
  // Initialize fields based on config or defaults
  (Object.keys(initialValues) as Array<keyof T>).forEach(key => {
    const fieldConfig = config?.[key];
    fields[key] = {
      value: initialValues[key],
      error: undefined,
      touched: false,
      required: fieldConfig?.required || false,
      disabled: fieldConfig?.disabled || false,
      placeholder: fieldConfig?.placeholder,
      label: fieldConfig?.label || String(key),
    };
  });

  return {
    values: initialValues,
    errors: {} as FormErrors<T>,
    touched: {} as FormTouched<T>,
    fields,
    isValid: true,
    isSubmitting: false,
    isDirty: false,
    submitCount: 0,
  };
}

// Validation helper functions
function validateRequired<T>(value: unknown, rule: ValidationRules<T>[keyof T]): string[] {
  const errors: string[] = [];
  if (rule && rule.required && (value === undefined || value === null || value === '')) {
    errors.push('This field is required');
  }
  return errors;
}

function validateString<T>(value: unknown, rule: ValidationRules<T>[keyof T]): string[] {
  const errors: string[] = [];
  if (typeof value === 'string') {
    if (rule && rule.minLength && value.length < rule.minLength) {
      errors.push(`Minimum length is ${rule.minLength} characters`);
    }
    if (rule && rule.maxLength && value.length > rule.maxLength) {
      errors.push(`Maximum length is ${rule.maxLength} characters`);
    }
    if (rule && rule.pattern && !rule.pattern.test(value)) {
      errors.push('Invalid format');
    }
  }
  return errors;
}

function validateNumber<T>(value: unknown, rule: ValidationRules<T>[keyof T]): string[] {
  const errors: string[] = [];
  if (typeof value === 'number') {
    if (rule && rule.min !== undefined && value < rule.min) {
      errors.push(`Minimum value is ${rule.min}`);
    }
    if (rule && rule.max !== undefined && value > rule.max) {
      errors.push(`Maximum value is ${rule.max}`);
    }
  }
  return errors;
}

async function validateCustom<T>(value: unknown, rule: ValidationRules<T>[keyof T]): Promise<string[]> {
  const errors: string[] = [];
  if (rule && rule.custom) {
    try {
      const customError = await rule.custom(value as T[keyof T]);
      if (customError) {
        errors.push(customError);
      }
    } catch {
      errors.push('Validation failed');
    }
  }
  return errors;
}

// Utility function to validate form fields
export async function validateForm<T extends object>(
  values: T,
  rules: ValidationRules<T>
): Promise<FormErrors<T>> {
  const errors: FormErrors<T> = {};

  for (const [field, rule] of Object.entries(rules) as [keyof T, ValidationRules<T>[keyof T]][]) {
    const value = values[field as keyof T];
    const fieldErrors: string[] = [];

    // Run all validations
    fieldErrors.push(...validateRequired(value, rule));
    fieldErrors.push(...validateString(value, rule));
    fieldErrors.push(...validateNumber(value, rule));
    
    // Custom validation rule
    if (rule && rule.custom) {
      try {
        const customError = await rule.custom(value as T[keyof T]);
        if (customError) {
          errors[field as keyof T] = customError;
        }
      } catch (error) {
        errors[field as keyof T] = 'Custom validation failed';
      }
    }

    if (fieldErrors.length > 0) {
      errors[field as keyof T] = fieldErrors.join(', ');
    }
  }

  return errors;
}

// Utility function to check if form should show backend validation
export function shouldValidateBackend<T>(rules: ValidationRules<T>): boolean {
  return Object.values(rules).some(rule => rule && typeof rule === 'object' && 'backendValidation' in rule && rule.backendValidation);
}

// Type for form submission handler
export type FormSubmitHandler<T> = (values: T) => Promise<FormSubmissionResponse<T>>;

// Type for form validation handler
export type FormValidationHandler<T> = (values: T) => Promise<BackendValidationResponse>;

// Conditional form field visibility
export type ConditionalField<T> = {
  field: keyof T;
  condition: {
    field: keyof T;
    value: unknown;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  };
};

// Utility function to check if conditional field should be visible
export function shouldShowConditionalField<T>(
  field: ConditionalField<T>,
  values: T
): boolean {
  const { condition } = field;
  const conditionValue = values[condition.field];
  const targetValue = condition.value;

  switch (condition.operator) {
    case 'equals':
      return conditionValue === targetValue;
    case 'not_equals':
      return conditionValue !== targetValue;
    case 'contains':
      return String(conditionValue).includes(String(targetValue));
    case 'greater_than':
      return Number(conditionValue) > Number(targetValue);
    case 'less_than':
      return Number(conditionValue) < Number(targetValue);
    default:
      return true;
  }
}

// Type for form field change handler
export type FieldChangeHandler<T> = (field: keyof T, value: T[keyof T]) => void;

// Type for form field blur handler
export type FieldBlurHandler<T> = (field: keyof T) => void;