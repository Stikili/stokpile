import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/presentation/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/presentation/ui/popover';
import { ScrollArea } from '@/presentation/ui/scroll-area';
import { Badge } from '@/presentation/ui/badge';
import { Bell, Check, AlertTriangle, Calendar, TrendingUp, DollarSign, Info, RefreshCw, CheckCheck } from 'lucide-react';
import { api } from '@/infrastructure/api';
import type { AppNotification } from '@/domain/types';

interface NotificationBellProps {
  groupId?: string;
  userEmail?: string;
}

function typeIcon(type: AppNotification['type']) {
  if (type === 'success') return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (type === 'warning') return <AlertTriangle className="h-4 w-4 text-orange-500" />;
  return <Info className="h-4 w-4 text-blue-500" />;
}

function typeBg(type: AppNotification['type']) {
  if (type === 'success') return 'bg-green-50 dark:bg-green-950/20';
  if (type === 'warning') return 'bg-orange-50 dark:bg-orange-950/20';
  return 'bg-blue-50 dark:bg-blue-950/20';
}

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function NotificationBell({ groupId: _groupId, userEmail: _userEmail }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Poll for unread count even when closed
    load();
    intervalRef.current = setInterval(load, 60000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [load]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleMarkAllRead = async () => {
    setMarking(true);
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {
      // silent
    } finally {
      setMarking(false);
    }
  };

  const unread = notifications.filter(n => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unread > 9 ? '9+' : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium">Notifications</h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {unread > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllRead} disabled={marking} className="text-xs">
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {loading && notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="h-4 w-32 bg-muted animate-pulse rounded mx-auto mb-2" />
              <div className="h-3 w-24 bg-muted animate-pulse rounded mx-auto" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 transition-colors ${typeBg(n.type)} ${!n.read ? 'border-l-2 border-primary' : 'opacity-70'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">{typeIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">{n.title}</p>
                        {!n.read && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-2 border-t text-center">
            <span className="text-xs text-muted-foreground">Showing last {notifications.length} notifications</span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
