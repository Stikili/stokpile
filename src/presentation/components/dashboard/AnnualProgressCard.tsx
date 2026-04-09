import { useMemo } from 'react';
import { Card, CardContent } from '@/presentation/ui/card';
import { Target } from 'lucide-react';
import type { Contribution } from '@/domain/types';
import { formatCurrency } from '@/lib/export';

interface AnnualProgressCardProps {
  annualTarget: number;
  contributions: Contribution[];
  userEmail?: string;
}

export function AnnualProgressCard({ annualTarget, contributions, userEmail }: AnnualProgressCardProps) {
  const { paidThisYear, percent, daysLeft } = useMemo(() => {
    const now = new Date();
    const thisYear = now.getFullYear();
    const yearStart = new Date(thisYear, 0, 1);
    const yearEnd = new Date(thisYear + 1, 0, 1);

    const myContribs = userEmail
      ? contributions.filter((c) => c.userEmail === userEmail && c.paid)
      : contributions.filter((c) => c.paid);

    const paid = myContribs
      .filter((c) => {
        const d = new Date(c.date);
        return d >= yearStart && d < yearEnd;
      })
      .reduce((sum, c) => sum + c.amount, 0);

    const pct = Math.min(100, Math.round((paid / annualTarget) * 100));
    const days = Math.max(0, Math.ceil((yearEnd.getTime() - now.getTime()) / 86400000));

    return { paidThisYear: paid, percent: pct, daysLeft: days };
  }, [annualTarget, contributions, userEmail]);

  if (annualTarget <= 0) return null;

  const onTrack = percent >= ((365 - daysLeft) / 365) * 100;

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {new Date().getFullYear()} Target
            </span>
          </div>
          <span className={`text-xs font-medium ${onTrack ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {onTrack ? 'On track' : 'Behind'}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-xl font-bold">{formatCurrency(paidThisYear)}</span>
          <span className="text-xs text-muted-foreground">of {formatCurrency(annualTarget)}</span>
        </div>

        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${onTrack ? 'bg-green-500' : 'bg-amber-500'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
          <span>{percent}% of yearly goal</span>
          <span>{daysLeft} days left in year</span>
        </div>
      </CardContent>
    </Card>
  );
}
