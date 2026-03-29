import { useState } from 'react';
import { Button } from '@/presentation/ui/button';
import { Input } from '@/presentation/ui/input';
import { Label } from '@/presentation/ui/label';
import { Textarea } from '@/presentation/ui/textarea';
import { Checkbox } from '@/presentation/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/ui/dialog';
import { Plus } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';

interface CreateGroupDialogProps {
  onSuccess: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateGroupDialog({ onSuccess, open: controlledOpen, onOpenChange }: CreateGroupDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contributionFrequency, setContributionFrequency] = useState('monthly');
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const result = await api.createGroup({
        name,
        description,
        contributionFrequency,
        isPublic
      });
      toast.success(`Group created! Share code: ${result.group.groupCode}`);
      setOpen(false);
      setName('');
      setDescription('');
      setContributionFrequency('monthly');
      setIsPublic(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start">
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </DialogTrigger>
      {open && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Set up a new group and invite members to join
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Family Savings Circle"
              required
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this group..."
              rows={3}
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Contribution Frequency</Label>
            <Select
              value={contributionFrequency}
              onValueChange={setContributionFrequency}
              disabled={submitting}
            >
              <SelectTrigger id="frequency">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="bi-weekly">Bi-Weekly (Every 2 weeks)</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="bi-monthly">Bi-Monthly (Every 2 months)</SelectItem>
                <SelectItem value="quarterly">Quarterly (Every 3 months)</SelectItem>
                <SelectItem value="semi-annually">Semi-Annually (Every 6 months)</SelectItem>
                <SelectItem value="annually">Annually (Yearly)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How often members are expected to contribute
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPublic"
              checked={isPublic}
              onCheckedChange={(checked: boolean) => setIsPublic(checked as boolean)}
              disabled={submitting}
            />
            <label
              htmlFor="isPublic"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Make this group public
            </label>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Group'}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            You'll receive a group code to share with members after creation
          </p>
        </form>
      </DialogContent>
      )}
    </Dialog>
  );
}
