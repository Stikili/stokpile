import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Label } from '@/presentation/ui/label';
import { Switch } from '@/presentation/ui/switch';
import { Input } from '@/presentation/ui/input';
import { Button } from '@/presentation/ui/button';
import { DEFAULT_QUORUM_PERCENT } from '@/domain/meetings';
import { ConfirmationDialog } from '@/presentation/shared/ConfirmationDialog';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';
import type { Group } from '@/domain/types';

interface GroupSettingsCardProps {
  group: Group;
  onUpdate: () => void;
}

export function GroupSettingsCard({ group, onUpdate }: GroupSettingsCardProps) {
  const [isPublic, setIsPublic] = useState(group.isPublic);
  const [payoutsAllowed, setPayoutsAllowed] = useState(group.payoutsAllowed);
  const [updating, setUpdating] = useState<string | null>(null);
  const [confirmDisablePayouts, setConfirmDisablePayouts] = useState(false);
  const [quorum, setQuorum] = useState(String(group.quorumPercent ?? DEFAULT_QUORUM_PERCENT));

  const saveQuorum = async () => {
    const value = Math.round(Number(quorum));
    if (!Number.isFinite(value) || value < 1 || value > 100) {
      toast.error('Quorum must be between 1% and 100%');
      return;
    }
    setUpdating('quorum');
    try {
      await api.updateGroup(group.id, { quorumPercent: value });
      toast.success(`Quorum set to ${value}% of members`);
      onUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update quorum');
    } finally {
      setUpdating(null);
    }
  };

  const handleToggleVisibility = async (checked: boolean) => {
    setUpdating('visibility');
    setIsPublic(checked);
    
    try {
      await api.updateGroup(group.id, { isPublic: checked });
      toast.success(`Group is now ${checked ? 'Public' : 'Private'}`);
      onUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update group visibility');
      setIsPublic(!checked); // Revert on error
    } finally {
      setUpdating(null);
    }
  };

  const handleTogglePayouts = async (checked: boolean) => {
    if (!checked) {
      // Ask for confirmation before disabling
      setConfirmDisablePayouts(true);
      return;
    }
    await applyPayoutsToggle(true);
  };

  const applyPayoutsToggle = async (checked: boolean) => {
    setUpdating('payouts');
    setPayoutsAllowed(checked);

    try {
      await api.updateGroup(group.id, { payoutsAllowed: checked });
      toast.success(`Payouts ${checked ? 'enabled' : 'disabled'}`);
      onUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update payout settings');
      setPayoutsAllowed(!checked); // Revert on error
    } finally {
      setUpdating(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Group Settings</CardTitle>
        <CardDescription>
          Manage group visibility and features (Admin only)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="visibility" className="text-base">
              Public Visibility
            </Label>
            <p className="text-sm text-muted-foreground">
              {isPublic 
                ? 'Anyone can see this group exists' 
                : 'Group is only visible to members'}
            </p>
          </div>
          <Switch
            id="visibility"
            checked={isPublic}
            onCheckedChange={handleToggleVisibility}
            disabled={updating === 'visibility'}
          />
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="payouts" className="text-base">
                Payouts Enabled
              </Label>
              <p className="text-sm text-muted-foreground">
                {payoutsAllowed 
                  ? 'Admins can schedule and manage payouts' 
                  : 'Payout feature is disabled for this group'}
              </p>
            </div>
            <Switch
              id="payouts"
              checked={payoutsAllowed}
              onCheckedChange={handleTogglePayouts}
              disabled={updating === 'payouts'}
            />
          </div>
        </div>

        <div className="border-t pt-6 space-y-2">
          <Label htmlFor="quorum" className="text-base">Quorum for resolutions</Label>
          <p className="text-sm text-muted-foreground">
            Share of members who must be present for a formal resolution to count. Most constitutions use 50%.
          </p>
          <div className="flex items-center gap-2">
            <Input id="quorum" type="number" inputMode="numeric" min={1} max={100} value={quorum}
              onChange={(e) => setQuorum(e.target.value)} className="w-24" />
            <span className="text-sm text-muted-foreground">%</span>
            <Button size="sm" variant="outline" onClick={saveQuorum}
              disabled={updating === 'quorum' || Number(quorum) === (group.quorumPercent ?? DEFAULT_QUORUM_PERCENT)}>
              Save
            </Button>
          </div>
        </div>

        <div className="bg-muted p-3 rounded-lg text-sm">
          <p className="text-muted-foreground">
            💡 <strong>Note:</strong> These settings can only be changed by group administrators.
            {!payoutsAllowed && ' Disabling payouts will hide the payouts tab for all members.'}
          </p>
        </div>
      </CardContent>

      <ConfirmationDialog
        open={confirmDisablePayouts}
        onOpenChange={setConfirmDisablePayouts}
        title="Disable Payouts?"
        description="This will hide the Payouts tab for all members and prevent new payouts from being scheduled. Existing payout records will not be deleted."
        confirmText="Disable Payouts"
        variant="destructive"
        onConfirm={() => applyPayoutsToggle(false)}
      />
    </Card>
  );
}
