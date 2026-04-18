import { useEffect, useState, useRef } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/presentation/ui/button';
import { GroupActionsButtons } from '@/presentation/components/groups/GroupActionsButtons';
import { api } from '@/infrastructure/api';
import type { Group } from '@/domain/types';

interface DemoGroupAutoCreateProps {
  groups: Group[];
  groupsLoading: boolean;
  onCreated: () => void;
}

export function DemoGroupAutoCreate({ groups, groupsLoading, onCreated }: DemoGroupAutoCreateProps) {
  const [creating, setCreating] = useState(false);
  const [failed, setFailed] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    // Auto-create demo group if user has 0 groups (first-time user)
    if (groupsLoading || groups.length > 0 || attempted.current || creating) return;
    attempted.current = true;

    const create = async () => {
      setCreating(true);
      try {
        await api.createDemoGroup();
        onCreated();
      } catch {
        setFailed(true);
      } finally {
        setCreating(false);
      }
    };
    create();
  }, [groups, groupsLoading, onCreated, creating]);

  // Creating demo group — show loader
  if (creating) {
    return (
      <div className="text-center py-16 animate-fade-in">
        <div className="bg-white dark:bg-card rounded-lg p-8 max-w-md mx-auto shadow-lg border border-border">
          <Loader2 className="h-10 w-10 mx-auto mb-4 text-primary animate-spin" />
          <h2 className="text-lg font-semibold mb-2">Setting up your demo group</h2>
          <p className="text-sm text-muted-foreground">
            Creating 6 months of sample data so you can explore every feature...
          </p>
        </div>
      </div>
    );
  }

  // Failed or user dismissed — show normal empty state
  if (failed || (attempted.current && groups.length === 0)) {
    return (
      <div className="text-center py-8 animate-fade-in">
        <div className="bg-white dark:bg-card rounded-lg p-6 max-w-md mx-auto shadow-lg border border-border">
          <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h2 className="text-lg mb-1.5">Get Started</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first group or join an existing one.
          </p>
          <GroupActionsButtons onSuccess={onCreated} />
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 text-xs text-muted-foreground"
            onClick={async () => {
              setCreating(true);
              setFailed(false);
              attempted.current = false;
              try {
                await api.createDemoGroup();
                onCreated();
              } catch {
                setFailed(true);
              } finally {
                setCreating(false);
              }
            }}
          >
            or try the demo group
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
