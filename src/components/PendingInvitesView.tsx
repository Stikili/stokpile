import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Check, X, Mail } from 'lucide-react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import type { Invite } from '../types';

interface PendingInvitesViewProps {
  onInviteAccepted: () => void;
}

export function PendingInvitesView({ onInviteAccepted }: PendingInvitesViewProps) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    try {
      setLoading(true);
      const data = await api.getInvites();
      setInvites(data.invites || []);
    } catch (error) {
      console.error('Failed to load invites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (groupId: string) => {
    setProcessing(groupId);
    try {
      await api.acceptInvite(groupId);
      toast.success('Invite accepted! You are now a member.');
      loadInvites();
      onInviteAccepted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to accept invite');
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async (groupId: string) => {
    setProcessing(groupId);
    try {
      await api.declineInvite(groupId);
      toast.success('Invite declined');
      loadInvites();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to decline invite');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (invites.length === 0) {
    return null; // Don't show if no invites
  }

  return (
    <Card className="border-primary">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          <CardTitle className="text-base">Pending Invitations ({invites.length})</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-4">
        {invites.map((invite) => (
          <Alert key={invite.id} className="py-3">
            <AlertDescription>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm mb-1">
                    <span className="font-medium">{invite.inviter?.fullName} {invite.inviter?.surname}</span>
                    {' '}invited you to join
                  </p>
                  <p className="text-base mb-0.5">{invite.group?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {invite.group?.description}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleAccept(invite.groupId)}
                    disabled={processing === invite.groupId}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => handleDecline(invite.groupId)}
                    disabled={processing === invite.groupId}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Decline
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}
