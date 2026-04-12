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

export function useGroups() {
  return useQuery({
    queryKey: queryKeys.groups(),
    queryFn: () => api.getGroups(),
  });
}

export function useMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.members(groupId!),
    queryFn: () => api.getMembers(groupId!),
    enabled: !!groupId,
  });
}

export function useContributions(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.contributions(groupId!),
    queryFn: () => api.getContributions(groupId!),
    enabled: !!groupId,
  });
}

export function usePayouts(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.payouts(groupId!),
    queryFn: () => api.getPayouts(groupId!),
    enabled: !!groupId,
  });
}

export function useMeetings(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.meetings(groupId!),
    queryFn: () => api.getMeetings(groupId!),
    enabled: !!groupId,
  });
}

export function useAnnouncements(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.announcements(groupId!),
    queryFn: () => api.getAnnouncements(groupId!),
    enabled: !!groupId,
  });
}

export function useSubscription(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.subscription(groupId!),
    queryFn: () => api.getSubscription(groupId!),
    enabled: !!groupId,
    staleTime: 5 * 60_000, // Subscription changes rarely — cache for 5 min
  });
}

export function useNotifications(groupId: string | undefined, userEmail: string | undefined) {
  return useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () => api.getNotifications(groupId!, userEmail!),
    enabled: !!groupId && !!userEmail,
    refetchInterval: 60_000, // Poll every 60s
  });
}

export function useLeaderboard(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.leaderboard(groupId!),
    queryFn: () => api.getLeaderboard(groupId!),
    enabled: !!groupId,
    staleTime: 5 * 60_000, // Changes slowly
  });
}

export function useRotation(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.rotation(groupId!),
    queryFn: () => api.getRotationOrder(groupId!),
    enabled: !!groupId,
  });
}

export function useSessions() {
  return useQuery({
    queryKey: queryKeys.sessions(),
    queryFn: () => api.getSessions(),
  });
}

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile(),
    queryFn: () => api.getProfile(),
  });
}

export function useReferral() {
  return useQuery({
    queryKey: queryKeys.referral(),
    queryFn: () => api.getReferral(),
  });
}

export function useBankDetails() {
  return useQuery({
    queryKey: queryKeys.bankDetails(),
    queryFn: () => api.getBankDetails(),
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
