import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  parseLocaleAmount,
  mergeSources,
  getCurrencySymbol,
  formatMonth,
} from '../AppUtils';
import type { IncomeSource, OutcomeSource } from '../../types/budget';

describe('AppUtils', () => {
  it('formatCurrency returns expected currency strings', () => {
    const usd = formatCurrency(123456, 'en', 'USD');
    expect(usd).toMatch(/\$\s?1,234\.56/);

    const eur = formatCurrency(123456, 'fr', 'EUR');
    // Allow different kinds of spaces used in locales (regular, NBSP, NNBSP)
    const normalized = eur.replace(/[\u00A0\u202F\s]/g, ' ');
    expect(normalized).toMatch(/1 234,56/);

    expect(getCurrencySymbol('USD')).toBe('$');
    expect(getCurrencySymbol('EUR')).toBe('€');
  });

  it('parseLocaleAmount handles various formats and signs', () => {
    expect(parseLocaleAmount('1,234.56')).toBeCloseTo(1234.56);
    expect(parseLocaleAmount('1.234,56')).toBeCloseTo(1234.56);
    expect(parseLocaleAmount('12.34')).toBeCloseTo(12.34);
    expect(parseLocaleAmount('12,34')).toBeCloseTo(12.34);
    expect(parseLocaleAmount('-1,234.56')).toBeCloseTo(-1234.56);
    expect(parseLocaleAmount('+1,234.56')).toBeCloseTo(1234.56);
    expect(parseLocaleAmount('')).toBe(0);
    expect(parseLocaleAmount('abc')).toBe(0);
  });

  it('mergeSources keeps incoming and unique unsaved previous items, dedup by name', () => {
    const incoming: IncomeSource[] = [
      { id: 1, name: 'Salary', amount_cents: 100000 },
      { id: 2, name: 'Bonus', amount_cents: 50000 },
    ];
    const prev: OutcomeSource[] = [
      { id: 0, name: 'Bonus', amount_cents: 50000 }, // duplicate by name -> drop
      { id: 0, name: 'Side', amount_cents: 1000 }, // unique unsaved -> keep
    ];

    const result = mergeSources(incoming, prev);
    const names = result.map((s) => s.name);

    expect(names).toContain('Salary');
    expect(names).toContain('Bonus');
    expect(names).toContain('Side');
    expect(names.filter((n) => n === 'Bonus').length).toBe(1);
  });

  it('formatMonth returns localized month names', () => {
    const d = new Date('2025-02-15T00:00:00Z');
    const mLong = formatMonth(d, 'long');
    const mShort = formatMonth(d, 'short');
    expect(typeof mLong).toBe('string');
    expect(typeof mShort).toBe('string');
    expect(mLong.length).toBeGreaterThanOrEqual(3);
    expect(mShort.length).toBeGreaterThanOrEqual(3);
  });
});
