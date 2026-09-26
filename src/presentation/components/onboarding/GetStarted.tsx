import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/presentation/ui/button';
import { JoinGroupDialog } from '@/presentation/components/groups/JoinGroupDialog';
import { groupTypeInfo } from '@/domain/groupTypes';
import { api } from '@/infrastructure/api';
import type { Group } from '@/domain/types';
import { CreateGroupWizard } from './CreateGroupWizard';

interface GetStartedProps {
  groups: Group[];
  onGroupsChanged: () => void;
  onSelectGroup: (groupId: string) => void;
}

/**
 * What someone sees with no group selected. First-timers go straight into
 * creating their own group; joining by code and a sample group are the
 * alternatives, never the default.
 */
export function GetStarted({ groups, onGroupsChanged, onSelectGroup }: GetStartedProps) {
  const [joinOpen, setJoinOpen] = useState(false);
  const [sampleBusy, setSampleBusy] = useState(false);

  const openSample = async () => {
    setSampleBusy(true);
    try {
      await api.createDemoGroup();
      onGroupsChanged();
    } catch {
      toast.error('Couldn’t open the sample group. Please try again.');
    } finally {
      setSampleBusy(false);
    }
  };

  if (groups.length > 0) {
    return (
      <section className="card max-w-xl mx-auto space-y-3" aria-label="Choose a group">
        <h2 className="t-heading text-lg">Choose a group</h2>
        <div className="ledger">
          {groups.map((g) => (
            <button key={g.id} type="button" className="ledger-row w-full text-left hover:bg-accent/40 px-1" onClick={() => onSelectGroup(g.id)}>
              <div className="min-w-0">
                <div className="ledger-row__who truncate">{g.name}</div>
                <div className="ledger-row__meta">{groupTypeInfo(g.groupType)?.label ?? 'Group'}{g.isDemo ? ' · sample' : ''}</div>
              </div>
              <div className="ledger-row__leader" />
              <span className="ledger-row__meta">Open</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div>
        <h1 className="t-display">Let’s set up your group</h1>
        <p className="text-sm text-muted-foreground mt-2">Three quick steps. You can record your first payment straight after.</p>
      </div>

      <CreateGroupWizard onCreated={onGroupsChanged} />

      <div className="card card--quiet grid gap-2 sm:grid-cols-2">
        <Button variant="outline" onClick={() => setJoinOpen(true)}>Already in a group? Join with a code</Button>
        <Button variant="ghost" onClick={openSample} disabled={sampleBusy}>
          {sampleBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Just looking? Explore a sample group
        </Button>
      </div>

      <JoinGroupDialog open={joinOpen} onOpenChange={setJoinOpen} onSuccess={() => { setJoinOpen(false); onGroupsChanged(); }} />
    </div>
  );
}
