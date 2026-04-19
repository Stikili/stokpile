import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Badge } from '@/presentation/ui/badge';
import { Trophy, TrendingUp, Users, Coins } from 'lucide-react';
import { api } from '@/infrastructure/api';

type Summary = {
  totalAccounts: number;
  tierCounts: Record<string, number>;
  totalLifetimeEarningsZar: number;
  totalPendingZar: number;
  totalRedeemedZar: number;
  thisMonth: {
    accruingTotalZar: number;
    accruingReferrers: number;
    accruingCommissions: number;
    subsCount: number;
    subsTotalZar: number;
  };
  lastClosedMonth: {
    totalZar: number;
    referrers: number;
    commissions: number;
  };
  topReferrers: Array<{
    userId: string;
    email: string;
    tier: string;
    lifetimeEarningsZar: number;
    lifetimePoints: number;
  }>;
};

const TIER_META: Record<string, { label: string; color: string }> = {
  bronze:   { label: 'Bronze',   color: 'bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-700/30' },
  silver:   { label: 'Silver',   color: 'bg-slate-500/20 text-slate-600 dark:text-slate-300 border-slate-500/30' },
  gold:     { label: 'Gold',     color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30' },
  platinum: { label: 'Platinum', color: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-500/30' },
};

const ZAR = (n: number) => `R${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function RewardsAdminView() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getRewardsAdminSummary()
      .then((d) => { if (!cancelled && d?.summary) setSummary(d.summary); })
      .catch(() => { /* silent — non-admins get 403, anything else is non-fatal */ });
    return () => { cancelled = true; };
  }, []);

  // Render nothing until we have a valid summary. No loading state,
  // no error state — this is a top-shelf admin widget that appears
  // only for platform admins.
  if (!summary || !summary.tierCounts) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Rewards — Platform Overview
          <Badge variant="outline" className="text-[10px] ml-2">Admin only</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Headline stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="rounded-xl border p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Rewards accounts</p>
            <p className="text-2xl font-bold tracking-tight mt-0.5">{summary.totalAccounts}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Lifetime payouts</p>
            <p className="text-2xl font-bold tracking-tight mt-0.5">{ZAR(summary.totalLifetimeEarningsZar)}</p>
            <p className="text-[10px] text-muted-foreground">commissions earned</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Pending</p>
            <p className="text-2xl font-bold tracking-tight mt-0.5">{ZAR(summary.totalPendingZar)}</p>
            <p className="text-[10px] text-muted-foreground">this period</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Redeemed</p>
            <p className="text-2xl font-bold tracking-tight mt-0.5">{ZAR(summary.totalRedeemedZar)}</p>
            <p className="text-[10px] text-muted-foreground">to subscription credit</p>
          </div>
        </div>

        {/* Tier distribution */}
        <div>
          <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Tier distribution
          </p>
          <div className="grid grid-cols-4 gap-2">
            {(['bronze', 'silver', 'gold', 'platinum'] as const).map((tier) => (
              <div key={tier} className={`rounded-lg border p-3 ${TIER_META[tier].color}`}>
                <p className="text-[10px] uppercase tracking-wider font-semibold">{TIER_META[tier].label}</p>
                <p className="text-xl font-bold tracking-tight mt-0.5">{summary.tierCounts[tier] || 0}</p>
              </div>
            ))}
          </div>
        </div>

        {/* This month + last closed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border bg-muted/20 p-3">
            <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              This month (accruing)
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Commission pool</span>
                <span className="font-semibold">{ZAR(summary.thisMonth.accruingTotalZar)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active referrers</span>
                <span className="font-semibold">{summary.thisMonth.accruingReferrers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Commission events</span>
                <span className="font-semibold">{summary.thisMonth.accruingCommissions}</span>
              </div>
              <div className="flex justify-between pt-1 border-t mt-2">
                <span className="text-muted-foreground">Subscriptions paid</span>
                <span className="font-semibold">{summary.thisMonth.subsCount} · {ZAR(summary.thisMonth.subsTotalZar)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/20 p-3">
            <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-amber-500" />
              Last closed month
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid out</span>
                <span className="font-semibold">{ZAR(summary.lastClosedMonth.totalZar)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Referrers paid</span>
                <span className="font-semibold">{summary.lastClosedMonth.referrers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Commissions</span>
                <span className="font-semibold">{summary.lastClosedMonth.commissions}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top referrers */}
        <div>
          <p className="text-xs font-semibold mb-2">Top referrers (lifetime)</p>
          {summary.topReferrers.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No referrer commissions yet.</p>
          ) : (
            <div className="space-y-1">
              {summary.topReferrers.map((r, i) => (
                <div
                  key={r.userId}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-card text-xs"
                >
                  <span className="w-5 text-muted-foreground text-center font-semibold">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{r.email}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {r.lifetimePoints.toLocaleString()} pts lifetime
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${TIER_META[r.tier]?.color || ''}`}>
                    {TIER_META[r.tier]?.label || r.tier}
                  </Badge>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {ZAR(r.lifetimeEarningsZar)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
