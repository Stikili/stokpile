import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { Activity, DollarSign, TrendingUp, Calendar, Users } from 'lucide-react';
import { api } from '../utils/api';
import { formatCurrency, formatDate } from '../utils/export';
import type { Contribution, Payout, Meeting } from '../types';

interface ActivityEvent {
  id: string;
  type: 'contribution' | 'payout' | 'meeting';
  title: string;
  subtitle: string;
  timestamp: Date;
  badge?: { label: string; color: string };
}

interface ActivityFeedProps {
  groupId: string;
  limit?: number;
}

export function ActivityFeed({ groupId, limit = 20 }: ActivityFeedProps) {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [cData, pData, mData] = await Promise.all([
          api.getContributions(groupId),
          api.getPayouts(groupId),
          api.getMeetings(groupId).catch(() => ({ meetings: [] })),
        ]);
        setContributions(cData.contributions || []);
        setPayouts(pData.payouts || []);
        setMeetings(mData.meetings || []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [groupId]);

  const events = useMemo((): ActivityEvent[] => {
    const list: ActivityEvent[] = [];

    contributions.forEach(c => {
      list.push({
        id: `contribution-${c.id}`,
        type: 'contribution',
        title: `${c.user?.fullName ?? c.userEmail} · ${formatCurrency(c.amount)}`,
        subtitle: `Contribution recorded${c.createdBy && c.createdBy !== c.userEmail ? ' by admin' : ''}`,
        timestamp: new Date(c.createdAt),
        badge: {
          label: c.paid ? 'Paid' : 'Unpaid',
          color: c.paid
            ? 'bg-green-600 text-white'
            : 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-800',
        },
      });
    });

    payouts.forEach(p => {
      const recipientName = p.recipient && p.recipient.fullName !== 'Unknown'
        ? `${p.recipient.fullName} ${p.recipient.surname}`
        : p.recipientEmail;
      list.push({
        id: `payout-${p.id}`,
        type: 'payout',
        title: `${recipientName} · ${formatCurrency(p.amount)}`,
        subtitle: `Payout ${p.status}`,
        timestamp: new Date(p.completedAt || p.createdAt),
        badge: {
          label: p.status.charAt(0).toUpperCase() + p.status.slice(1),
          color: p.status === 'completed'
            ? 'bg-green-600 text-white'
            : p.status === 'cancelled'
            ? 'bg-destructive text-destructive-foreground'
            : 'bg-blue-600 text-white',
        },
      });
    });

    meetings.forEach(m => {
      list.push({
        id: `meeting-${m.id}`,
        type: 'meeting',
        title: `Meeting · ${m.venue}`,
        subtitle: `${m.time}${m.agenda ? ` · ${m.agenda.slice(0, 60)}${m.agenda.length > 60 ? '…' : ''}` : ''}`,
        timestamp: new Date(m.createdAt),
        badge: {
          label: new Date(m.date) < new Date() ? 'Past' : 'Upcoming',
          color: new Date(m.date) < new Date()
            ? 'bg-muted text-muted-foreground'
            : 'bg-primary text-primary-foreground',
        },
      });
    });

    return list
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }, [contributions, payouts, meetings, limit]);

  const iconFor = (type: ActivityEvent['type']) => {
    if (type === 'contribution') return <DollarSign className="h-4 w-4 text-green-500" />;
    if (type === 'payout') return <TrendingUp className="h-4 w-4 text-blue-500" />;
    return <Calendar className="h-4 w-4 text-purple-500" />;
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(date.toISOString());
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-14" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No activity yet</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3.5 top-2 bottom-2 w-px bg-border" />

            <div className="space-y-4">
              {events.map(event => (
                <div key={event.id} className="flex items-start gap-3 relative">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-background border border-border flex items-center justify-center z-10">
                    {iconFor(event.type)}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm leading-snug truncate">{event.title}</p>
                      {event.badge && (
                        <Badge className={`text-xs flex-shrink-0 ${event.badge.color}`}>
                          {event.badge.label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{event.subtitle}</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">{formatTime(event.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
