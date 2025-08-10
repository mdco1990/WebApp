import React from 'react'
import { Form, Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'

type RegisterValues = { username: string; password: string; email: string }

type Props = {
  isDarkMode: boolean
  values: RegisterValues
  onChange: (v: RegisterValues) => void
  loading: boolean
  validated: boolean
  onValidatedChange: (v: boolean) => void
  onSubmit: (username: string, password: string, email: string) => void
}

const RegisterForm: React.FC<Props> = ({
  isDarkMode,
  values,
  onChange,
  loading,
  validated,
  onValidatedChange,
  onSubmit,
}) => {
  const { t } = useTranslation()

  return (
    <Form noValidate validated={validated} onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
      const form = e.currentTarget
      if (!form.checkValidity()) {
        e.preventDefault()
        e.stopPropagation()
        onValidatedChange(true)
        return
      }
      e.preventDefault()
      onValidatedChange(true)
      onSubmit(values.username, values.password, values.email)
    }}>
      <Form.Floating className="mb-3">
        <Form.Control
          type="text"
          id="reg-username"
          placeholder=" "
          value={values.username}
          onChange={(e) => onChange({ ...values, username: e.target.value })}
          autoComplete="username"
          required
          disabled={loading}
          className={isDarkMode ? 'bg-dark text-light border-secondary' : ''}
        />
        <label htmlFor="reg-username">{t('auth.username', { defaultValue: 'Username' })}</label>
        <Form.Control.Feedback type="invalid">{t('auth.requiredUsername', { defaultValue: 'Username is required.' })}</Form.Control.Feedback>
      </Form.Floating>
      <Form.Floating className="mb-3">
        <Form.Control
          type="email"
          id="reg-email"
          placeholder=" "
          value={values.email}
          onChange={(e) => onChange({ ...values, email: e.target.value })}
          disabled={loading}
          className={isDarkMode ? 'bg-dark text-light border-secondary' : ''}
        />
        <label htmlFor="reg-email">{t('auth.email', { defaultValue: 'Email (optional)' })}</label>
      </Form.Floating>
      <Form.Floating className="mb-3">
        <Form.Control
          type="password"
          id="reg-password"
          placeholder=" "
          value={values.password}
          onChange={(e) => onChange({ ...values, password: e.target.value })}
          autoComplete="new-password"
          required
          disabled={loading}
          className={isDarkMode ? 'bg-dark text-light border-secondary' : ''}
        />
        <label htmlFor="reg-password">{t('auth.password', { defaultValue: 'Password' })}</label>
        <Form.Control.Feedback type="invalid">{t('auth.requiredPassword', { defaultValue: 'Password is required.' })}</Form.Control.Feedback>
      </Form.Floating>
      <button type="submit" className="btn btn-success w-100 mb-3 d-inline-flex align-items-center justify-content-center" aria-label={t('auth.register', { defaultValue: 'Register' })} disabled={loading}>
        {loading && <Spinner as="span" animation="border" size="sm" aria-hidden="true" className="me-2" />}
        {t('auth.register', { defaultValue: 'Register' })}
      </button>
    </Form>
  )
}

export default RegisterForm
