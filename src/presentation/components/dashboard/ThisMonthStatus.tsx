import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Badge } from '@/presentation/ui/badge';
import { Button } from '@/presentation/ui/button';
import { CheckCircle2, Circle, Users, ChevronDown, ChevronUp } from 'lucide-react';
import type { Contribution, Member } from '@/domain/types';
import { formatCurrency } from '@/lib/export';

interface ThisMonthStatusProps {
  members: Member[];
  contributions: Contribution[];
  contributionTarget: number;
}

interface MemberStatus {
  email: string;
  fullName: string;
  surname: string;
  paid: number;
  hasPaid: boolean;
  metTarget: boolean;
}

export function ThisMonthStatus({ members, contributions, contributionTarget }: ThisMonthStatusProps) {
  const [expanded, setExpanded] = useState(false);

  const statuses = useMemo<MemberStatus[]>(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const activeMembers = members.filter((m) => m.status === 'approved');
    const paidByEmail = new Map<string, number>();

    for (const c of contributions) {
      const d = new Date(c.date);
      if (d.getMonth() === thisMonth && d.getFullYear() === thisYear && c.paid) {
        paidByEmail.set(c.userEmail, (paidByEmail.get(c.userEmail) || 0) + c.amount);
      }
    }

    return activeMembers
      .map((m) => {
        const paid = paidByEmail.get(m.email) || 0;
        return {
          email: m.email,
          fullName: m.fullName || '',
          surname: m.surname || '',
          paid,
          hasPaid: paid > 0,
          metTarget: contributionTarget > 0 ? paid >= contributionTarget : paid > 0,
        };
      })
      // Sort: unpaid first, then partial, then fully paid (alphabetical within)
      .sort((a, b) => {
        if (a.metTarget !== b.metTarget) return a.metTarget ? 1 : -1;
        if (a.hasPaid !== b.hasPaid) return a.hasPaid ? 1 : -1;
        return (a.fullName + a.surname).localeCompare(b.fullName + b.surname);
      });
  }, [members, contributions, contributionTarget]);

  if (statuses.length === 0) return null;

  const paidCount = statuses.filter((s) => s.metTarget).length;
  const totalCount = statuses.length;
  const allPaid = paidCount === totalCount;
  const visible = expanded ? statuses : statuses.slice(0, 5);
  const hasMore = statuses.length > 5;

  // Month name like "April 2026"
  const monthLabel = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            {monthLabel}
          </CardTitle>
          <Badge
            variant={allPaid ? 'default' : 'secondary'}
            className={allPaid ? 'bg-green-600 text-white' : ''}
          >
            {paidCount}/{totalCount} paid
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {visible.map((s) => (
            <div
              key={s.email}
              className="flex items-center gap-2 py-1.5 px-2 -mx-2 rounded hover:bg-muted/50 transition-colors"
            >
              {s.metTarget ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : s.hasPaid ? (
                <Circle className="h-4 w-4 text-amber-500 shrink-0 fill-amber-500/20" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className="flex-1 text-sm truncate">
                {s.fullName ? `${s.fullName} ${s.surname}`.trim() : s.email}
              </span>
              {s.hasPaid && (
                <span className={`text-xs ${s.metTarget ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {formatCurrency(s.paid)}
                </span>
              )}
            </div>
          ))}
        </div>

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((e) => !e)}
            className="w-full mt-2 h-7 text-xs"
          >
            {expanded ? (
              <><ChevronUp className="h-3 w-3 mr-1" />Show less</>
            ) : (
              <><ChevronDown className="h-3 w-3 mr-1" />Show all {statuses.length}</>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
