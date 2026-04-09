import { useEffect, useState } from 'react';
import { api } from '@/infrastructure/api';

/**
 * Polls server for the number of items needing admin attention in this group.
 * Used to surface "More" menu badges so admins don't miss things.
 */
export function usePendingCounts(groupId: string | undefined, isAdmin: boolean) {
  const [counts, setCounts] = useState({ joinRequests: 0 });

  useEffect(() => {
    if (!groupId || !isAdmin) {
      setCounts({ joinRequests: 0 });
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const { requests } = await api.getJoinRequests(groupId);
        if (cancelled) return;
        const pending = requests.filter((r) => r.status === 'pending').length;
        setCounts({ joinRequests: pending });
      } catch {
        // ignore
      }
    };

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [groupId, isAdmin]);

  return counts;
}
