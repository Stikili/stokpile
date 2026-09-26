import { describe, it, expect } from 'vitest';
import {
  totalDue, instalment, outstanding, instalmentsPaid, instalmentsDue, isLate,
  canApproveLoan, loanSignatures, bookSummary, type Loan,
} from '@/domain/loans';

const loan = (over: Partial<Loan> = {}): Loan => ({
  id: 'l1', groupId: 'g', borrowerEmail: 'w@x', principal: 18000, ratePercent: 10, termMonths: 6,
  status: 'active', requestedBy: 'w@x', createdAt: '2026-06-01', releasedAt: '2026-06-05T10:00:00',
  dueDate: '2026-12-05', approvals: [], repayments: [], ...over,
});
const pay = (amount: number, paidOn = '2026-07-05') => ({ id: paidOn + amount, amount, paidOn, recordedBy: 'a@x' });

describe('money', () => {
  it('flat interest set by the group, equal instalments', () => {
    expect(totalDue(18000, 10)).toBe(19800);
    expect(instalment(18000, 10, 6)).toBe(3300);
    expect(totalDue(1000, 0)).toBe(1000);
  });

  it('outstanding never goes negative', () => {
    expect(outstanding(loan({ repayments: [pay(3300), pay(3300)] }))).toBe(13200);
    expect(outstanding(loan({ repayments: [pay(25000)] }))).toBe(0);
  });
});

describe('schedule', () => {
  it('counts instalments covered and due', () => {
    const l = loan({ repayments: [pay(3300), pay(3300)] });
    expect(instalmentsPaid(l)).toBe(2);
    expect(instalmentsDue(l, new Date('2026-09-20'))).toBe(3);
  });

  it('is late when behind the schedule or past the due date', () => {
    expect(isLate(loan({ repayments: [pay(3300), pay(3300)] }), new Date('2026-09-20'))).toBe(true);
    expect(isLate(loan({ repayments: [pay(3300), pay(3300), pay(3300)] }), new Date('2026-09-20'))).toBe(false);
    expect(isLate(loan({ repayments: [pay(19000)] }), new Date('2027-01-10'))).toBe(true);
    expect(isLate(loan({ status: 'repaid' }), new Date('2027-01-10'))).toBe(false);
  });
});

describe('signatures', () => {
  it('a borrower never signs their own loan, and no one signs twice', () => {
    const l = loan({ status: 'requested', borrowerEmail: 'a@x', approvals: [{ approverEmail: 'b@x', approvedAt: '' }] });
    expect(canApproveLoan(l, { email: 'a@x', isAdmin: true })).toBe(false);
    expect(canApproveLoan(l, { email: 'b@x', isAdmin: true })).toBe(false);
    expect(canApproveLoan(l, { email: 'c@x', isAdmin: true })).toBe(true);
    expect(canApproveLoan(l, { email: 'm@x', isAdmin: false })).toBe(false);
  });

  it('needs two signers, fewer when the borrower is one of few admins, blocked when none remain', () => {
    expect(loanSignatures({ approvals: [] }, 3, false)).toMatchObject({ required: 2, blocked: false });
    expect(loanSignatures({ approvals: [] }, 2, true)).toMatchObject({ required: 1, blocked: false });
    expect(loanSignatures({ approvals: [] }, 1, true)).toMatchObject({ blocked: true, complete: false });
  });
});

describe('bookSummary', () => {
  it('totals the active book', () => {
    const s = bookSummary([
      loan({ repayments: [pay(3300), pay(3300)] }),
      loan({ id: 'l2', principal: 5000, ratePercent: 0, termMonths: 5, repayments: [pay(1000), pay(1000), pay(1000)] }),
      loan({ id: 'l3', status: 'requested' }),
    ], new Date('2026-09-20'));
    expect(s).toMatchObject({ lentOut: 23000, outstanding: 15200, activeCount: 2, lateCount: 1, awaitingApproval: 1 });
  });
});
