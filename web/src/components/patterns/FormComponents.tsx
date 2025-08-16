import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Form context types
interface FormContextType<T extends Record<string, unknown>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  setValue: (field: keyof T, value: T[keyof T]) => void;
  setTouched: (field: keyof T, touched: boolean) => void;
  setError: (field: keyof T, error: string) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  reset: () => void;
}

// Form props
interface FormProps<T extends Record<string, unknown>> {
  initialValues: T;
  onSubmit: (values: T) => Promise<void>;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  children: (formProps: FormContextType<T>) => ReactNode;
}

// Create context
const FormContext = createContext<FormContextType<Record<string, unknown>> | null>(null);

// Form component
export function Form<T extends Record<string, unknown>>({ 
  initialValues, 
  onSubmit, 
  validate, 
  children 
}: FormProps<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouchedState] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback((field: keyof T, value: T[keyof T]) => {
    setValues(prev => ({ ...prev, [field]: value }));
    // Clear error when field is modified
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const setTouched = useCallback((field: keyof T, touched: boolean) => {
    setTouchedState(prev => ({ ...prev, [field]: touched }));
  }, []);

  const setError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  const setSubmitting = useCallback((submitting: boolean) => {
    setIsSubmitting(submitting);
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouchedState({});
    setIsSubmitting(false);
  }, [initialValues]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate) {
      const validationErrors = validate(values);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
      reset();
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate, onSubmit, reset]);

  const contextValue: FormContextType<T> = {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setTouched,
    setError,
    setSubmitting,
    reset,
  };

  return (
    <FormContext.Provider value={contextValue as FormContextType<Record<string, unknown>>}>
      <form onSubmit={handleSubmit}>
        {children(contextValue)}
      </form>
    </FormContext.Provider>
  );
}

// Form field props
interface FormFieldProps<T extends Record<string, unknown>> {
  field: keyof T;
  children: (fieldProps: {
    value: T[keyof T];
    error: string | undefined;
    touched: boolean;
    onChange: (value: T[keyof T]) => void;
    onBlur: () => void;
  }) => ReactNode;
}

// Form field component
export function FormField<T extends Record<string, unknown>>({ field, children }: FormFieldProps<T>) {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('FormField must be used within a Form component');
  }

  const { values, errors, touched, setValue, setTouched } = context as FormContextType<T>;
  const value = values[field];
  const error = errors[field];
  const isTouched = touched[field] || false;

  const onChange = useCallback((newValue: T[keyof T]) => {
    setValue(field, newValue);
  }, [field, setValue]);

  const onBlur = useCallback(() => {
    setTouched(field, true);
  }, [field, setTouched]);

  return (
    <>
      {children({
        value,
        error,
        touched: isTouched,
        onChange,
        onBlur,
      })}
    </>
  );
}

// Form actions props
interface FormActionsProps {
  children: ReactNode;
}

// Form actions component
export function FormActions({ children }: FormActionsProps) {
  return <div className="form-actions">{children}</div>;
}