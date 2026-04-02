import { useEffect, useState } from 'react';
import type { RotationSlot } from '@/domain/types';
import { Button } from '@/presentation/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Badge } from '@/presentation/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/ui/tooltip';
import { ConfirmationDialog } from '@/presentation/shared/ConfirmationDialog';
import { UserAvatar } from '@/presentation/components/profile/UserAvatar';
import { RefreshCw, ArrowUp, ArrowDown, RotateCcw, ChevronRight, Shuffle } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';

interface RotationOrderViewProps {
  groupId: string;
  isAdmin: boolean;
  groupType: string;
}

interface RotationData {
  slots: RotationSlot[];
  currentPosition: number;
  currentCycle: number;
}

export function RotationOrderView({ groupId, isAdmin, groupType }: RotationOrderViewProps) {
  const [data, setData] = useState<RotationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [localSlots, setLocalSlots] = useState<RotationSlot[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [initConfirm, setInitConfirm] = useState(false);
  const [advanceConfirm, setAdvanceConfirm] = useState(false);
  const [initing, setIniting] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const isRotatingGroup = groupType === 'rotating' || groupType === 'susu';

  useEffect(() => {
    if (isRotatingGroup) load();
  }, [groupId, groupType]);

  const load = async () => {
    try {
      setLoading(true);
      const result = await api.getRotationOrder(groupId);
      setData(result);
      setLocalSlots(result.slots);
      setIsDirty(false);
    } catch {
      toast.error('Failed to load rotation order');
    } finally {
      setLoading(false);
    }
  };

  const handleInit = async () => {
    setIniting(true);
    try {
      await api.initRotationOrder(groupId);
      toast.success('Rotation initialized from member list');
      setInitConfirm(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to initialize rotation');
    } finally {
      setIniting(false);
    }
  };

  const handleAdvance = async () => {
    setAdvancing(true);
    try {
      await api.advanceRotation(groupId);
      toast.success('Rotation advanced to next member');
      setAdvanceConfirm(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to advance rotation');
    } finally {
      setAdvancing(false);
    }
  };

  const moveSlot = (index: number, direction: 'up' | 'down') => {
    const newSlots = [...localSlots];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSlots.length) return;
    [newSlots[index], newSlots[targetIndex]] = [newSlots[targetIndex], newSlots[index]];
    // Reassign positions
    const reindexed = newSlots.map((slot, i) => ({ ...slot, position: i + 1 }));
    setLocalSlots(reindexed);
    setIsDirty(true);
  };

  const handleSaveOrder = async () => {
    setSavingOrder(true);
    try {
      await api.reorderRotation(
        groupId,
        localSlots.map((s) => ({ email: s.email, position: s.position }))
      );
      toast.success('Rotation order saved');
      setIsDirty(false);
      setReordering(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save rotation order');
    } finally {
      setSavingOrder(false);
    }
  };

  const cancelReorder = () => {
    setLocalSlots(data?.slots ?? []);
    setIsDirty(false);
    setReordering(false);
  };

  const getMemberDisplayName = (slot: RotationSlot) => {
    if (slot.fullName && slot.surname) return `${slot.fullName} ${slot.surname}`;
    if (slot.fullName) return slot.fullName;
    return slot.email;
  };

  if (!isRotatingGroup) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          <RotateCcw className="h-10 w-10 mx-auto mb-3 opacity-30" />
          Rotation order is only available for rotating and susu groups.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Rotation Order
          </CardTitle>
          {data && (
            <Badge variant="secondary" className="text-xs">
              Cycle {data.currentCycle}
            </Badge>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            {reordering ? (
              <>
                <Button size="sm" variant="outline" onClick={cancelReorder} disabled={savingOrder}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveOrder} disabled={savingOrder || !isDirty}>
                  {savingOrder ? 'Saving...' : 'Save Order'}
                </Button>
              </>
            ) : (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReordering(true)}
                      disabled={!data || data.slots.length === 0}
                      aria-label="Reorder rotation"
                    >
                      <Shuffle className="h-4 w-4 mr-1" />
                      Reorder
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Drag members up/down to change order</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAdvanceConfirm(true)}
                      disabled={!data || data.slots.length === 0}
                      aria-label="Advance rotation"
                    >
                      <ChevronRight className="h-4 w-4 mr-1" />
                      Advance
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Move to the next member after payout</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" onClick={() => setInitConfirm(true)} aria-label="Initialize rotation">
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Initialize
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Auto-populate rotation from current members</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Loading rotation order...</div>
        ) : !data || data.slots.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            No rotation order set up yet.
            {isAdmin && ' Click "Initialize" to auto-populate from your group members.'}
          </div>
        ) : (
          <div className="space-y-2">
            {localSlots.map((slot, index) => {
              const isNext = slot.position === data.currentPosition;
              const displayName = getMemberDisplayName(slot);

              return (
                <div
                  key={slot.email}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                    isNext
                      ? 'border-primary bg-primary/5 dark:bg-primary/10'
                      : 'border-border bg-card'
                  }`}
                >
                  {/* Position number */}
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isNext
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {slot.position}
                  </span>

                  {/* Avatar */}
                  <UserAvatar
                    name={displayName}
                    email={slot.email}
                    profilePictureUrl={slot.profilePictureUrl}
                    size="sm"
                  />

                  {/* Name and email */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{slot.email}</p>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isNext && (
                      <Badge className="text-xs bg-primary/90 text-primary-foreground">
                        Next
                      </Badge>
                    )}
                    {slot.cycleReceived && (
                      <Badge variant="secondary" className="text-xs text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
                        Received
                      </Badge>
                    )}
                  </div>

                  {/* Reorder arrows */}
                  {reordering && isAdmin && (
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveSlot(index, 'up')}
                            disabled={index === 0}
                            aria-label="Move up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Move up</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveSlot(index, 'down')}
                            disabled={index === localSlots.length - 1}
                            aria-label="Move down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Move down</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Initialize confirmation */}
      <ConfirmationDialog
        open={initConfirm}
        onOpenChange={setInitConfirm}
        title="Initialize Rotation"
        description="This will overwrite the current rotation order and auto-populate it from the group's approved members. Are you sure?"
        onConfirm={handleInit}
        confirmText={initing ? 'Initializing...' : 'Initialize'}
        variant="default"
      />

      {/* Advance confirmation */}
      <ConfirmationDialog
        open={advanceConfirm}
        onOpenChange={setAdvanceConfirm}
        title="Advance Rotation"
        description="This will move the rotation pointer to the next member. Only do this after the current member's payout has been processed."
        onConfirm={handleAdvance}
        confirmText={advancing ? 'Advancing...' : 'Advance'}
        variant="default"
      />
    </Card>
  );
}
