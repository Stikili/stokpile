import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/presentation/ui/dialog';
import { Button } from '@/presentation/ui/button';
import { Badge } from '@/presentation/ui/badge';
import { Monitor, Smartphone, Loader2, LogOut } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';

interface SessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Session {
  sessionId: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

function detectDevice(userAgent: string): { icon: typeof Monitor; label: string } {
  const ua = userAgent.toLowerCase();
  if (/iphone|android|mobile/.test(ua)) return { icon: Smartphone, label: 'Mobile' };
  return { icon: Monitor, label: 'Desktop' };
}

function detectBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('chrome')) return 'Chrome';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('safari')) return 'Safari';
  return 'Browser';
}

export function SessionsDialog({ open, onOpenChange }: SessionsDialogProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { sessions } = await api.getSessions();
      setSessions(sessions);
    } catch {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const handleRevoke = async (sessionId: string) => {
    setRevoking(sessionId);
    try {
      await api.revokeSession(sessionId);
      toast.success('Session revoked');
      await load();
    } catch {
      toast.error('Failed to revoke session');
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm('Sign out all other devices? You will stay signed in on this device.')) return;
    setRevoking('all');
    try {
      const { revoked } = await api.revokeAllOtherSessions();
      toast.success(`Signed out ${revoked} other session${revoked === 1 ? '' : 's'}`);
      await load();
    } catch {
      toast.error('Failed to revoke sessions');
    } finally {
      setRevoking(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Active Sessions</DialogTitle>
          <DialogDescription>
            Devices currently signed in to your account. Revoke any you don't recognise.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No active sessions found.</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {sessions.map((s) => {
              const { icon: Icon, label } = detectDevice(s.userAgent);
              return (
                <div key={s.sessionId} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  <Icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{detectBrowser(s.userAgent)} on {label}</span>
                      {s.isCurrent && <Badge className="text-[10px] px-1.5 py-0">This device</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.ip}</p>
                    <p className="text-xs text-muted-foreground">
                      Active {new Date(s.lastActiveAt).toLocaleString()}
                    </p>
                  </div>
                  {!s.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive h-7 px-2"
                      onClick={() => handleRevoke(s.sessionId)}
                      disabled={revoking === s.sessionId}
                    >
                      {revoking === s.sessionId ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Revoke'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {sessions.filter(s => !s.isCurrent).length > 0 && (
          <Button
            variant="outline"
            onClick={handleRevokeAll}
            disabled={revoking === 'all'}
            className="w-full"
          >
            {revoking === 'all' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
            Sign out all other devices
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
