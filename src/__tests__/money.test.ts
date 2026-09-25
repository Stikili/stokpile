import { describe, it, expect, beforeEach } from 'vitest';
import { money, toCents, receiptRef } from '@/lib/money';
import { setGroupCurrency } from '@/lib/export';

const NNBSP = ' ';
const NBSP = ' ';

describe('toCents', () => {
  it('rounds rand amounts to whole cents without float drift', () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(1200)).toBe(120000);
    expect(toCents(-12.345)).toBe(-1235);
  });
});

describe('money', () => {
  beforeEach(() => setGroupCurrency(null));

  it('formats rands with narrow-space thousands and no decimals by default', () => {
    expect(money(1200, { currency: 'ZAR' })).toBe(`R1${NNBSP}200`);
    expect(money(12000, { currency: 'ZAR' })).toBe(`R12${NNBSP}000`);
  });

  it('adds cents and a gap when decimals are requested', () => {
    expect(money(1250, { currency: 'ZAR', decimals: true })).toBe(`R${NBSP}1${NNBSP}250.00`);
    expect(money(0.1 + 0.2, { currency: 'ZAR', decimals: true })).toBe(`R${NBSP}0.30`);
  });

  it('formats Kenyan shillings with commas', () => {
    expect(money(18000, { currency: 'KES' })).toBe(`KSh${NBSP}18,000`);
  });

  it('uses a real minus sign, and + only when asked', () => {
    expect(money(-12000, { currency: 'ZAR' })).toBe(`−R12${NNBSP}000`);
    expect(money(1200, { currency: 'ZAR', sign: true })).toBe(`+R1${NNBSP}200`);
    expect(money(0, { currency: 'ZAR', sign: true })).toBe('R0');
  });

  it("follows the selected group's currency by default", () => {
    setGroupCurrency('KES');
    expect(money(7500)).toBe(`KSh${NBSP}7,500`);
  });
});

describe('receiptRef', () => {
  it('is STK-MMYY-NNNN', () => {
    expect(receiptRef(147, new Date(2026, 8, 18))).toBe('STK-0926-0147');
  });
});
