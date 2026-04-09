import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Badge } from '@/presentation/ui/badge';
import { Trophy, Flame, Loader2 } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { formatCurrency } from '@/lib/export';

interface LeaderboardCardProps {
  groupId: string;
}

interface Row {
  email: string;
  fullName?: string;
  surname?: string;
  totalPaid: number;
  streak: number;
  rank: number;
}

const RANK_BADGE: Record<number, string> = {
  1: 'bg-amber-400 text-amber-950',
  2: 'bg-slate-300 text-slate-800',
  3: 'bg-orange-400 text-orange-950',
};

export function LeaderboardCard({ groupId }: LeaderboardCardProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getLeaderboard(groupId)
      .then((res) => setRows(res.leaderboard.slice(0, 10)))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Top Contributors
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {rows.map((r) => (
            <div key={r.email} className="flex items-center gap-3 py-1.5">
              <span
                className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  RANK_BADGE[r.rank] || 'bg-muted text-muted-foreground'
                }`}
              >
                {r.rank}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {r.fullName ? `${r.fullName} ${r.surname || ''}`.trim() : r.email}
                </p>
              </div>
              {r.streak > 1 && (
                <Badge variant="outline" className="text-[10px] h-5 gap-0.5">
                  <Flame className="h-2.5 w-2.5 text-orange-500" />
                  {r.streak}
                </Badge>
              )}
              <span className="text-xs font-semibold text-green-600 dark:text-green-400 tabular-nums">
                {formatCurrency(r.totalPaid)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
