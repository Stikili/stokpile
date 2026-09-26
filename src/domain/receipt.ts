import type { Contribution, Member } from './types';
import { displayName, isActiveMember, isInPeriod } from './round';

/**
 * Receipt domain — the reference printed on every receipt.
 *
 * Format: STK-MMYY-NNNN. Short, stable, quotable over the phone. NNNN is a
 * per-group sequence number; until the stored counter exists, callers pass a
 * short code derived from the record id (see receiptRefFromId).
 */
export function receiptRef(seq: number, on: Date = new Date()): string {
  return `STK-${monthYear(on)}-${String(seq).padStart(4, '0')}`;
}

/** Interim reference from a record id: STK-MMYY-XXXX (first 4 hex chars). */
export function receiptRefFromId(id: string, on: Date): string {
  const code = id.replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase().padEnd(4, '0');
  return `STK-${monthYear(on)}-${code}`;
}

function monthYear(on: Date): string {
  return `${String(on.getMonth() + 1).padStart(2, '0')}${String(on.getFullYear()).slice(-2)}`;
}

// ─── Contribution receipt model ─────────────────────────────────────────────


export interface ReceiptLine {
  label: string;
  /** Constitution clause the line enforces, e.g. "3.3". */
  clause?: string;
  amount: number;
}

export interface ReceiptModel {
  ref: string;
  groupName: string;
  memberName: string;
  /** e.g. "Round 7 / 10 · Sep 2026", or just the period for non-rotating groups. */
  period: string;
  method?: string;
  capturedBy?: string;
  recordedAt: Date;
  lines: ReceiptLine[];
  total: number;
  /** Members paid this period once this entry is counted. */
  paidCount: number;
  memberCount: number;
}

export function buildContributionReceipt(input: {
  contribution: Contribution;
  groupName: string;
  members: Member[];
  /** All group contributions, to state how many have paid this period. */
  contributions: Contribution[];
  round?: { number: number; of: number };
  method?: string;
  penalties?: ReceiptLine[];
  locale?: string;
}): ReceiptModel {
  const c = input.contribution;
  const on = new Date(c.date);
  const byEmail = new Map(input.members.map((m) => [m.email, m]));
  const nameOf = (email?: string) => {
    if (!email) return undefined;
    const m = byEmail.get(email);
    return m ? displayName(m.fullName, m.surname, email) : email;
  };

  const monthLabel = on.toLocaleDateString(input.locale, { month: 'short', year: 'numeric' });
  const approved = input.members.filter(isActiveMember);
  const paidEmails = new Set(
    input.contributions.filter((x) => x.paid && isInPeriod(x.date, on)).map((x) => x.userEmail),
  );
  const lines: ReceiptLine[] = [{ label: 'Contribution', amount: c.amount }, ...(input.penalties ?? [])];

  return {
    ref: receiptRefFromId(c.id, on),
    groupName: input.groupName,
    memberName: nameOf(c.userEmail) ?? c.userEmail,
    period: input.round ? `Round ${input.round.number} / ${input.round.of} · ${monthLabel}` : monthLabel,
    method: input.method,
    capturedBy: c.createdBy && c.createdBy !== c.userEmail ? nameOf(c.createdBy) : undefined,
    recordedAt: new Date(c.createdAt || c.date),
    lines,
    total: lines.reduce((s, l) => s + l.amount, 0),
    paidCount: approved.filter((m) => paidEmails.has(m.email)).length,
    memberCount: approved.length,
  };
}

/** Plain-text version for WhatsApp / SMS. */
export function receiptText(r: ReceiptModel, format: (amount: number) => string): string {
  return [
    `*${r.groupName}* · Receipt ${r.ref}`,
    `${r.memberName} · ${r.period}`,
    ...r.lines.map((l) => `${l.label}${l.clause ? ` (clause ${l.clause})` : ''}: ${format(l.amount)}`),
    `Total: ${format(r.total)}`,
    `${r.paidCount}/${r.memberCount} paid this round`,
  ].join('\n');
}
