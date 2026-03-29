import { useState } from 'react';
import { Button } from '@/presentation/ui/button';
import { Input } from '@/presentation/ui/input';
import { Label } from '@/presentation/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/ui/dialog';
import { UserPlus } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';

interface JoinGroupDialogProps {
  onSuccess: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function JoinGroupDialog({ onSuccess, open: controlledOpen, onOpenChange }: JoinGroupDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.joinGroup(groupName, groupCode || undefined);
      toast.success('Join request submitted! Waiting for admin approval.');
      setOpen(false);
      setGroupName('');
      setGroupCode('');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to join group');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start">
          <UserPlus className="h-4 w-4 mr-2" />
          Join Group
        </Button>
      </DialogTrigger>
      {open && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Existing Group</DialogTitle>
            <DialogDescription>
              Enter the group name and code (if required) provided by the group admin
            </DialogDescription>
          </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter the group name"
              required
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="groupCode">Group Code (Optional)</Label>
            <Input
              id="groupCode"
              value={groupCode}
              onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
              placeholder="Enter the group code if required"
              disabled={submitting}
              maxLength={8}
            />
            <p className="text-xs text-muted-foreground">
              Required for private groups, optional for public groups
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Request to Join'}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Ask the group admin for the Group Name and Group Code (if the group is private)
          </p>
        </form>
      </DialogContent>
      )}
    </Dialog>
  );
}
