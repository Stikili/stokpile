import { useEffect, useState } from 'react';
import { api } from '@/infrastructure/api';

/**
 * Returns the number of unread announcements for the current user in this group.
 * "Unread" = createdAt > the last-seen timestamp stored in localStorage.
 */
export function useUnreadAnnouncements(groupId: string | undefined, activeTab: string) {
  const [unreadCount, setUnreadCount] = useState(0);

  const storageKey = groupId ? `announcements-last-seen-${groupId}` : null;

  useEffect(() => {
    if (!groupId || !storageKey) {
      setUnreadCount(0);
      return;
    }

    let cancelled = false;

    const computeUnread = async () => {
      try {
        const { announcements } = await api.getAnnouncements(groupId);
        if (cancelled) return;
        const lastSeen = localStorage.getItem(storageKey);
        const lastSeenMs = lastSeen ? new Date(lastSeen).getTime() : 0;
        const count = announcements.filter(
          (a) => new Date(a.createdAt).getTime() > lastSeenMs
        ).length;
        setUnreadCount(count);
      } catch {
        // ignore
      }
    };

    computeUnread();
    // Poll every 60 seconds while group is open
    const interval = setInterval(computeUnread, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [groupId, storageKey]);

  // Mark as read whenever the announcements tab becomes active
  useEffect(() => {
    if (activeTab === 'announcements' && storageKey) {
      localStorage.setItem(storageKey, new Date().toISOString());
      setUnreadCount(0);
    }
  }, [activeTab, storageKey]);

  return unreadCount;
}
