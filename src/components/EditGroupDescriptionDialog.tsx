import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Edit2, Loader2 } from 'lucide-react';
import { api } from '../utils/api';
import { toast } from 'sonner';

interface EditGroupDescriptionDialogProps {
  groupId: string;
  currentDescription: string;
  onSuccess: () => void;
}

export function EditGroupDescriptionDialog({ groupId, currentDescription, onSuccess }: EditGroupDescriptionDialogProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(currentDescription);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!description.trim()) {
      toast.error('Group description cannot be empty');
      return;
    }

    if (description.trim() === currentDescription) {
      setOpen(false);
      return;
    }

    setSaving(true);
    try {
      await api.updateGroup(groupId, { description: description.trim() });
      toast.success('Group description updated successfully');
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update group description');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setDescription(currentDescription); // Reset to current description when opening
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
          <DialogTitle>Edit Group Description</DialogTitle>
          <DialogDescription>
            Update the description to help members understand the group's purpose
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="description">Group Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this group..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/500 characters
            </p>
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
