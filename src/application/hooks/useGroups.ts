import { useState, useEffect, useRef } from "react";
import { api, getAccessToken } from "@/infrastructure/api";
import { toast } from "sonner";
import type { Session, Group } from "@/domain/types";

export function useGroups(session: Session | null) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const hasLoadedRef = useRef(false);

  const ensureDemoGroup = async (existingGroups: Group[]) => {
    // Silently create a demo group if the user doesn't have one
    const hasDemo = existingGroups.some((g: any) => g.isDemo);
    if (!hasDemo) {
      try {
        await api.createDemoGroup();
        // Reload groups to include the new demo group
        const data = await api.getGroups();
        setGroups(data.groups || []);
      } catch {
        // Non-fatal — don't block the user
      }
    }
  };

  const loadGroups = async () => {
    if (!session?.user?.id || !getAccessToken()) return;

    setGroupsLoading(true);
    try {
      const data = await api.getGroups();
      const loadedGroups = data.groups || [];
      setGroups(loadedGroups);
      // Ensure every user has a demo group (idempotent, runs in background)
      ensureDemoGroup(loadedGroups);
    } catch (error) {
      console.error("Failed to load groups:", error);
      toast.error("Failed to load groups. Check your connection and try again.");
    } finally {
      setGroupsLoading(false);
    }
  };

  const loadSelectedGroup = async () => {
    if (!session?.user?.id || !getAccessToken()) return;

    setLoading(true);
    try {
      const data = await api.getSelectedGroup();
      if (data.group) {
        setSelectedGroup(data.group);
      } else {
        // No selected group or group no longer exists
        setSelectedGroup(null);
      }
    } catch (error) {
      console.error("Failed to load selected group:", error);
      // Clear selected group if it's no longer accessible
      setSelectedGroup(null);
    } finally {
      setLoading(false);
    }
  };

  const selectGroup = async (groupId: string) => {
    if (!getAccessToken()) return;

    setLoading(true);
    try {
      await api.setSelectedGroup(groupId);
      const data = await api.getSelectedGroup();
      setSelectedGroup(data.group);

      // Reload groups to update counts
      await loadGroups();

      toast.success('Group switched successfully');
    } catch (error) {
      console.error('Failed to select group:', error);
      toast.error('Failed to switch group');
    } finally {
      setLoading(false);
    }
  };

  const refreshGroups = async () => {
    await loadGroups();
    await loadSelectedGroup();
  };

  useEffect(() => {
    // Only load once when session becomes available
    if (session?.user?.id && getAccessToken() && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadGroups();
      loadSelectedGroup();
    }
  }, [session?.user?.id]); // Only depend on user ID

  // Background refresh every 5 minutes to keep data fresh
  useEffect(() => {
    if (!session?.user?.id) return;
    const interval = setInterval(() => {
      if (getAccessToken()) {
        loadGroups();
        loadSelectedGroup();
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  return {
    groups,
    selectedGroup,
    loading,
    groupsLoading,
    loadGroups,
    selectGroup,
    refreshGroups,
  };
}
