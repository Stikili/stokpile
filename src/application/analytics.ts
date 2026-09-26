import { track } from '@/lib/analytics';

/**
 * Onboarding funnel events (design kit v2, ONBOARDING.md). Three numbers
 * decide whether the way in works:
 *
 *   time to first contribution   signup → first payment logged   target < 3 min p50
 *   groups reaching round 2      still logging a month later     target > 40%
 *   invites sent                 the group actually spreads
 *
 * Events go to Plausible via track(); nothing personal is sent. "Once" flags
 * live in localStorage so a refresh can't double-count.
 */

const SIGNED_UP_AT = 'stokpile-signed-up-at';
/** Funnel tracking started here; older groups would skew round-2 retention. */
const FUNNEL_START = new Date('2026-09-26T00:00:00');
const FIRST_CONTRIBUTION = 'stokpile-first-contribution-sent';
const ROUND_TWO = (groupId: string) => `stokpile-round2-${groupId}`;

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* storage blocked: skip */ }
}

export function trackSignup() {
  write(SIGNED_UP_AT, String(Date.now()));
  track('signup');
}

export function trackGroupCreated(groupType: string, memberCount: number) {
  track('group_created', { type: groupType, members: memberCount });
}

/** Call whenever a contribution is recorded; only the first one is sent. */
export function trackContributionRecorded() {
  if (read(FIRST_CONTRIBUTION)) return;
  write(FIRST_CONTRIBUTION, '1');
  const signedUpAt = Number(read(SIGNED_UP_AT));
  const minutes = signedUpAt ? Math.round((Date.now() - signedUpAt) / 60_000) : -1;
  track('first_contribution', { minutes_since_signup: minutes });
}

export function trackInviteSent(channel: 'link' | 'whatsapp' | 'sms' | 'share' | 'email' | 'csv') {
  track('invite_sent', { channel });
}

/** A group has contributions in two different months: it survived round one. */
export function trackRoundTwo(groupId: string, groupCreatedAt: string | undefined, groupType?: string) {
  if (!groupCreatedAt || new Date(groupCreatedAt) < FUNNEL_START) return;
  if (read(ROUND_TWO(groupId))) return;
  write(ROUND_TWO(groupId), '1');
  track('group_round_2', { type: groupType ?? 'unknown' });
}
