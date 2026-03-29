import { useState } from 'react';
import { Button } from '@/presentation/ui/button';
import { Label } from '@/presentation/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/ui/dialog';
import { Pencil } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';

interface EditContributionFrequencyDialogProps {
  groupId: string;
  currentFrequency: string;
  onSuccess: () => void;
}

export function EditContributionFrequencyDialog({
  groupId,
  currentFrequency,
  onSuccess
}: EditContributionFrequencyDialogProps) {
  const [open, setOpen] = useState(false);
  const [frequency, setFrequency] = useState(currentFrequency || 'monthly');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.updateGroupFrequency(groupId, frequency);
      toast.success('Contribution frequency updated successfully');
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update contribution frequency');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Contribution Frequency</DialogTitle>
          <DialogDescription>
            Update how often members are expected to contribute to this group
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="frequency">Contribution Frequency</Label>
            <Select
              value={frequency}
              onValueChange={setFrequency}
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
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Updating...' : 'Update Frequency'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
