import { useEffect, useState } from 'react';
import type { GroupHealth } from '@/domain/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Skeleton } from '@/presentation/ui/skeleton';
import { api } from '@/infrastructure/api';
import { TrendingUp, TrendingDown, Minus, Heart } from 'lucide-react';

interface GroupHealthScoreProps {
  groupId: string;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
        <circle
          cx="48" cy="48" r={radius} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span className="absolute text-xl font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

export function GroupHealthScore({ groupId }: GroupHealthScoreProps) {
  const [health, setHealth] = useState<GroupHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getGroupHealth(groupId)
      .then((data) => setHealth(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Heart className="h-5 w-5" />Group Health</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    );
  }

  if (!health) return null;

  const TrendIcon = health.trend === 'up' ? TrendingUp : health.trend === 'down' ? TrendingDown : Minus;
  const trendColor = health.trend === 'up' ? 'text-green-600' : health.trend === 'down' ? 'text-red-500' : 'text-muted-foreground';
  const scoreLabel = health.score >= 80 ? 'Excellent' : health.score >= 60 ? 'Good' : health.score >= 40 ? 'Fair' : 'Needs attention';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-rose-500" />
          Group Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <ScoreRing score={health.score} />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium">{scoreLabel}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">Payment rate</span>
              <span className="font-medium">{health.paymentRate}%</span>
              <span className="text-muted-foreground">Active streak</span>
              <span className="font-medium">{health.streak} month{health.streak !== 1 ? 's' : ''}</span>
              <span className="text-muted-foreground">Trend</span>
              <span className={`flex items-center gap-1 font-medium ${trendColor}`}>
                <TrendIcon className="h-3.5 w-3.5" />
                {health.trend.charAt(0).toUpperCase() + health.trend.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Monthly mini bar chart */}
        {health.monthlyBreakdown.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Monthly contributions (paid / total)</p>
            <div className="flex items-end gap-1 h-12">
              {health.monthlyBreakdown.map((m, i) => {
                const pct = m.total > 0 ? (m.paid / m.total) : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${m.label}: ${m.paid}/${m.total}`}>
                    <div className="w-full rounded-t-sm bg-muted relative overflow-hidden" style={{ height: '40px' }}>
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-t-sm transition-all"
                        style={{
                          height: `${Math.max(pct * 100, m.total > 0 ? 5 : 0)}%`,
                          background: pct >= 0.8 ? '#22c55e' : pct >= 0.5 ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground truncate w-full text-center">{m.label.split(' ')[0]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
