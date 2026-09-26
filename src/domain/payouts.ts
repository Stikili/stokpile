/**
 * Payout rules — two signatories release money (maker–checker).
 *
 * The admin who schedules a payout signs first; a different admin must
 * approve before it can be released. A group with a single admin can only
 * ever have one signature, so it needs one. The edge function enforces the
 * same rules (supabase/functions/.../payout_rules.ts); keep them in step.
 *
 *   scheduled ──release──▶ processing ──proof──▶ awaiting_confirmation
 *                                                   │            │
 *                                               completed     disputed ──▶ processing
 *   (any open state) ──▶ cancelled
 */
import type { Payout } from './types';

export type PayoutStatus = Payout['status'];

export interface PayoutApproval {
  approverEmail: string;
  approvedAt: string;
}

export const MAX_SIGNATORIES = 2;

export function requiredApprovals(activeAdminCount: number): number {
  return Math.max(1, Math.min(MAX_SIGNATORIES, activeAdminCount));
}

export interface SignatureState {
  required: number;
  have: number;
  signedBy: string[];
  complete: boolean;
  /** Can this admin add their signature now? */
  canSign: boolean;
}

export function signatureState(
  approvals: PayoutApproval[] | undefined,
  activeAdminCount: number,
  viewer: { email?: string; isAdmin: boolean },
): SignatureState {
  const signedBy = [...new Set((approvals ?? []).map((a) => a.approverEmail))];
  const required = requiredApprovals(activeAdminCount);
  const complete = signedBy.length >= required;
  return {
    required,
    have: signedBy.length,
    signedBy,
    complete,
    canSign: viewer.isAdmin && !!viewer.email && !complete && !signedBy.includes(viewer.email),
  };
}

export type Actor = 'admin' | 'recipient' | 'admin_for_managed_recipient' | 'member';

/**
 * Whether `actor` may move a payout from `from` to `to`. `signed` says
 * whether the payout has all its signatures.
 */
export function canTransition(from: PayoutStatus, to: PayoutStatus, actor: Actor, signed: boolean): boolean {
  const admin = actor === 'admin' || actor === 'admin_for_managed_recipient';
  const confirmer = actor === 'recipient' || actor === 'admin_for_managed_recipient';
  if (to === 'cancelled') return admin && from !== 'completed' && from !== 'cancelled';
  switch (`${from}->${to}`) {
    case 'scheduled->processing': return admin && signed;
    case 'processing->awaiting_confirmation': return admin;
    case 'awaiting_confirmation->completed':
    case 'awaiting_confirmation->disputed': return confirmer;
    case 'disputed->processing': return admin;
    default: return false;
  }
}
