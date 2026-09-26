import { describe, it, expect } from 'vitest';
import { requiredApprovals, signatureState, canTransition } from '@/domain/payouts';

const sig = (email: string) => ({ approverEmail: email, approvedAt: '2026-09-26T10:00:00Z' });

describe('two signatories', () => {
  it('needs two signatures, or one when the group has a single admin', () => {
    expect(requiredApprovals(1)).toBe(1);
    expect(requiredApprovals(2)).toBe(2);
    expect(requiredApprovals(3)).toBe(2);
    expect(requiredApprovals(0)).toBe(1);
  });

  it('the scheduling admin cannot sign twice; a second admin completes it', () => {
    const one = signatureState([sig('a@x')], 3, { email: 'a@x', isAdmin: true });
    expect(one).toMatchObject({ required: 2, have: 1, complete: false, canSign: false });
    expect(signatureState([sig('a@x')], 3, { email: 'b@x', isAdmin: true }).canSign).toBe(true);
    expect(signatureState([sig('a@x'), sig('b@x')], 3, { email: 'c@x', isAdmin: true })).toMatchObject({ complete: true, canSign: false });
  });

  it('members never sign', () => {
    expect(signatureState([sig('a@x')], 2, { email: 'm@x', isAdmin: false }).canSign).toBe(false);
  });
});

describe('payout transitions', () => {
  it('release needs full signatures', () => {
    expect(canTransition('scheduled', 'processing', 'admin', false)).toBe(false);
    expect(canTransition('scheduled', 'processing', 'admin', true)).toBe(true);
  });

  it('only the recipient confirms or disputes; an admin may confirm for a managed member', () => {
    expect(canTransition('awaiting_confirmation', 'completed', 'recipient', true)).toBe(true);
    expect(canTransition('awaiting_confirmation', 'disputed', 'recipient', true)).toBe(true);
    expect(canTransition('awaiting_confirmation', 'completed', 'admin', true)).toBe(false);
    expect(canTransition('awaiting_confirmation', 'completed', 'admin_for_managed_recipient', true)).toBe(true);
  });

  it('cannot skip steps or reopen a finished payout', () => {
    expect(canTransition('scheduled', 'completed', 'admin', true)).toBe(false);
    expect(canTransition('completed', 'cancelled', 'admin', true)).toBe(false);
    expect(canTransition('processing', 'cancelled', 'member', true)).toBe(false);
    expect(canTransition('disputed', 'processing', 'admin', true)).toBe(true);
  });
});
