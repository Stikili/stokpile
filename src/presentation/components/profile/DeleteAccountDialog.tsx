import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/presentation/ui/dialog';
import { Button } from '@/presentation/ui/button';
import { Alert, AlertDescription } from '@/presentation/ui/alert';
import { Input } from '@/presentation/ui/input';
import { Label } from '@/presentation/ui/label';
import { AlertTriangle, UserX, Loader2 } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE MY ACCOUNT') return;

    setLoading(true);
    try {
      await api.deleteAccount();
      toast.success('Your account and all data have been permanently deleted.');
      // Reload to clear session and redirect to auth screen
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete account');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Account
          </DialogTitle>
          <DialogDescription>
            Permanently delete your account and all associated data.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>This is permanent and cannot be undone.</strong> The following will be deleted:
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Your account and login credentials</li>
              <li>All groups you created and their data</li>
              <li>All contributions, payouts, and meetings</li>
              <li>Your memberships in other groups</li>
              <li>Your profile and notification preferences</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="confirm-delete">
            Type <strong>DELETE MY ACCOUNT</strong> to confirm
          </Label>
          <Input
            id="confirm-delete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE MY ACCOUNT"
            disabled={loading}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => { onOpenChange(false); setConfirmText(''); }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || confirmText !== 'DELETE MY ACCOUNT'}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</>
            ) : (
              <><UserX className="h-4 w-4 mr-2" />Delete My Account</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
