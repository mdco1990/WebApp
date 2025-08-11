import React from 'react';
import { useTranslation } from 'react-i18next';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

interface AuthScreenProps {
  isDarkMode: boolean;
  showRegister: boolean;
  setShowRegister: (show: boolean) => void;
  loginForm: { username: string; password: string };
  setLoginForm: (form: { username: string; password: string }) => void;
  registerForm: { username: string; password: string; email: string };
  setRegisterForm: (form: { username: string; password: string; email: string }) => void;
  authLoading: boolean;
  loginValidated: boolean;
  setLoginValidated: (validated: boolean) => void;
  registerValidated: boolean;
  setRegisterValidated: (validated: boolean) => void;
  rememberMe: boolean;
  setRememberMe: (remember: boolean) => void;
  onLogin: (username: string, password: string) => void;
  onRegister: (username: string, password: string, email: string) => void;
  onToggleDarkMode: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({
  isDarkMode,
  showRegister,
  setShowRegister,
  loginForm,
  setLoginForm,
  registerForm,
  setRegisterForm,
  authLoading,
  loginValidated,
  setLoginValidated,
  registerValidated,
  setRegisterValidated,
  rememberMe,
  setRememberMe,
  onLogin,
  onRegister,
  onToggleDarkMode,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className={`min-vh-100 d-flex align-items-center justify-content-center ${isDarkMode ? 'bg-dark' : 'bg-light'}`}
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            <div className={`card ${isDarkMode ? 'bg-secondary text-light' : 'bg-white'}`}>
              <div className="card-body">
                <h2 className="card-title text-center mb-4">
                  {showRegister ? t('auth.register') : t('auth.login')}
                </h2>

                {!showRegister ? (
                  <LoginForm
                    isDarkMode={isDarkMode}
                    values={loginForm}
                    onChange={setLoginForm}
                    loading={authLoading}
                    validated={loginValidated}
                    onValidatedChange={setLoginValidated}
                    rememberMe={rememberMe}
                    onRememberMeChange={setRememberMe}
                    onSubmit={(u, p) => onLogin(u, p)}
                  />
                ) : (
                  <RegisterForm
                    isDarkMode={isDarkMode}
                    values={registerForm}
                    onChange={setRegisterForm}
                    loading={authLoading}
                    validated={registerValidated}
                    onValidatedChange={setRegisterValidated}
                    onSubmit={(u, p, e) => onRegister(u, p, e)}
                  />
                )}

                <div className="text-center">
                  <button
                    className="btn btn-link"
                    onClick={() => setShowRegister(!showRegister)}
                    aria-label={
                      showRegister
                        ? t('auth.already', { defaultValue: 'Already have an account? Sign in' })
                        : t('auth.need', { defaultValue: "Don't have an account? Create one" })
                    }
                  >
                    {showRegister
                      ? t('auth.already', { defaultValue: 'Already have an account? Sign in' })
                      : t('auth.need', { defaultValue: "Don't have an account? Create one" })}
                  </button>
                </div>

                <div className="text-center mt-3">
                  <button className="btn btn-outline-secondary btn-sm" onClick={onToggleDarkMode}>
                    {isDarkMode ? t('nav.light') : t('nav.dark')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
