import { describe, it, expect } from 'vitest';
import type { Contribution, Member, Payout, RotationOrder } from '@/domain/types';
import {
  summariseRound, rotationPosition, groupTotals, memberTotals, nextScheduledPayout, displayName,
} from '@/domain/round';

const NOW = new Date(2026, 8, 20); // 20 Sep 2026

const member = (email: string, fullName: string, status = 'approved'): Member =>
  ({ email, fullName, surname: 'X', role: 'member', status } as unknown as Member);

const paid = (userEmail: string, amount: number, date: string, isPaid = true): Contribution =>
  ({ id: `${userEmail}-${date}`, groupId: 'g', userEmail, amount, date, paid: isPaid, createdAt: date });

describe('summariseRound', () => {
  const members = [member('a@x', 'Ayanda'), member('b@x', 'Busi'), member('c@x', 'Cebo'), member('p@x', 'Pending', 'pending')];

  it('classifies paid, late and due, late first', () => {
    const r = summariseRound({
      members,
      contributions: [paid('a@x', 500, '2026-09-03')],
      target: 500,
      lateEmails: new Set(['b@x']),
      now: NOW,
    });
    expect(r.rows.map((x) => [x.name, x.state])).toEqual([
      ['Busi X', 'late'], ['Cebo X', 'due'], ['Ayanda X', 'paid'],
    ]);
    expect(r).toMatchObject({ collected: 500, expected: 1500, paidCount: 1, lateCount: 1, outstanding: 2, status: 'late' });
  });

  it('ignores last month, unpaid entries and non-approved members', () => {
    const r = summariseRound({
      members,
      contributions: [paid('a@x', 500, '2026-08-28'), paid('c@x', 500, '2026-09-02', false), paid('p@x', 500, '2026-09-02')],
      now: NOW,
    });
    expect(r.rows).toHaveLength(3);
    expect(r.collected).toBe(0);
    expect(r.status).toBe('due');
  });

  it('treats a part payment below target as not yet paid', () => {
    const r = summariseRound({ members, contributions: [paid('a@x', 200, '2026-09-05')], target: 500, now: NOW });
    const a = r.rows.find((x) => x.email === 'a@x')!;
    expect(a.state).toBe('due');
    expect(a.paid).toBe(200);
  });

  it('without a target any payment counts, and all paid is reported', () => {
    const r = summariseRound({
      members: members.slice(0, 2),
      contributions: [paid('a@x', 100, '2026-09-01'), paid('b@x', 50, '2026-09-10')],
      now: NOW,
    });
    expect(r.status).toBe('all_paid');
    expect(r.expected).toBe(0);
  });

  it('counts members added by name (managed) like joined members', () => {
    const r = summariseRound({
      members: [member('m@x', 'Gogo', 'managed'), member('a@x', 'Ayanda'), member('i@x', 'Gone', 'inactive')],
      contributions: [paid('m@x', 500, '2026-09-04')],
      now: NOW,
    });
    expect(r.rows.map((x) => x.email)).toEqual(['a@x', 'm@x']);
    expect(r.paidCount).toBe(1);
  });

  it('is empty with no approved members', () => {
    expect(summariseRound({ members: [], contributions: [], now: NOW }).status).toBe('empty');
  });
});

describe('rotationPosition', () => {
  const slots = ['a', 'b', 'c'].map((e, i) => ({ email: e, position: i, cycleReceived: false }));

  it('turns the 0-based server index into a 1-based round', () => {
    const p = rotationPosition({ groupId: 'g', slots, currentPosition: 1, currentCycle: 2 } as RotationOrder);
    expect(p).toMatchObject({ round: 2, total: 3, cycle: 2 });
    expect(p.current?.email).toBe('b');
    expect(p.next?.email).toBe('c');
  });

  it('wraps next to the start and clamps a bad index', () => {
    expect(rotationPosition({ groupId: 'g', slots, currentPosition: 2, currentCycle: 1 } as RotationOrder).next?.email).toBe('a');
    expect(rotationPosition({ groupId: 'g', slots, currentPosition: 9, currentCycle: 1 } as RotationOrder).round).toBe(3);
  });

  it('is round 0 with no rotation', () => {
    expect(rotationPosition(null)).toMatchObject({ round: 0, total: 0 });
  });
});

describe('totals', () => {
  const contributions = [paid('a@x', 500, '2026-09-01'), paid('a@x', 500, '2026-08-01', false), paid('b@x', 300, '2026-09-01')];
  const payouts = [
    { id: '1', groupId: 'g', recipientEmail: 'a@x', amount: 600, status: 'completed', scheduledDate: '2026-08-25' },
    { id: '2', groupId: 'g', recipientEmail: 'b@x', amount: 900, status: 'scheduled', scheduledDate: '2026-10-25' },
    { id: '3', groupId: 'g', recipientEmail: 'b@x', amount: 900, status: 'scheduled', scheduledDate: '2026-09-25' },
  ] as Payout[];

  it('group totals count paid contributions, the adjustment and completed payouts only', () => {
    expect(groupTotals(contributions, payouts, 100)).toEqual({ totalIn: 900, totalOut: 600, balance: 300 });
  });

  it('member totals split paid, owing and received', () => {
    expect(memberTotals('a@x', contributions, payouts)).toEqual({ paidIn: 500, owing: 500, received: 600 });
  });

  it('next scheduled payout is the earliest', () => {
    expect(nextScheduledPayout(payouts)?.id).toBe('3');
  });

  it('displayName falls back when names are missing', () => {
    expect(displayName(undefined, undefined, 'x@y')).toBe('x@y');
  });
});

import { parseMemberNames, GROUP_TYPES } from '@/domain/groupTypes';

describe('parseMemberNames', () => {
  it('splits lines and commas, trims, and drops blanks and duplicates', () => {
    expect(parseMemberNames('Thandi M\n  sipho  d ,\n\nThandi m, Precious')).toEqual(['Thandi M', 'sipho d', 'Precious']);
  });

  it('caps the list', () => {
    expect(parseMemberNames('a\nb\nc', 2)).toEqual(['a', 'b']);
  });
});

describe('GROUP_TYPES', () => {
  it('covers every group type once', () => {
    const types = GROUP_TYPES.map((t) => t.type);
    expect(new Set(types).size).toBe(types.length);
    expect(types).toEqual(expect.arrayContaining(['rotating', 'burial', 'grocery', 'chama', 'investment', 'goal', 'susu', 'tontine', 'vsla']));
  });
});
