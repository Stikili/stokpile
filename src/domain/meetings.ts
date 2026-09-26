/**
 * Meeting rules — quorum and formal resolutions.
 *
 * A formal resolution only binds the group if enough members were there to
 * decide it. Quorum is a percentage of current members, set per group
 * (default 50%). When a vote closes, the numbers are frozen so the record
 * never changes afterwards, even if members join or leave.
 *
 * The edge function enforces the same rules (meeting_rules.ts); keep the two
 * in step.
 */

export const DEFAULT_QUORUM_PERCENT = 50;

export type ResolutionOutcome = 'passed' | 'rejected' | 'no_quorum';

/** Members needed for a quorum: always at least one, never more than everyone. */
export function quorumRequired(eligible: number, percent: number = DEFAULT_QUORUM_PERCENT): number {
  if (eligible <= 0) return 1;
  const p = Math.min(100, Math.max(1, Math.round(percent)));
  return Math.min(eligible, Math.max(1, Math.ceil((eligible * p) / 100)));
}

/**
 * Present = members marked present at the meeting; for a vote held outside a
 * meeting, everyone who voted counts as present.
 */
export function resolveOutcome(input: {
  yes: number;
  no: number;
  present: number;
  eligible: number;
  quorumPercent?: number;
}): { outcome: ResolutionOutcome; quorum: number; quorumMet: boolean } {
  const quorum = quorumRequired(input.eligible, input.quorumPercent);
  const quorumMet = input.present >= quorum;
  const outcome: ResolutionOutcome = !quorumMet ? 'no_quorum' : input.yes > input.no ? 'passed' : 'rejected';
  return { outcome, quorum, quorumMet };
}

/** "7 for · 2 against · 3 not voted · quorum 8" */
export function tallyLine(t: { yes: number; no: number; eligible: number; quorum: number }): string {
  const notVoted = Math.max(0, t.eligible - t.yes - t.no);
  return `${t.yes} for · ${t.no} against · ${notVoted} not voted · quorum ${t.quorum}`;
}

export const OUTCOME_LABEL: Record<ResolutionOutcome, string> = {
  passed: 'Passed',
  rejected: 'Not passed',
  no_quorum: 'No quorum',
};
