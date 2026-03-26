import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { api } from '../utils/api';
import { toast } from 'sonner';

interface ClearDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ClearDataDialog({ open, onOpenChange, onSuccess }: ClearDataDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, number> | null>(null);

  const handleClearData = async () => {
    if (confirmText !== 'DELETE ALL DATA') {
      toast.error('Please type "DELETE ALL DATA" to confirm');
      return;
    }

    setLoading(true);
    try {
      const response = await api.clearAllData();
      setResult(response.deletedCount ?? null);
      toast.success('All data has been cleared successfully');

      // Wait a moment to show results, then close and refresh
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        setConfirmText('');
        setResult(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to clear data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to clear data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Clear All Data
          </DialogTitle>
          <DialogDescription>
            This action will permanently delete all data associated with your account.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> This will delete:
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>All groups you created</li>
              <li>All contributions, payouts, and meetings</li>
              <li>All votes, notes, and chat messages</li>
              <li>All constitutions and documents</li>
              <li>Your memberships in groups you didn't create</li>
            </ul>
            <p className="mt-3">
              <strong>This action cannot be undone!</strong>
            </p>
          </AlertDescription>
        </Alert>

        {result ? (
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <p className="font-medium">Data cleared successfully:</p>
            <ul className="text-sm space-y-1">
              <li>Groups: {result.groups}</li>
              <li>Memberships: {result.memberships}</li>
              <li>Contributions: {result.contributions}</li>
              <li>Payouts: {result.payouts}</li>
              <li>Meetings: {result.meetings}</li>
              <li>Votes: {result.votes}</li>
              <li>Notes: {result.notes}</li>
              <li>Chat messages: {result.chats}</li>
              <li>Join requests: {result.joinRequests}</li>
              <li>Invites: {result.invites}</li>
              <li>Constitutions: {result.constitutions}</li>
            </ul>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirm">
                Type <strong>DELETE ALL DATA</strong> to confirm
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE ALL DATA"
                disabled={loading}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setConfirmText('');
              setResult(null);
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          {!result && (
            <Button
              variant="destructive"
              onClick={handleClearData}
              disabled={loading || confirmText !== 'DELETE ALL DATA'}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Data
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
