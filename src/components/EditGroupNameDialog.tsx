import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Edit2, Loader2 } from 'lucide-react';
import { api } from '../utils/api';
import { toast } from 'sonner';

interface EditGroupNameDialogProps {
  groupId: string;
  currentName: string;
  onSuccess: () => void;
}

export function EditGroupNameDialog({ groupId, currentName, onSuccess }: EditGroupNameDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Group name cannot be empty');
      return;
    }

    if (name.trim() === currentName) {
      setOpen(false);
      return;
    }

    setSaving(true);
    try {
      await api.updateGroup(groupId, { name: name.trim() });
      toast.success('Group name updated successfully');
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update group name');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setName(currentName); // Reset to current name when opening
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Group Name</DialogTitle>
          <DialogDescription>
            Change the name of your group. Names must be unique.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter group name"
              maxLength={100}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
