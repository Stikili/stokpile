/**
 * Loan book rules — chama table banking and VSLA.
 *
 * The group lends to its own members and sets the rate; Stokpile only keeps
 * the record. Never price, never score, never fund.
 *
 * Interest is flat: total due = amount borrowed × (1 + rate / 100), paid in
 * equal monthly instalments over the term. Two signatories release a loan
 * (one when the group has a single admin) and a borrower never signs their
 * own loan. The edge function enforces the same rules (loan_rules.ts).
 */
import { requiredApprovals } from './payouts';

export type LoanStatus = 'requested' | 'active' | 'repaid' | 'rejected';

export interface Loan {
  id: string;
  groupId: string;
  borrowerEmail: string;
  principal: number;
  ratePercent: number;
  termMonths: number;
  purpose?: string | null;
  status: LoanStatus;
  requestedBy: string;
  createdAt: string;
  releasedAt?: string | null;
  dueDate?: string | null;
  closedAt?: string | null;
  declineReason?: string | null;
  approvals: { approverEmail: string; approvedAt: string }[];
  repayments: { id: string; amount: number; paidOn: string; method?: string | null; recordedBy: string }[];
}

const cents = (n: number) => Math.round(n * 100);
const rands = (c: number) => c / 100;

export function totalDue(principal: number, ratePercent: number): number {
  return rands(Math.round(cents(principal) * (1 + ratePercent / 100)));
}

export function instalment(principal: number, ratePercent: number, termMonths: number): number {
  return rands(Math.ceil(cents(totalDue(principal, ratePercent)) / Math.max(1, termMonths)));
}

export function repaid(loan: Pick<Loan, 'repayments'>): number {
  return rands(loan.repayments.reduce((s, r) => s + cents(r.amount), 0));
}

export function outstanding(loan: Pick<Loan, 'principal' | 'ratePercent' | 'repayments'>): number {
  return Math.max(0, rands(cents(totalDue(loan.principal, loan.ratePercent)) - cents(repaid(loan))));
}

/** Whole months since release, capped at the term: how many instalments are due by now. */
export function instalmentsDue(loan: Pick<Loan, 'releasedAt' | 'termMonths'>, now = new Date()): number {
  if (!loan.releasedAt) return 0;
  const start = new Date(loan.releasedAt);
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
    - (now.getDate() < start.getDate() ? 1 : 0);
  return Math.min(loan.termMonths, Math.max(0, months));
}

/** Instalments covered by what has been repaid so far ("2 of 6"). */
export function instalmentsPaid(loan: Pick<Loan, 'principal' | 'ratePercent' | 'termMonths' | 'repayments'>): number {
  const each = instalment(loan.principal, loan.ratePercent, loan.termMonths);
  return Math.min(loan.termMonths, Math.floor(cents(repaid(loan)) / Math.max(1, cents(each))));
}

/** Late = active and repaid less than the instalments due by now. */
export function isLate(loan: Loan, now = new Date()): boolean {
  if (loan.status !== 'active') return false;
  if (loan.dueDate && new Date(`${loan.dueDate}T23:59:59`) < now && outstanding(loan) > 0) return true;
  return instalmentsPaid(loan) < instalmentsDue(loan, now);
}

export function daysLate(loan: Loan, now = new Date()): number {
  if (!isLate(loan, now) || !loan.releasedAt) return 0;
  const start = new Date(loan.releasedAt);
  const firstUnpaid = new Date(start);
  firstUnpaid.setMonth(start.getMonth() + instalmentsPaid(loan) + 1);
  return Math.max(0, Math.floor((now.getTime() - firstUnpaid.getTime()) / 86_400_000));
}

/** Can this admin sign? Never the borrower, never twice, only while requested. */
export function canApproveLoan(loan: Loan, viewer: { email?: string; isAdmin: boolean }): boolean {
  if (!viewer.isAdmin || !viewer.email || loan.status !== 'requested') return false;
  if (viewer.email === loan.borrowerEmail) return false;
  return !loan.approvals.some((a) => a.approverEmail === viewer.email);
}

/**
 * Signatures a loan needs. The borrower can't sign, so a borrowing admin
 * leaves one fewer possible signer; with nobody left (the only admin is
 * borrowing) the loan is blocked until the group has another admin.
 */
export function loanSignatures(loan: Pick<Loan, 'approvals'>, activeAdminCount: number, borrowerIsAdmin: boolean) {
  const available = Math.max(0, activeAdminCount - (borrowerIsAdmin ? 1 : 0));
  const required = requiredApprovals(available);
  const have = loan.approvals.length;
  return { have, required, complete: available > 0 && have >= required, blocked: available === 0 };
}

export function bookSummary(loans: Loan[], now = new Date()) {
  const active = loans.filter((l) => l.status === 'active');
  return {
    lentOut: active.reduce((s, l) => s + l.principal, 0),
    outstanding: active.reduce((s, l) => s + outstanding(l), 0),
    activeCount: active.length,
    lateCount: active.filter((l) => isLate(l, now)).length,
    awaitingApproval: loans.filter((l) => l.status === 'requested').length,
  };
}
