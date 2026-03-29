import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Label } from '@/presentation/ui/label';
import { Switch } from '@/presentation/ui/switch';
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

        <div className="bg-muted p-3 rounded-lg text-sm">
          <p className="text-muted-foreground">
            💡 <strong>Note:</strong> These settings can only be changed by group administrators.
            {!payoutsAllowed && ' Disabling payouts will hide the payouts tab for all members.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
