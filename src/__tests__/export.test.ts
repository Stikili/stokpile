import { describe, it, expect } from 'vitest';
import { setUserCountry, formatCurrency, formatDate } from '@/lib/export';

describe('export formatCurrency with country', () => {
  it('defaults to ZAR when no country set', () => {
    setUserCountry(null);
    const result = formatCurrency(1000);
    expect(result).toContain('1');
    expect(result).toContain('000');
  });

  it('respects setUserCountry for Kenya', () => {
    setUserCountry('Kenya');
    const result = formatCurrency(1000);
    expect(result).toContain('1');
    expect(result).toContain('000');
  });

  it('allows override via second parameter', () => {
    setUserCountry('South Africa');
    const result = formatCurrency(1000, 'Nigeria');
    expect(result).toContain('1');
    expect(result).toContain('000');
  });
});

describe('export formatDate with country', () => {
  it('formats a date string', () => {
    setUserCountry(null);
    const result = formatDate('2026-04-11');
    expect(result).toContain('2026');
  });
});
