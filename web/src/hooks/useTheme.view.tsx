import React, { createContext, useContext, useMemo, useState } from 'react';

type Currency = 'EUR' | 'USD';

type ThemeContextValue = {
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const raw = localStorage.getItem('darkMode');
    if (raw === null) return false;
    try {
      return JSON.parse(raw) as boolean;
    } catch {
      return raw === 'true';
    }
  });

  const [currency, setCurrency] = useState<Currency>(
    () => (localStorage.getItem('currency') as Currency) || 'EUR'
  );

  const setIsDarkModePersist = (dark: boolean) => {
    setIsDarkMode(dark);
    localStorage.setItem('darkMode', JSON.stringify(dark));
  };

  const setCurrencyPersist = (c: Currency) => {
    setCurrency(c);
    localStorage.setItem('currency', c);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      isDarkMode,
      setIsDarkMode: setIsDarkModePersist,
      currency,
      setCurrency: setCurrencyPersist,
    }),
    [isDarkMode, currency]
  );

  // Scope Bootstrap theming and text/bg classes to the app subtree without touching document/body
  const themeClass = isDarkMode ? 'bg-dark text-light' : 'bg-light text-dark';
  const dataTheme = isDarkMode ? 'dark' : 'light';

  return (
    <ThemeContext.Provider value={value}>
      <div data-bs-theme={dataTheme} className={themeClass} style={{ minHeight: '100vh' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};
