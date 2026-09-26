import { describe, it, expect, vi, beforeEach } from 'vitest';

const track = vi.fn();
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));

import { trackSignup, trackContributionRecorded, trackRoundTwo } from '@/application/analytics';
import { paidPeriods } from '@/domain/round';

beforeEach(() => {
  localStorage.clear();
  track.mockClear();
});

describe('funnel events', () => {
  it('first contribution fires once, with minutes since signup', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T10:00:00'));
    trackSignup();
    vi.setSystemTime(new Date('2026-10-01T10:02:30'));
    trackContributionRecorded();
    trackContributionRecorded();
    vi.useRealTimers();
    const first = track.mock.calls.filter(([e]) => e === 'first_contribution');
    expect(first).toEqual([['first_contribution', { minutes_since_signup: 3 }]]);
  });

  it('round 2 counts only groups created since tracking began, once each', () => {
    trackRoundTwo('old', '2026-01-01T00:00:00Z', 'rotating');
    trackRoundTwo('new', '2026-10-02T00:00:00Z', 'rotating');
    trackRoundTwo('new', '2026-10-02T00:00:00Z', 'rotating');
    expect(track.mock.calls).toEqual([['group_round_2', { type: 'rotating' }]]);
  });
});

describe('paidPeriods', () => {
  const c = (date: string, paid = true) => ({ id: date, groupId: 'g', userEmail: 'a', amount: 1, date, paid, createdAt: date });
  it('counts distinct months with a paid contribution', () => {
    expect(paidPeriods([c('2026-09-01'), c('2026-09-20'), c('2026-10-02'), c('2026-11-01', false)])).toBe(2);
  });
});
