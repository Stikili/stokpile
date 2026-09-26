// Server copy of the loan rules in src/domain/loans.ts — the app shows them,
// this file enforces them. Keep the two in step.
import { requiredApprovals } from './payout_rules.ts';

const cents = (n: number) => Math.round(n * 100);

export function totalDue(principal: number, ratePercent: number): number {
  return Math.round(cents(principal) * (1 + ratePercent / 100)) / 100;
}

export function outstanding(principal: number, ratePercent: number, repaidAmounts: number[]): number {
  const paid = repaidAmounts.reduce((s, a) => s + cents(a), 0);
  return Math.max(0, (cents(totalDue(principal, ratePercent)) - paid) / 100);
}

/** Borrower can't sign: a borrowing admin leaves one fewer possible signer. */
export function loanSignatures(have: number, activeAdminCount: number, borrowerIsAdmin: boolean) {
  const available = Math.max(0, activeAdminCount - (borrowerIsAdmin ? 1 : 0));
  const required = requiredApprovals(available);
  return { have, required, complete: available > 0 && have >= required, blocked: available === 0 };
}
