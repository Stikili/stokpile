import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/presentation/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/presentation/ui/popover';
import { ScrollArea } from '@/presentation/ui/scroll-area';
import { Badge } from '@/presentation/ui/badge';
import { Bell, Check, AlertTriangle, Calendar, TrendingUp, DollarSign, Info, RefreshCw } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { formatCurrency } from '@/lib/export';
import type { Contribution, Payout, Meeting } from '@/domain/types';

const DISMISSED_KEY = 'dismissedNotifications';

interface SmartNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  icon: React.ReactNode;
}

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  // Keep only last 200 dismissed IDs to prevent unbounded growth
  const arr = Array.from(ids).slice(-200);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(arr));
}

function generateNotifications(
  contributions: Contribution[],
  payouts: Payout[],
  meetings: Meeting[],
  userEmail: string
): SmartNotification[] {
  const notifications: SmartNotification[] = [];
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  // 1. Has the current user paid this month?
  const paidThisMonth = contributions.some(c => {
    const d = new Date(c.date);
    return c.userEmail === userEmail && c.paid &&
      d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  if (!paidThisMonth) {
    notifications.push({
      id: `unpaid-${thisYear}-${thisMonth}`,
      title: 'Contribution due',
      message: `You haven't made a paid contribution for ${now.toLocaleString('default', { month: 'long' })} yet.`,
      type: 'warning',
      icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
    });
  }

  // 2. Unpaid contributions (any month)
  const myUnpaid = contributions.filter(c => c.userEmail === userEmail && !c.paid);
  if (myUnpaid.length > 0) {
    const total = myUnpaid.reduce((s, c) => s + c.amount, 0);
    notifications.push({
      id: `my-unpaid-${myUnpaid.map(c => c.id).sort().join('-')}`,
      title: 'Outstanding amount',
      message: `You have ${myUnpaid.length} unpaid contribution${myUnpaid.length !== 1 ? 's' : ''} totalling ${formatCurrency(total)}.`,
      type: 'warning',
      icon: <DollarSign className="h-4 w-4 text-orange-500" />,
    });
  }

  // 3. Upcoming meetings (within 7 days)
  const upcomingMeetings = meetings.filter(m => {
    const meetingDate = new Date(m.date);
    const diffDays = Math.ceil((meetingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });
  upcomingMeetings.forEach(m => {
    const diffDays = Math.ceil((new Date(m.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    notifications.push({
      id: `meeting-upcoming-${m.id}`,
      title: diffDays === 0 ? 'Meeting today' : diffDays === 1 ? 'Meeting tomorrow' : `Meeting in ${diffDays} days`,
      message: `${m.venue}${m.agenda ? ` · ${m.agenda.slice(0, 60)}${m.agenda.length > 60 ? '…' : ''}` : ''}`,
      type: 'info',
      icon: <Calendar className="h-4 w-4 text-blue-500" />,
    });
  });

  // 4. Scheduled payouts for the current user
  const myScheduledPayouts = payouts.filter(
    p => p.recipientEmail === userEmail && p.status === 'scheduled'
  );
  myScheduledPayouts.forEach(p => {
    notifications.push({
      id: `my-payout-${p.id}`,
      title: 'Payout scheduled for you',
      message: `${formatCurrency(p.amount)} scheduled for ${new Date(p.scheduledDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
      type: 'success',
      icon: <TrendingUp className="h-4 w-4 text-green-500" />,
    });
  });

  // 5. Recent completed payouts received (last 30 days)
  const recentReceived = payouts.filter(p => {
    if (p.recipientEmail !== userEmail || p.status !== 'completed') return false;
    const completedDate = new Date(p.completedAt || p.scheduledDate);
    const diffDays = (now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  });
  if (recentReceived.length > 0) {
    const total = recentReceived.reduce((s, p) => s + p.amount, 0);
    notifications.push({
      id: `received-payouts-${recentReceived.map(p => p.id).sort().join('-')}`,
      title: 'Payout received',
      message: `You received ${formatCurrency(total)} in the last 30 days.`,
      type: 'success',
      icon: <TrendingUp className="h-4 w-4 text-green-500" />,
    });
  }

  return notifications;
}

interface NotificationBellProps {
  groupId?: string;
  userEmail?: string;
}

export function NotificationBell({ groupId, userEmail }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!groupId || !userEmail) return;
    setLoading(true);
    try {
      const [contribData, payoutsData, meetingsData] = await Promise.all([
        api.getContributions(groupId),
        api.getPayouts(groupId),
        api.getMeetings(groupId).catch(() => ({ meetings: [] })),
      ]);
      const generated = generateNotifications(
        contribData.contributions || [],
        payoutsData.payouts || [],
        meetingsData.meetings || [],
        userEmail
      );
      setNotifications(generated);
    } catch {
      // Silent fail — notifications are a nice-to-have
    } finally {
      setLoading(false);
    }
  }, [groupId, userEmail]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open) {
      loadNotifications();
      intervalRef.current = setInterval(loadNotifications, 30000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [open, loadNotifications]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  const dismiss = (id: string) => {
    const updated = new Set(dismissed).add(id);
    setDismissed(updated);
    saveDismissed(updated);
  };

  const dismissAll = () => {
    const updated = new Set(dismissed);
    visibleNotifications.forEach(n => updated.add(n.id));
    setDismissed(updated);
    saveDismissed(updated);
  };

  const visibleNotifications = notifications.filter(n => !dismissed.has(n.id));
  const unreadCount = visibleNotifications.length;

  const getTypeBg = (type: SmartNotification['type']) => {
    switch (type) {
      case 'success': return 'bg-green-50 dark:bg-green-950/20';
      case 'warning': return 'bg-orange-50 dark:bg-orange-950/20';
      case 'error': return 'bg-red-50 dark:bg-red-950/20';
      default: return 'bg-blue-50 dark:bg-blue-950/20';
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium">Notifications</h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => loadNotifications()} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {visibleNotifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={dismissAll}>
                <Check className="h-4 w-4 mr-2" />
                Dismiss all
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="h-4 w-32 bg-muted animate-pulse rounded mx-auto mb-2" />
              <div className="h-3 w-24 bg-muted animate-pulse rounded mx-auto" />
            </div>
          ) : visibleNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">You're all caught up!</p>
              {!groupId && (
                <p className="text-xs mt-1 opacity-70">Select a group to see activity</p>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {visibleNotifications.map((n) => (
                <div key={n.id} className={`p-4 ${getTypeBg(n.type)}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">{n.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0 -mt-1 -mr-1"
                      onClick={() => dismiss(n.id)}
                    >
                      <Info className="h-3.5 w-3.5 rotate-45 opacity-50" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
