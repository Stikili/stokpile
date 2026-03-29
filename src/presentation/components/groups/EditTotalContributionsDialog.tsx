import { useState } from 'react';
import { Button } from '@/presentation/ui/button';
import { Input } from '@/presentation/ui/input';
import { Label } from '@/presentation/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/ui/dialog';
import { Alert, AlertDescription } from '@/presentation/ui/alert';
import { Edit, Info } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';

interface EditTotalContributionsDialogProps {
  groupId: string;
  currentTotal: number;
  calculatedTotal: number;
  currentAdjustment: number;
  onSuccess: () => void;
}

export function EditTotalContributionsDialog({
  groupId,
  currentTotal,
  calculatedTotal,
  currentAdjustment,
  onSuccess
}: EditTotalContributionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [adjustment, setAdjustment] = useState(currentAdjustment.toString());
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const adjustmentValue = parseFloat(adjustment) || 0;
      await api.updateContributionAdjustment(groupId, adjustmentValue);

      toast.success('Total contributions updated successfully');
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update total contributions');
    } finally {
      setSubmitting(false);
    }
  };

  const previewTotal = calculatedTotal + (parseFloat(adjustment) || 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Edit className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Total Contributions</DialogTitle>
          <DialogDescription>
            Manually adjust the total contributions amount. This is useful for adding cash contributions or corrections.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1 text-sm">
              <p><strong>Calculated Total:</strong> R {calculatedTotal.toFixed(2)}</p>
              <p><strong>Current Adjustment:</strong> R {currentAdjustment.toFixed(2)}</p>
              <p><strong>Current Display Total:</strong> R {currentTotal.toFixed(2)}</p>
            </div>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="adjustment">
              Adjustment Amount (ZAR)
              <span className="text-xs text-muted-foreground ml-2">
                Can be positive or negative
              </span>
            </Label>
            <Input
              id="adjustment"
              type="number"
              step="0.01"
              value={adjustment}
              onChange={(e) => setAdjustment(e.target.value)}
              placeholder="0.00"
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Enter a positive number to add to the total, or negative to subtract
            </p>
          </div>

          <Alert>
            <AlertDescription>
              <p className="text-sm">
                <strong>New Total:</strong> R {previewTotal.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                (Calculated: R {calculatedTotal.toFixed(2)} + Adjustment: R {(parseFloat(adjustment) || 0).toFixed(2)})
              </p>
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? 'Updating...' : 'Update Total'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
