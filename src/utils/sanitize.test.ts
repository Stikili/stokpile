import { describe, it, expect } from 'vitest';
import { sanitizeAmount, sanitizeString, isValidEmail } from './sanitize';

describe('sanitizeAmount', () => {
  it('should parse valid string amounts', () => {
    expect(sanitizeAmount('100')).toBe(100);
    expect(sanitizeAmount('99.99')).toBe(99.99);
    expect(sanitizeAmount('0')).toBe(0);
    expect(sanitizeAmount('0.01')).toBe(0.01);
  });

  it('should pass through valid number amounts', () => {
    expect(sanitizeAmount(100)).toBe(100);
    expect(sanitizeAmount(0)).toBe(0);
    expect(sanitizeAmount(99.99)).toBe(99.99);
  });

  it('should round to 2 decimal places', () => {
    expect(sanitizeAmount('10.999')).toBe(11);
    expect(sanitizeAmount('10.555')).toBe(10.56);
    expect(sanitizeAmount(0.1 + 0.2)).toBe(0.3);
  });

  it('should throw on NaN', () => {
    expect(() => sanitizeAmount('abc')).toThrow('valid amount');
    expect(() => sanitizeAmount('')).toThrow('valid amount');
    expect(() => sanitizeAmount(NaN)).toThrow('valid amount');
  });

  it('should throw on negative amounts', () => {
    expect(() => sanitizeAmount(-1)).toThrow('negative');
    expect(() => sanitizeAmount('-50')).toThrow('negative');
  });

  it('should throw on excessively large amounts', () => {
    expect(() => sanitizeAmount(1_000_000_000)).toThrow('exceeds maximum');
  });

  it('should throw on Infinity', () => {
    expect(() => sanitizeAmount(Infinity)).toThrow('valid amount');
    expect(() => sanitizeAmount(-Infinity)).toThrow('valid amount');
  });
});

describe('sanitizeString', () => {
  it('should trim whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
    expect(sanitizeString('\n\thello\t\n')).toBe('hello');
  });

  it('should truncate to maxLength', () => {
    expect(sanitizeString('abcdefgh', 5)).toBe('abcde');
  });

  it('should return empty string for non-string input', () => {
    // @ts-expect-error - testing runtime safety
    expect(sanitizeString(null)).toBe('');
    // @ts-expect-error - testing runtime safety
    expect(sanitizeString(undefined)).toBe('');
    // @ts-expect-error - testing runtime safety
    expect(sanitizeString(123)).toBe('');
  });

  it('should handle empty strings', () => {
    expect(sanitizeString('')).toBe('');
    expect(sanitizeString('   ')).toBe('');
  });

  it('should use default maxLength of 10000', () => {
    const longString = 'a'.repeat(15000);
    expect(sanitizeString(longString).length).toBe(10000);
  });
});

describe('isValidEmail', () => {
  it('should accept valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('test.user@domain.co.za')).toBe(true);
    expect(isValidEmail('name+tag@gmail.com')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('missing@')).toBe(false);
    expect(isValidEmail('@nolocal.com')).toBe(false);
    expect(isValidEmail('has spaces@test.com')).toBe(false);
  });
});
