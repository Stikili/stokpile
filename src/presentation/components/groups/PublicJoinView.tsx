import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Button } from '@/presentation/ui/button';
import { Users, CheckCircle, Loader2 } from 'lucide-react';
import { Logo } from '@/presentation/layout/Logo';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';
import type { InviteLinkInfo } from '@/domain/types';

interface PublicJoinViewProps {
  inviteToken: string;
  isAuthenticated: boolean;
  onJoinSuccess: () => void;
  onNeedAuth: () => void;
}

export function PublicJoinView({ inviteToken, isAuthenticated, onJoinSuccess, onNeedAuth }: PublicJoinViewProps) {
  const [group, setGroup] = useState<InviteLinkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    loadGroupInfo();
  }, [inviteToken]);

  useEffect(() => {
    // Auto-join if authenticated
    if (isAuthenticated && group && !alreadyMember) {
      handleJoin();
    }
  }, [isAuthenticated, group]);

  const loadGroupInfo = async () => {
    try {
      setLoading(true);
      const data = await api.getInviteLinkInfo(inviteToken);
      setGroup(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid invite link');
      toast.error('Invalid or expired invite link');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!isAuthenticated) {
      onNeedAuth();
      return;
    }

    setJoining(true);
    try {
      const result = await api.joinViaInviteLink(inviteToken);

      if (result.alreadyMember) {
        setAlreadyMember(true);
        toast.success('You are already a member of this group!');
      } else {
        toast.success(`Successfully joined ${group?.groupName}!`);
        onJoinSuccess();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to join group');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50/80 to-blue-50/30 dark:bg-transparent dark:bg-none dark:from-transparent dark:to-transparent p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading invite...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50/80 to-blue-50/30 dark:bg-transparent dark:bg-none dark:from-transparent dark:to-transparent p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Invalid Invite</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {error || 'This invite link is invalid or has expired.'}
            </p>
            <Button onClick={() => window.location.href = '/'} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadyMember) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50/80 to-blue-50/30 dark:bg-transparent dark:bg-none dark:from-transparent dark:to-transparent p-4">
        <Card className="w-full max-w-md border-green-600">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <CardTitle>Already a Member</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You're already a member of <strong>{group.groupName}</strong>!
            </p>
            <Button onClick={onJoinSuccess} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50/80 to-blue-50/30 dark:bg-transparent dark:bg-none dark:from-transparent dark:to-transparent p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo showText={false} />
          </div>
          <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
          <CardTitle>You're Invited!</CardTitle>
          <CardDescription>
            Join the group and start managing your savings together
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="mb-1">Group Name</h3>
            <p className="text-2xl">{group.groupName}</p>
          </div>

          {group.groupDescription && (
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="text-sm mb-1">Description</h3>
              <p className="text-muted-foreground">{group.groupDescription}</p>
            </div>
          )}

          {!isAuthenticated ? (
            <div className="space-y-2">
              <Button onClick={onNeedAuth} className="w-full" disabled={joining}>
                {joining ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  'Sign Up / Sign In to Join'
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                You'll be automatically added to the group after signing in
              </p>
            </div>
          ) : (
            <Button onClick={handleJoin} className="w-full" disabled={joining}>
              {joining ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join Group'
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
