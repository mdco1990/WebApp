import { IncomeSource, OutcomeSource } from '../types/budget';

// Utility functions extracted from App.tsx to reduce file size
export const mergeSources = (
  incomingList: IncomeSource[] | OutcomeSource[] | undefined,
  prevList: IncomeSource[] | OutcomeSource[] | undefined
): (IncomeSource | OutcomeSource)[] => {
  const incoming = Array.isArray(incomingList) ? incomingList : [];
  const unsaved = (prevList || []).filter((s) => !s.id || s.id === 0);
  const dedupUnsaved = unsaved.filter((s) => !incoming.some((i) => i.name === s.name));
  return [...incoming, ...dedupUnsaved];
};

export const formatCurrency = (cents: number, locale: string, currency: string): string => {
  const localeCode = locale?.startsWith('fr') ? 'fr-FR' : 'en-US';
  const currencyCode = currency === 'EUR' ? 'EUR' : 'USD';
  return new Intl.NumberFormat(localeCode, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(cents / 100);
};

export const getCurrencySymbol = (currency: string): string => {
  return currency === 'EUR' ? '€' : '$';
};

export const formatMonth = (date: Date, length: 'long' | 'short' = 'long'): string => {
  const locale = date.toLocaleDateString().includes('/') ? 'en-US' : 'fr-FR';
  return new Intl.DateTimeFormat(locale, { month: length }).format(date);
};

export const getPageTitle = (
  currentDate: Date,
  t: (key: string, opts?: Record<string, unknown>) => string
): string => {
  const monthName = formatMonth(currentDate, 'long');
  return t('app.title', { month: monthName, year: currentDate.getFullYear() });
};

export const parseLocaleAmount = (value: string): number => {
  if (!value || value.trim() === '') return 0;

  // Remove everything except digits, comma, dot, and minus/plus
  let cleaned = value.trim().replace(/[^0-9,.\-+]/g, '');

  // Handle sign
  const isNegative = cleaned.startsWith('-');
  if (isNegative || cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Optimized separator handling
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  let normalized = cleaned;
  if (lastComma > lastDot) {
    // Comma is decimal separator: "1.234,56" or "12,56"
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // Dot is decimal separator: "1,234.56" or "12.56"
    normalized = cleaned.replace(/,/g, '');
  }
  // If no separators or equal positions, use as-is

  const parsed = Number.parseFloat(normalized);
  const result = Number.isFinite(parsed) ? parsed : 0;

  return isNegative ? -result : result;
};

export const getYearMonth = (currentDate: Date): { year: number; month: number } => {
  const curYear = currentDate.getFullYear();
  const curMonth = currentDate.getMonth() + 1;
  return { year: curYear, month: curMonth };
};
