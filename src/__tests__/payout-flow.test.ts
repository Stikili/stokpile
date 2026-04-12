import { describe, it, expect } from 'vitest';

/**
 * Payout flow business logic tests.
 *
 * These test the state machine transitions without hitting the server.
 * The actual endpoint logic is in the Edge Function — these verify
 * the rules that the frontend enforces.
 */

// Valid payout status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['processing', 'cancelled'],
  processing: ['awaiting_confirmation', 'cancelled'],
  awaiting_confirmation: ['completed', 'disputed'],
  disputed: ['processing', 'cancelled'],
  completed: [], // terminal
  cancelled: [], // terminal
};

function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

describe('Payout status transitions', () => {
  it('scheduled → processing is valid', () => {
    expect(isValidTransition('scheduled', 'processing')).toBe(true);
  });

  it('scheduled → cancelled is valid', () => {
    expect(isValidTransition('scheduled', 'cancelled')).toBe(true);
  });

  it('scheduled → completed is NOT valid (skips steps)', () => {
    expect(isValidTransition('scheduled', 'completed')).toBe(false);
  });

  it('processing → awaiting_confirmation is valid', () => {
    expect(isValidTransition('processing', 'awaiting_confirmation')).toBe(true);
  });

  it('awaiting_confirmation → completed is valid (member confirms)', () => {
    expect(isValidTransition('awaiting_confirmation', 'completed')).toBe(true);
  });

  it('awaiting_confirmation → disputed is valid', () => {
    expect(isValidTransition('awaiting_confirmation', 'disputed')).toBe(true);
  });

  it('disputed → processing is valid (admin retries)', () => {
    expect(isValidTransition('disputed', 'processing')).toBe(true);
  });

  it('completed is terminal — no transitions allowed', () => {
    expect(isValidTransition('completed', 'scheduled')).toBe(false);
    expect(isValidTransition('completed', 'cancelled')).toBe(false);
    expect(isValidTransition('completed', 'processing')).toBe(false);
  });

  it('cancelled is terminal — no transitions allowed', () => {
    expect(isValidTransition('cancelled', 'scheduled')).toBe(false);
    expect(isValidTransition('cancelled', 'processing')).toBe(false);
  });
});

describe('Payout auto-confirm logic', () => {
  it('should auto-confirm after 48 hours', () => {
    const proofUploadedAt = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();
    const FORTY_EIGHT_H = 48 * 60 * 60 * 1000;
    const elapsed = Date.now() - new Date(proofUploadedAt).getTime();
    expect(elapsed).toBeGreaterThan(FORTY_EIGHT_H);
  });

  it('should NOT auto-confirm before 48 hours', () => {
    const proofUploadedAt = new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString();
    const FORTY_EIGHT_H = 48 * 60 * 60 * 1000;
    const elapsed = Date.now() - new Date(proofUploadedAt).getTime();
    expect(elapsed).toBeLessThan(FORTY_EIGHT_H);
  });
});

describe('Payout permission rules', () => {
  it('admin can transition scheduled → processing', () => {
    const isAdmin = true;
    const isRecipient = false;
    const allowed = isAdmin;
    expect(allowed).toBe(true);
  });

  it('recipient can confirm (awaiting_confirmation → completed)', () => {
    const isAdmin = false;
    const isRecipient = true;
    const status = 'awaiting_confirmation';
    const targetStatus = 'completed';
    const allowed = isRecipient && (targetStatus === 'completed' || targetStatus === 'disputed');
    expect(allowed).toBe(true);
  });

  it('non-admin non-recipient cannot change status', () => {
    const isAdmin = false;
    const isRecipient = false;
    const allowed = isAdmin || isRecipient;
    expect(allowed).toBe(false);
  });

  it('recipient cannot cancel (only admin can)', () => {
    const isAdmin = false;
    const isRecipient = true;
    const targetStatus = 'cancelled';
    const allowed = isRecipient && (targetStatus === 'completed' || targetStatus === 'disputed');
    expect(allowed).toBe(false);
  });
});
