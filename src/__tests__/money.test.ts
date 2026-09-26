import { describe, it, expect, beforeEach } from 'vitest';
import { money, toCents } from '@/lib/money';
import { receiptRef, receiptRefFromId, buildContributionReceipt, receiptText } from '@/domain/receipt';
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

  it('derives an interim code from a record id', () => {
    expect(receiptRefFromId('a3f2-9b1c-uuid', new Date(2026, 8, 18))).toBe('STK-0926-A3F2');
  });
});

describe('buildContributionReceipt', () => {
  const members = [
    { email: 'a@x', fullName: 'Ayanda', surname: 'M', role: 'admin', status: 'approved' },
    { email: 'b@x', fullName: 'Busi', surname: 'K', role: 'member', status: 'approved' },
  ] as never[];
  const c = (id: string, userEmail: string, date: string, createdBy?: string) =>
    ({ id, groupId: 'g', userEmail, amount: 1200, date, paid: true, createdAt: `${date}T19:42:00`, createdBy });

  it('builds the receipt the member forwards', () => {
    const contributions = [c('a3f2-1', 'b@x', '2026-09-18', 'a@x'), c('x', 'a@x', '2026-09-02')];
    const r = buildContributionReceipt({
      contribution: contributions[0], groupName: 'Masakhane', members, contributions,
      round: { number: 7, of: 10 },
      penalties: [{ label: 'Late penalty', clause: '3.3', amount: 50 }],
      locale: 'en-ZA',
    });
    expect(r.ref).toBe('STK-0926-A3F2');
    expect(r.memberName).toBe('Busi K');
    expect(r.capturedBy).toBe('Ayanda M');
    expect(r.period.startsWith('Round 7 / 10')).toBe(true);
    expect(r.total).toBe(1250);
    expect([r.paidCount, r.memberCount]).toEqual([2, 2]);
    expect(receiptText(r, String)).toContain('Late penalty (clause 3.3): 50');
  });

  it('omits "captured by" when the member recorded it themselves', () => {
    const own = c('b1', 'b@x', '2026-09-18', 'b@x');
    expect(buildContributionReceipt({ contribution: own, groupName: 'G', members, contributions: [own] }).capturedBy).toBeUndefined();
  });
});
