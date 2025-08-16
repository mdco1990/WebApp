import React from 'react';
import { Form, FormField, FormActions } from './FormComponents';

// Example form data type
interface ExpenseFormData extends Record<string, unknown> {
  description: string;
  amount_cents: number;
  category: string;
  year: number;
  month: number;
}

// Example form component using compound components
export function ExpenseForm() {
  const initialValues: ExpenseFormData = {
    description: '',
    amount_cents: 0,
    category: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  };

  const handleSubmit = async (values: ExpenseFormData) => {
    console.log('Submitting expense:', values);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const validate = (values: ExpenseFormData) => {
    const errors: Partial<Record<keyof ExpenseFormData, string>> = {};
    
    if (!values.description.trim()) {
      errors.description = 'Description is required';
    }
    
    if (values.amount_cents <= 0) {
      errors.amount_cents = 'Amount must be positive';
    }
    
    if (!values.category.trim()) {
      errors.category = 'Category is required';
    }
    
    return errors;
  };

  return (
    <Form<ExpenseFormData>
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validate={validate}
    >
      {(formProps) => (
        <div>
          <FormField field="description">
            {({ value, error, touched, onChange, onBlur }) => (
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <input
                  id="description"
                  type="text"
                  value={value as string}
                  onChange={(e) => onChange(e.target.value as ExpenseFormData['description'])}
                  onBlur={onBlur}
                  className={`form-control ${error && touched ? 'is-invalid' : ''}`}
                />
                {error && touched && <div className="invalid-feedback">{error}</div>}
              </div>
            )}
          </FormField>

          <FormField field="amount_cents">
            {({ value, error, touched, onChange, onBlur }) => (
              <div className="form-group">
                <label htmlFor="amount">Amount (cents)</label>
                <input
                  id="amount"
                  type="number"
                  value={value as number}
                  onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                  onBlur={onBlur}
                  className={`form-control ${error && touched ? 'is-invalid' : ''}`}
                />
                {error && touched && <div className="invalid-feedback">{error}</div>}
              </div>
            )}
          </FormField>

          <FormField field="category">
            {({ value, error, touched, onChange, onBlur }) => (
              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  value={value as string}
                  onChange={(e) => onChange(e.target.value as ExpenseFormData['category'])}
                  onBlur={onBlur}
                  className={`form-control ${error && touched ? 'is-invalid' : ''}`}
                >
                  <option value="">Select category</option>
                  <option value="food">Food</option>
                  <option value="transport">Transport</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="utilities">Utilities</option>
                </select>
                {error && touched && <div className="invalid-feedback">{error}</div>}
              </div>
            )}
          </FormField>

          <FormField field="year">
            {({ value, onChange }) => (
              <div className="form-group">
                <label htmlFor="year">Year</label>
                <input
                  id="year"
                  type="number"
                  value={value as number}
                  onChange={(e) => onChange(parseInt(e.target.value) || new Date().getFullYear())}
                  className="form-control"
                />
              </div>
            )}
          </FormField>

          <FormField field="month">
            {({ value, onChange }) => (
              <div className="form-group">
                <label htmlFor="month">Month</label>
                <input
                  id="month"
                  type="number"
                  min="1"
                  max="12"
                  value={value as number}
                  onChange={(e) => onChange(parseInt(e.target.value) || 1)}
                  className="form-control"
                />
              </div>
            )}
          </FormField>

          <FormActions>
            <button type="submit" className="btn btn-primary" disabled={formProps.isSubmitting}>
              {formProps.isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={formProps.reset}>
              Reset
            </button>
          </FormActions>
        </div>
      )}
    </Form>
  );
}