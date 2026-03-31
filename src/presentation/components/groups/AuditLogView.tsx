import { useEffect, useState } from 'react';
import type { AuditEntry } from '@/domain/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Badge } from '@/presentation/ui/badge';
import { Skeleton } from '@/presentation/ui/skeleton';
import { EmptyState } from '@/presentation/shared/EmptyState';
import { api } from '@/infrastructure/api';
import { ClipboardList } from 'lucide-react';

interface AuditLogViewProps {
  groupId: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  contribution_created: { label: 'Contribution added', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  bulk_mark_contributions: { label: 'Bulk mark', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  payout_scheduled: { label: 'Payout scheduled', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  payout_completed: { label: 'Payout completed', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  payout_cancelled: { label: 'Payout cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  member_approved: { label: 'Member approved', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400' },
};

function formatAction(entry: AuditEntry): string {
  const d = entry.details as Record<string, unknown>;
  switch (entry.action) {
    case 'contribution_created':
      return `Added contribution of R ${Number(d.amount ?? 0).toFixed(2)} for ${d.targetUserEmail ?? ''}`;
    case 'bulk_mark_contributions':
      return `Bulk marked ${d.count ?? 0} contribution${Number(d.count) !== 1 ? 's' : ''} as ${d.paid ? 'paid' : 'unpaid'}`;
    case 'payout_scheduled':
      return `Scheduled payout of R ${Number(d.amount ?? 0).toFixed(2)} for ${d.recipientEmail ?? ''}`;
    case 'payout_completed':
      return `Completed payout for ${d.recipientEmail ?? ''}${d.referenceNumber ? ` (ref: ${d.referenceNumber})` : ''}`;
    case 'payout_cancelled':
      return `Cancelled payout for ${d.recipientEmail ?? ''}`;
    case 'member_approved':
      return `Approved ${d.memberEmail ?? ''} as a group member`;
    default:
      return entry.action.replace(/_/g, ' ');
  }
}

export function AuditLogView({ groupId }: AuditLogViewProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAuditLog(groupId)
      .then((data) => setEntries(data.auditLog || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [groupId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Audit Log
        </CardTitle>
        <p className="text-sm text-muted-foreground">Admin activity history for this group (last 200 entries)</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No activity yet" description="Admin actions will appear here as they happen" />
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
              const meta = ACTION_LABELS[entry.action] ?? { label: entry.action, color: 'bg-gray-100 text-gray-800' };
              return (
                <div key={entry.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <Badge className={`text-xs shrink-0 mt-0.5 ${meta.color} border-0`}>{meta.label}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{formatAction(entry)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      by {entry.actorEmail} · {new Date(entry.timestamp).toLocaleString('en-ZA')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
