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

interface DeleteGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  onSuccess: () => void;
}

export function DeleteGroupDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
  onSuccess
}: DeleteGroupDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, number> | null>(null);

  const expectedText = `DELETE ${groupName}`;

  const handleDelete = async () => {
    if (confirmText !== expectedText) {
      toast.error(`Please type "${expectedText}" to confirm`);
      return;
    }

    setLoading(true);
    try {
      const response = await api.deleteGroup(groupId);
      setResult(response.deletedCount ?? null);
      toast.success('Group deleted successfully');

      // Wait a moment to show results, then close and refresh
      setTimeout(() => {
        setLoading(false);
        onOpenChange(false);
        setConfirmText('');
        setResult(null);
        onSuccess();
      }, 2500);
    } catch (error) {
      console.error('Failed to delete group:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete group');
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      setConfirmText('');
      setResult(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Group
          </DialogTitle>
          <DialogDescription>
            This will permanently delete "{groupName}" and all associated data.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> This action will delete:
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>All contributions and payouts</li>
              <li>All meetings, votes, notes, and chat messages</li>
              <li>All attendance records</li>
              <li>All join requests and invites</li>
              <li>Group constitution and documents</li>
              <li>All member relationships to this group</li>
            </ul>
            <p className="mt-3">
              <strong>This action cannot be undone!</strong>
            </p>
          </AlertDescription>
        </Alert>

        {result ? (
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <p className="font-medium">Group deleted successfully:</p>
            <ul className="text-sm space-y-1">
              <li>Contributions: {result.contributions}</li>
              <li>Payouts: {result.payouts}</li>
              <li>Meetings: {result.meetings}</li>
              <li>Votes: {result.votes}</li>
              <li>Notes: {result.notes}</li>
              <li>Chat messages: {result.chats}</li>
              <li>Attendance records: {result.attendance}</li>
              <li>Join requests: {result.joinRequests}</li>
              <li>Invites: {result.invites}</li>
              <li>Memberships: {result.memberships}</li>
              <li>Constitutions: {result.constitutions}</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">Redirecting...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirm">
                Type <strong className="text-destructive">{expectedText}</strong> to confirm
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={expectedText}
                disabled={loading}
                className="font-mono"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          {!result && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading || confirmText !== expectedText}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Group
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
