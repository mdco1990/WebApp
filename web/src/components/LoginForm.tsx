import React from 'react';
import { Form, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

type LoginValues = { username: string; password: string };

type Props = {
  isDarkMode: boolean;
  values: LoginValues;
  onChange: (v: LoginValues) => void;
  loading: boolean;
  validated: boolean;
  onValidatedChange: (v: boolean) => void;
  rememberMe: boolean;
  onRememberMeChange: (v: boolean) => void;
  onSubmit: (username: string, password: string) => void;
};

const LoginForm: React.FC<Props> = ({
  isDarkMode,
  values,
  onChange,
  loading,
  validated,
  onValidatedChange,
  rememberMe,
  onRememberMeChange,
  onSubmit,
}) => {
  const { t } = useTranslation();

  return (
    <Form
      noValidate
      validated={validated}
      onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
        const form = e.currentTarget;
        if (!form.checkValidity()) {
          e.preventDefault();
          e.stopPropagation();
          onValidatedChange(true);
          return;
        }
        e.preventDefault();
        onValidatedChange(true);
        onSubmit(values.username, values.password);
      }}
    >
      <Form.Floating className="mb-3">
        <Form.Control
          type="text"
          id="username"
          placeholder=" "
          value={values.username}
          onChange={(e) => onChange({ ...values, username: e.target.value })}
          autoComplete="username"
          required
          disabled={loading}
          className={isDarkMode ? 'bg-dark text-light border-secondary' : ''}
        />
        <label htmlFor="username">{t('auth.username', { defaultValue: 'Username' })}</label>
        <Form.Control.Feedback type="invalid">
          {t('auth.requiredUsername', { defaultValue: 'Username is required.' })}
        </Form.Control.Feedback>
      </Form.Floating>
      <Form.Floating className="mb-2">
        <Form.Control
          type="password"
          id="password"
          placeholder=" "
          value={values.password}
          onChange={(e) => onChange({ ...values, password: e.target.value })}
          autoComplete="current-password"
          required
          disabled={loading}
          className={isDarkMode ? 'bg-dark text-light border-secondary' : ''}
        />
        <label htmlFor="password">{t('auth.password', { defaultValue: 'Password' })}</label>
        <Form.Control.Feedback type="invalid">
          {t('auth.requiredPassword', { defaultValue: 'Password is required.' })}
        </Form.Control.Feedback>
      </Form.Floating>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Form.Check
          type="checkbox"
          id="remember"
          label={t('auth.remember', { defaultValue: 'Remember me' })}
          checked={rememberMe}
          onChange={(e) => onRememberMeChange(e.currentTarget.checked)}
          disabled={loading}
        />
      </div>
      <button
        type="submit"
        className="btn btn-primary w-100 mb-3 d-inline-flex align-items-center justify-content-center"
        aria-label={t('auth.login', { defaultValue: 'Log in' })}
        disabled={loading}
      >
        {loading && (
          <Spinner as="span" animation="border" size="sm" aria-hidden="true" className="me-2" />
        )}
        {t('auth.login', { defaultValue: 'Log in' })}
      </button>
    </Form>
  );
};

export default LoginForm;
