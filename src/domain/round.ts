/**
 * Round domain — pure rules for "where is the group in its cycle, and who
 * has paid". No React, no I/O: everything here is a function of its inputs,
 * so it is unit-tested directly (see __tests__/round.test.ts).
 *
 * A "period" is the current calendar month, matching how contributions are
 * recorded today. For rotating types the period is also "this round".
 */
import type { Contribution, Meeting, Member, Payout, RotationOrder, RotationSlot } from './types';

export type PaymentState = 'paid' | 'late' | 'due';

export interface MemberRoundRow {
  email: string;
  name: string;
  state: PaymentState;
  /** Paid in this period (may be partial). */
  paid: number;
  /** Date of the latest payment this period. */
  paidOn?: string;
}

export interface RoundSummary {
  rows: MemberRoundRow[];
  collected: number;
  /** target × members; 0 when the group has no per-member target. */
  expected: number;
  paidCount: number;
  lateCount: number;
  outstanding: number;
  status: 'empty' | 'all_paid' | 'late' | 'due';
}

export const displayName = (first?: string, last?: string, fallback = ''): string =>
  `${first ?? ''} ${last ?? ''}`.trim() || fallback;

export const isInPeriod = (isoDate: string, now: Date): boolean => {
  const d = new Date(isoDate);
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

const STATE_ORDER: Record<PaymentState, number> = { late: 0, due: 1, paid: 2 };

/**
 * Who has paid this period. `lateEmails` comes from the server's overdue
 * rule (admins only); without it an unpaid member is "due", never "late".
 */
export function summariseRound(input: {
  members: Member[];
  contributions: Contribution[];
  target?: number | null;
  lateEmails?: ReadonlySet<string>;
  now?: Date;
}): RoundSummary {
  const now = input.now ?? new Date();
  const target = input.target && input.target > 0 ? input.target : 0;
  const late = input.lateEmails ?? new Set<string>();

  const paidBy = new Map<string, { amount: number; on: string }>();
  for (const c of input.contributions) {
    if (!c.paid || !isInPeriod(c.date, now)) continue;
    const prev = paidBy.get(c.userEmail);
    const on = prev && prev.on > c.date ? prev.on : c.date;
    paidBy.set(c.userEmail, { amount: (prev?.amount ?? 0) + c.amount, on });
  }

  const rows: MemberRoundRow[] = input.members
    .filter((m) => m.status === 'approved')
    .map((m) => {
      const p = paidBy.get(m.email);
      const paid = p?.amount ?? 0;
      const met = target ? paid >= target : paid > 0;
      const state: PaymentState = met ? 'paid' : late.has(m.email) ? 'late' : 'due';
      return { email: m.email, name: displayName(m.fullName, m.surname, m.email), state, paid, paidOn: p?.on };
    })
    .sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || a.name.localeCompare(b.name));

  const memberEmails = new Set(rows.map((r) => r.email));
  const collected = [...paidBy.entries()]
    .filter(([email]) => memberEmails.has(email))
    .reduce((s, [, p]) => s + p.amount, 0);
  const paidCount = rows.filter((r) => r.state === 'paid').length;
  const lateCount = rows.filter((r) => r.state === 'late').length;
  const outstanding = rows.length - paidCount;

  return {
    rows,
    collected,
    expected: target * rows.length,
    paidCount,
    lateCount,
    outstanding,
    status: rows.length === 0 ? 'empty' : outstanding === 0 ? 'all_paid' : lateCount > 0 ? 'late' : 'due',
  };
}

export interface RotationPosition {
  /** 1-indexed round; 0 when there is no rotation. */
  round: number;
  total: number;
  cycle: number;
  current?: RotationSlot;
  next?: RotationSlot;
}

/** current_position on the server is a 0-based index into slots. */
export function rotationPosition(rotation: RotationOrder | null | undefined): RotationPosition {
  const slots = rotation?.slots ?? [];
  if (!rotation || slots.length === 0) return { round: 0, total: 0, cycle: 1 };
  const index = Math.min(Math.max(rotation.currentPosition, 0), slots.length - 1);
  const next = slots.length > 1 ? slots[(index + 1) % slots.length] : undefined;
  return { round: index + 1, total: slots.length, cycle: rotation.currentCycle ?? 1, current: slots[index], next };
}

export interface GroupTotals {
  totalIn: number;
  totalOut: number;
  balance: number;
}

/** Paid contributions (plus any manual adjustment) less completed payouts. */
export function groupTotals(contributions: Contribution[], payouts: Payout[], adjustment = 0): GroupTotals {
  const totalIn = contributions.filter((c) => c.paid).reduce((s, c) => s + c.amount, 0) + adjustment;
  const totalOut = payouts.filter((p) => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  return { totalIn, totalOut, balance: totalIn - totalOut };
}

export interface MemberTotals {
  paidIn: number;
  owing: number;
  received: number;
}

export function memberTotals(email: string | undefined, contributions: Contribution[], payouts: Payout[]): MemberTotals {
  const mine = contributions.filter((c) => c.userEmail === email);
  return {
    paidIn: mine.filter((c) => c.paid).reduce((s, c) => s + c.amount, 0),
    owing: mine.filter((c) => !c.paid).reduce((s, c) => s + c.amount, 0),
    received: payouts
      .filter((p) => p.recipientEmail === email && p.status === 'completed')
      .reduce((s, p) => s + p.amount, 0),
  };
}

export function nextMeeting(meetings: Meeting[], now = new Date()): Meeting | undefined {
  return meetings
    .filter((m) => new Date(`${m.date}T${m.time || '00:00'}`) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
}

export function nextScheduledPayout(payouts: Payout[]): Payout | undefined {
  return payouts
    .filter((p) => p.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0];
}
