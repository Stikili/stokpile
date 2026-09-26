import { describe, it, expect } from 'vitest';
import { quorumRequired, resolveOutcome, tallyLine } from '@/domain/meetings';

describe('quorumRequired', () => {
  it('rounds up the share of members', () => {
    expect(quorumRequired(12, 50)).toBe(6);
    expect(quorumRequired(15, 50)).toBe(8);
    expect(quorumRequired(10, 66)).toBe(7);
  });

  it('stays between one and everyone', () => {
    expect(quorumRequired(0, 50)).toBe(1);
    expect(quorumRequired(3, 1)).toBe(1);
    expect(quorumRequired(3, 250)).toBe(3);
  });
});

describe('resolveOutcome', () => {
  it('passes with quorum and a majority', () => {
    expect(resolveOutcome({ yes: 7, no: 2, present: 9, eligible: 12 })).toEqual({ outcome: 'passed', quorum: 6, quorumMet: true });
  });

  it('a tie does not pass', () => {
    expect(resolveOutcome({ yes: 4, no: 4, present: 8, eligible: 12 }).outcome).toBe('rejected');
  });

  it('without quorum nothing is decided, whatever the tally', () => {
    expect(resolveOutcome({ yes: 5, no: 0, present: 5, eligible: 12 }).outcome).toBe('no_quorum');
  });
});

describe('tallyLine', () => {
  it('reads like the minute book', () => {
    expect(tallyLine({ yes: 7, no: 2, eligible: 12, quorum: 8 })).toBe('7 for · 2 against · 3 not voted · quorum 8');
  });
});
