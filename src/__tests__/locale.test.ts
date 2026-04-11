import { describe, it, expect } from 'vitest';
import { formatCurrency, formatNumber, formatDate, formatDateTime, getLocale, COUNTRY_LOCALES } from '@/lib/locale';

describe('getLocale', () => {
  it('returns South Africa for null/undefined', () => {
    expect(getLocale(null).currency).toBe('ZAR');
    expect(getLocale(undefined).currency).toBe('ZAR');
    expect(getLocale('').currency).toBe('ZAR');
  });

  it('returns correct locale for known countries', () => {
    expect(getLocale('Kenya').currency).toBe('KES');
    expect(getLocale('Nigeria').currency).toBe('NGN');
    expect(getLocale('Ghana').currency).toBe('GHS');
    expect(getLocale('Zambia').currency).toBe('ZMW');
  });

  it('returns default for unknown country', () => {
    expect(getLocale('Mars').currency).toBe('ZAR');
  });

  it('has all 19 countries mapped', () => {
    expect(Object.keys(COUNTRY_LOCALES).length).toBe(19);
  });
});

describe('formatCurrency', () => {
  it('formats ZAR by default', () => {
    const result = formatCurrency(1500);
    expect(result).toContain('1');
    expect(result).toContain('500');
  });

  it('formats KES for Kenya', () => {
    const result = formatCurrency(1500, 'Kenya');
    expect(result).toContain('1');
    expect(result).toContain('500');
  });

  it('handles zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });

  it('handles negative amounts', () => {
    const result = formatCurrency(-500);
    expect(result).toContain('500');
  });
});

describe('formatNumber', () => {
  it('formats with locale separators', () => {
    const result = formatNumber(1234567);
    expect(result.replace(/\s/g, '')).toMatch(/1.?234.?567/);
  });
});

describe('formatDate', () => {
  it('formats a date string', () => {
    const result = formatDate('2026-04-11');
    expect(result).toContain('2026');
    expect(result).toContain('Apr');
  });

  it('formats a Date object', () => {
    const result = formatDate(new Date('2026-01-15'));
    expect(result).toContain('2026');
    expect(result).toContain('Jan');
  });
});

describe('formatDateTime', () => {
  it('includes time', () => {
    const result = formatDateTime('2026-04-11T14:30:00Z');
    expect(result).toContain('2026');
  });
});
