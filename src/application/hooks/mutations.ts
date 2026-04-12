/**
 * Optimistic mutation hooks.
 *
 * Pattern: update the UI immediately, then confirm with the server.
 * If the server fails, roll back the optimistic change automatically.
 *
 * Uses React Query's onMutate / onError / onSettled lifecycle.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infrastructure/api';
import { queryKeys } from './queries';
import { toast } from 'sonner';

/**
 * Optimistically mark a contribution as paid/unpaid.
 * Updates the cache immediately, then syncs with server.
 */
export function useUpdateContribution(groupId: string) {
  const qc = useQueryClient();
  const key = queryKeys.contributions(groupId);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.updateContribution(id, data),

    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await qc.cancelQueries({ queryKey: key });

      // Snapshot previous value
      const previous = qc.getQueryData(key);

      // Optimistically update
      qc.setQueryData(key, (old: any) => {
        if (!old?.contributions) return old;
        return {
          ...old,
          contributions: old.contributions.map((c: any) =>
            c.id === id ? { ...c, ...data } : c
          ),
        };
      });

      return { previous };
    },

    onError: (_err, _vars, context) => {
      // Roll back on error
      if (context?.previous) {
        qc.setQueryData(key, context.previous);
      }
      toast.error('Failed to update — change reverted');
    },

    onSettled: () => {
      // Refetch to ensure server state is in sync
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

/**
 * Optimistically update payout status.
 */
export function useUpdatePayout(groupId: string) {
  const qc = useQueryClient();
  const key = queryKeys.payouts(groupId);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.updatePayout(id, data),

    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData(key);

      qc.setQueryData(key, (old: any) => {
        if (!old?.payouts) return old;
        return {
          ...old,
          payouts: old.payouts.map((p: any) =>
            p.id === id ? { ...p, ...data } : p
          ),
        };
      });

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(key, context.previous);
      }
      toast.error('Failed to update — change reverted');
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

/**
 * Create contribution with optimistic insert.
 */
export function useCreateContribution(groupId: string) {
  const qc = useQueryClient();
  const key = queryKeys.contributions(groupId);

  return useMutation({
    mutationFn: (data: any) => api.createContribution(data),

    onMutate: async (newData) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData(key);

      // Add a temporary entry
      const temp = {
        id: `temp-${Date.now()}`,
        ...newData,
        createdAt: new Date().toISOString(),
        _optimistic: true,
      };

      qc.setQueryData(key, (old: any) => ({
        ...old,
        contributions: [temp, ...(old?.contributions || [])],
      }));

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
      toast.error('Failed to create contribution');
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },

    onSuccess: () => {
      toast.success('Contribution recorded');
    },
  });
}

/**
 * Delete contribution with optimistic removal.
 */
export function useDeleteContribution(groupId: string) {
  const qc = useQueryClient();
  const key = queryKeys.contributions(groupId);

  return useMutation({
    mutationFn: (id: string) => api.deleteContribution(id),

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData(key);

      qc.setQueryData(key, (old: any) => ({
        ...old,
        contributions: (old?.contributions || []).filter((c: any) => c.id !== id),
      }));

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
      toast.error('Failed to delete');
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },

    onSuccess: () => {
      toast.success('Contribution deleted');
    },
  });
}
