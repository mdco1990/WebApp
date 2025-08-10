import { useState, useEffect } from 'react';

export const useTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const raw = localStorage.getItem('darkMode');
    if (raw === null) return false;
    try {
      return JSON.parse(raw) as boolean;
    } catch {
      return raw === 'true';
    }
  });

  const [currency, setCurrency] = useState<'EUR' | 'USD'>(
    () => (localStorage.getItem('currency') as 'EUR' | 'USD') || 'EUR'
  );

  const updateCurrency = (newCurrency: 'EUR' | 'USD') => {
    setCurrency(newCurrency);
    localStorage.setItem('currency', newCurrency);
  };

  useEffect(() => {
    // Toggle, don't overwrite existing classes
    document.body.classList.toggle('bg-dark', isDarkMode);
    document.body.classList.toggle('text-light', isDarkMode);
    document.body.classList.toggle('bg-light', !isDarkMode);
    document.body.classList.toggle('text-dark', !isDarkMode);
    // Bootstrap theme variable for components
    document.documentElement.setAttribute('data-bs-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  return {
    isDarkMode,
    setIsDarkMode,
    currency,
    setCurrency: updateCurrency,
  };
};
