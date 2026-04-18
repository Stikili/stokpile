/**
 * React Query hooks that wrap the existing api.* methods.
 *
 * Benefits over raw useEffect + useState:
 * - Cached for 60s (no refetch on tab switch)
 * - Deduplicates parallel calls (5 components requesting the same data = 1 fetch)
 * - Background refetch on window focus
 * - Loading/error states handled automatically
 * - Stale-while-revalidate: shows cached data instantly, refreshes in background
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infrastructure/api';

// ─── Query keys ──────────────────────────────────────────────────────────
// Structured keys so we can invalidate at any granularity:
//   ['contributions', groupId] invalidates all contribution queries for that group
//   ['contributions'] invalidates ALL contribution queries

export const queryKeys = {
  groups: () => ['groups'] as const,
  group: (id: string) => ['groups', id] as const,
  members: (groupId: string) => ['members', groupId] as const,
  contributions: (groupId: string) => ['contributions', groupId] as const,
  payouts: (groupId: string) => ['payouts', groupId] as const,
  meetings: (groupId: string) => ['meetings', groupId] as const,
  announcements: (groupId: string) => ['announcements', groupId] as const,
  subscription: (groupId: string) => ['subscription', groupId] as const,
  health: (groupId: string) => ['health', groupId] as const,
  overdue: (groupId: string) => ['overdue', groupId] as const,
  leaderboard: (groupId: string) => ['leaderboard', groupId] as const,
  auditLog: (groupId: string) => ['auditLog', groupId] as const,
  notifications: () => ['notifications'] as const,
  sessions: () => ['sessions'] as const,
  profile: () => ['profile'] as const,
  referral: () => ['referral'] as const,
  bankDetails: () => ['bankDetails'] as const,
  rotation: (groupId: string) => ['rotation', groupId] as const,
  penalties: (groupId: string) => ['penalties', groupId] as const,
  grocery: (groupId: string) => ['grocery', groupId] as const,
  dependents: (groupId: string) => ['dependents', groupId] as const,
};

// ─── Read hooks ──────────────────────────────────────────────────────────

// ─── Static / rarely-changing data (long cache) ─────────────────────────
// These change at most a few times per month. Cache aggressively.

export function useGroups() {
  return useQuery({
    queryKey: queryKeys.groups(),
    queryFn: () => api.getGroups(),
    staleTime: 5 * 60_000,       // 5 min — group list rarely changes
    gcTime: 30 * 60_000,         // keep 30 min
  });
}

export function useMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.members(groupId!),
    queryFn: () => api.getMembers(groupId!),
    enabled: !!groupId,
    staleTime: 5 * 60_000,       // members change rarely
    gcTime: 30 * 60_000,
  });
}

export function useSubscription(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.subscription(groupId!),
    queryFn: () => api.getSubscription(groupId!),
    enabled: !!groupId,
    staleTime: 10 * 60_000,      // 10 min — almost never changes
    gcTime: 60 * 60_000,
  });
}

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile(),
    queryFn: () => api.getProfile(),
    staleTime: 10 * 60_000,      // profile changes very rarely
    gcTime: 60 * 60_000,
  });
}

export function useReferral() {
  return useQuery({
    queryKey: queryKeys.referral(),
    queryFn: () => api.getReferral(),
    staleTime: 10 * 60_000,
    gcTime: 60 * 60_000,
  });
}

export function useBankDetails() {
  return useQuery({
    queryKey: queryKeys.bankDetails(),
    queryFn: () => api.getBankDetails(),
    staleTime: 10 * 60_000,
    gcTime: 60 * 60_000,
  });
}

export function useRotation(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.rotation(groupId!),
    queryFn: () => api.getRotationOrder(groupId!),
    enabled: !!groupId,
    staleTime: 5 * 60_000,       // rotation order changes monthly
    gcTime: 30 * 60_000,
  });
}

export function useLeaderboard(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.leaderboard(groupId!),
    queryFn: () => api.getLeaderboard(groupId!),
    enabled: !!groupId,
    staleTime: 10 * 60_000,      // daily-refresh materialized view
    gcTime: 30 * 60_000,
  });
}

export function useSessions() {
  return useQuery({
    queryKey: queryKeys.sessions(),
    queryFn: () => api.getSessions(),
    staleTime: 5 * 60_000,       // sessions don't change often
    gcTime: 30 * 60_000,
  });
}

// ─── Dynamic data (short cache, refetch often) ──────────────────────────
// These change when users interact. Keep staleTime short.

export function useContributions(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.contributions(groupId!),
    queryFn: () => api.getContributions(groupId!),
    enabled: !!groupId,
    staleTime: 30_000,           // 30s — changes when members pay
  });
}

export function usePayouts(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.payouts(groupId!),
    queryFn: () => api.getPayouts(groupId!),
    enabled: !!groupId,
    staleTime: 30_000,           // 30s — status transitions
  });
}

export function useMeetings(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.meetings(groupId!),
    queryFn: () => api.getMeetings(groupId!),
    enabled: !!groupId,
    staleTime: 60_000,           // 1 min — meetings scheduled occasionally
  });
}

export function useAnnouncements(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.announcements(groupId!),
    queryFn: () => api.getAnnouncements(groupId!),
    enabled: !!groupId,
    staleTime: 60_000,           // 1 min
  });
}

export function useNotifications(groupId: string | undefined, userEmail: string | undefined) {
  return useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () => api.getNotifications(groupId!, userEmail!),
    enabled: !!groupId && !!userEmail,
    staleTime: 30_000,           // 30s — want to see new ones quickly
    refetchInterval: 60_000,     // poll every 60s
  });
}

// ─── Mutation helpers ────────────────────────────────────────────────────
// These invalidate the relevant cache after a successful write.

export function useInvalidate() {
  const qc = useQueryClient();
  return {
    contributions: (groupId: string) => qc.invalidateQueries({ queryKey: queryKeys.contributions(groupId) }),
    payouts: (groupId: string) => qc.invalidateQueries({ queryKey: queryKeys.payouts(groupId) }),
    meetings: (groupId: string) => qc.invalidateQueries({ queryKey: queryKeys.meetings(groupId) }),
    announcements: (groupId: string) => qc.invalidateQueries({ queryKey: queryKeys.announcements(groupId) }),
    members: (groupId: string) => qc.invalidateQueries({ queryKey: queryKeys.members(groupId) }),
    groups: () => qc.invalidateQueries({ queryKey: queryKeys.groups() }),
    notifications: () => qc.invalidateQueries({ queryKey: queryKeys.notifications() }),
    sessions: () => qc.invalidateQueries({ queryKey: queryKeys.sessions() }),
    profile: () => qc.invalidateQueries({ queryKey: queryKeys.profile() }),
    all: () => qc.invalidateQueries(),
  };
}
