import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { hasRotation } from '@/domain/types';
import {
  summariseRound, rotationPosition, groupTotals, memberTotals, nextMeeting, nextScheduledPayout, paidPeriods,
} from '@/domain/round';
import { trackRoundTwo } from '@/application/analytics';
import {
  queryKeys, useContributions, usePayouts, useMeetings, useMembers, useRotation,
  useOverdueMembers, useContributionAdjustment,
} from '@/application/hooks/queries';

interface UseDashboardArgs {
  groupId: string;
  groupType?: string;
  groupCreatedAt?: string;
  contributionTarget?: number | null;
  isAdmin: boolean;
  userEmail?: string;
}

/**
 * Everything the Home screen shows, derived from cached queries through the
 * pure rules in domain/round. The component only renders what this returns.
 */
export function useDashboard({ groupId, groupType, groupCreatedAt, contributionTarget, isAdmin, userEmail }: UseDashboardArgs) {
  const qc = useQueryClient();
  const rotating = hasRotation(groupType);

  const contributionsQ = useContributions(groupId);
  const payoutsQ = usePayouts(groupId);
  const meetingsQ = useMeetings(groupId);
  const membersQ = useMembers(groupId);
  const rotationQ = useRotation(rotating ? groupId : undefined);
  const overdueQ = useOverdueMembers(groupId, isAdmin);
  const adjustmentQ = useContributionAdjustment(groupId);

  // Money changes elsewhere (contributions/payouts screens) without going
  // through React Query mutations, so show cached data instantly and refresh
  // it whenever Home opens.
  useEffect(() => {
    qc.invalidateQueries({ queryKey: queryKeys.contributions(groupId) });
    qc.invalidateQueries({ queryKey: queryKeys.payouts(groupId) });
    if (isAdmin) qc.invalidateQueries({ queryKey: queryKeys.overdue(groupId) });
  }, [qc, groupId, isAdmin]);

  const contributions = contributionsQ.data?.contributions ?? [];
  const payouts = payoutsQ.data?.payouts ?? [];
  const meetings = meetingsQ.data?.meetings ?? [];
  const members = membersQ.data?.members ?? [];
  const overdue = overdueQ.data?.members ?? [];
  const adjustment = adjustmentQ.data?.adjustment ?? 0;
  const rotation = rotationQ.data?.rotation ?? null;

  const summary = useMemo(() => {
    const now = new Date();
    const round = summariseRound({
      members,
      contributions,
      target: contributionTarget,
      lateEmails: new Set(overdue.map((o) => o.email)),
      now,
    });
    return {
      round,
      position: rotating ? rotationPosition(rotation) : rotationPosition(null),
      totals: groupTotals(contributions, payouts, adjustment),
      me: {
        ...memberTotals(userEmail, contributions, payouts),
        isMember: round.rows.some((r) => r.email === userEmail),
        paidThisPeriod: round.rows.some((r) => r.email === userEmail && r.state === 'paid'),
      },
      nextMeeting: nextMeeting(meetings, now),
      nextPayout: nextScheduledPayout(payouts),
      periodLabel: now.toLocaleDateString(undefined, { month: 'long' }),
    };
  }, [members, contributions, payouts, meetings, overdue, adjustment, rotation, rotating, contributionTarget, userEmail]);

  // Funnel: the group has kept recording into a second month.
  useEffect(() => {
    if (paidPeriods(contributions) >= 2) trackRoundTwo(groupId, groupCreatedAt, groupType);
  }, [contributions, groupId, groupCreatedAt, groupType]);

  // Core data only; optional extras (rotation, overdue, adjustment) degrade quietly.
  const core = [contributionsQ, payoutsQ, membersQ];
  const loading = core.some((q) => q.isLoading);
  const error = core.find((q) => q.error)?.error;

  const refresh = () => {
    [contributionsQ, payoutsQ, meetingsQ, membersQ, adjustmentQ].forEach((q) => q.refetch());
    // Disabled queries would fetch with an undefined id — only refetch live ones.
    if (rotating) rotationQ.refetch();
    if (isAdmin) overdueQ.refetch();
  };

  return {
    ...summary,
    adjustment,
    memberCount: members.length,
    rotating,
    loading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh,
  };
}
