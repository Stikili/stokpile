import { useState, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/presentation/ui/dialog';
import { Button } from '@/presentation/ui/button';
import { Input } from '@/presentation/ui/input';
import { Label } from '@/presentation/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/ui/tabs';
import { Progress } from '@/presentation/ui/progress';
import { Badge } from '@/presentation/ui/badge';
import { Trophy, Coins, TrendingUp, Gift, Loader2, ArrowRight, Medal } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/infrastructure/api';
import { useRewardsAccount, useRewardsLedger, useRewardsCommissions, queryKeys } from '@/application/hooks/queries';
import { useQueryClient } from '@tanstack/react-query';
import type { Group } from '@/domain/types';

interface RewardsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowReferral?: () => void;
  groups: Group[];
}

const TIER_META: Record<string, { label: string; gradient: string; ring: string; glow: string }> = {
  bronze:   { label: 'Bronze',   gradient: 'from-amber-700 to-amber-900',               ring: 'ring-amber-700/30',  glow: '' },
  silver:   { label: 'Silver',   gradient: 'from-slate-400 to-slate-600',               ring: 'ring-slate-400/30',  glow: '' },
  gold:     { label: 'Gold',     gradient: 'from-yellow-400 to-amber-500',              ring: 'ring-yellow-400/40', glow: 'shadow-yellow-500/20' },
  platinum: { label: 'Platinum', gradient: 'from-cyan-300 via-sky-400 to-indigo-500',   ring: 'ring-cyan-400/50',   glow: 'shadow-cyan-500/30' },
};

const EVENT_LABELS: Record<string, string> = {
  referral_commission:   'Referral commission',
  subscription_month:    'Subscription month',
  streak_bonus:          'Streak bonus',
  milestone:             'Milestone',
  contribution_on_time:  'On-time contribution',
  group_created:         'Group created',
  treasurer_cycle:       'Treasurer cycle',
  redemption:            'Redeemed for credit',
  adjustment:            'Adjustment',
};

const ZAR = (n: number) => `R${n.toFixed(2)}`;

export function RewardsDialog({ open, onOpenChange, onShowReferral, groups }: RewardsDialogProps) {
  const queryClient = useQueryClient();
  const { data: accountData, isLoading: loadingAccount } = useRewardsAccount();
  const { data: ledgerData } = useRewardsLedger();
  const { data: commissionsData } = useRewardsCommissions();

  const [redeemGroupId, setRedeemGroupId] = useState('');
  const [redeemPoints, setRedeemPoints] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const account = accountData?.account;
  const pointsPerZar = account?.conversionRate.pointsPerZar ?? 100;
  const minPoints = account?.conversionRate.minPoints ?? 1000;

  const adminGroups = useMemo(
    () => groups.filter((g) => g.userRole === 'admin'),
    [groups],
  );

  const redeemPointsNum = Number(redeemPoints) || 0;
  const redeemCreditZar = redeemPointsNum / pointsPerZar;
  const canRedeem =
    !!account &&
    !!redeemGroupId &&
    redeemPointsNum >= minPoints &&
    redeemPointsNum % pointsPerZar === 0 &&
    redeemPointsNum <= account.availablePoints;

  const handleRedeem = async () => {
    if (!canRedeem) return;
    setRedeeming(true);
    try {
      const res = await api.redeemRewards(redeemGroupId, redeemPointsNum);
      toast.success(`Redeemed ${redeemPointsNum} pts → ${ZAR(res.redemption.creditZar)} credit`);
      setRedeemPoints('');
      queryClient.invalidateQueries({ queryKey: queryKeys.rewardsAccount() });
      queryClient.invalidateQueries({ queryKey: queryKeys.rewardsLedger() });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription(redeemGroupId) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Redemption failed');
    } finally {
      setRedeeming(false);
    }
  };

  const tierMeta = account ? TIER_META[account.tier] : TIER_META.bronze;
  const progressPct = account && account.nextTierAt
    ? Math.min(100, Math.round((account.lifetimePoints / account.nextTierAt) * 100))
    : 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Rewards
          </DialogTitle>
          <DialogDescription>
            Earn points as you use Stokpile. Redeem for subscription credit.
          </DialogDescription>
        </DialogHeader>

        {loadingAccount || !account ? (
          <div className="py-12 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Loading your rewards...
          </div>
        ) : (
          <div className="space-y-5">
            {/* Tier hero */}
            <div className={`rounded-2xl border bg-card p-5 ring-1 ${tierMeta.ring} ${tierMeta.glow} shadow-lg`}>
              <div className="flex items-start gap-4">
                <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${tierMeta.gradient} flex items-center justify-center shadow-lg shrink-0`}>
                  <Medal className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-xl">{tierMeta.label}</h3>
                    <Badge variant="outline" className="text-[10px]">
                      {(account.commissionRate * 100).toFixed(0)}% referral rate
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {account.lifetimePoints.toLocaleString()} lifetime points
                  </p>

                  {account.nextTierAt && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                        <span>Progress to next tier</span>
                        <span>{account.pointsToNextTier.toLocaleString()} pts to go</span>
                      </div>
                      <Progress value={progressPct} className="h-2" />
                    </div>
                  )}
                  {!account.nextTierAt && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                      You've reached the top tier
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border bg-card p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Available</p>
                <p className="text-xl font-bold tracking-tight mt-0.5">{account.availablePoints.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">points</p>
              </div>
              <div className="rounded-xl border bg-card p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Earned</p>
                <p className="text-xl font-bold tracking-tight mt-0.5">{ZAR(account.lifetimeEarningsZar)}</p>
                <p className="text-[10px] text-muted-foreground">from referrals</p>
              </div>
              <div className="rounded-xl border bg-card p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Redeemed</p>
                <p className="text-xl font-bold tracking-tight mt-0.5">{ZAR(account.creditedZar)}</p>
                <p className="text-[10px] text-muted-foreground">subscription credit</p>
              </div>
            </div>

            {/* Redeem */}
            <div className="rounded-2xl border bg-gradient-to-br from-primary/5 to-emerald-500/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Coins className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm">Redeem for subscription credit</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {pointsPerZar} points = R1. Minimum {minPoints.toLocaleString()} points per redemption.
              </p>

              {adminGroups.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  You need to be an admin of a group to redeem credit.
                </p>
              ) : account.availablePoints < minPoints ? (
                <p className="text-xs text-muted-foreground italic">
                  Earn {(minPoints - account.availablePoints).toLocaleString()} more points to unlock redemption.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="redeem-group" className="text-xs">Apply credit to</Label>
                    <Select value={redeemGroupId} onValueChange={setRedeemGroupId}>
                      <SelectTrigger id="redeem-group" className="h-9">
                        <SelectValue placeholder="Choose a group you admin" />
                      </SelectTrigger>
                      <SelectContent>
                        {adminGroups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="redeem-points" className="text-xs">Points to redeem</Label>
                    <Input
                      id="redeem-points"
                      type="number"
                      inputMode="numeric"
                      min={minPoints}
                      max={account.availablePoints}
                      step={pointsPerZar}
                      value={redeemPoints}
                      onChange={(e) => setRedeemPoints(e.target.value)}
                      placeholder={`e.g. ${minPoints}`}
                      className="h-9"
                    />
                    {redeemPointsNum > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        = {ZAR(redeemCreditZar)} subscription credit
                      </p>
                    )}
                  </div>

                  <Button
                    className="w-full h-9"
                    disabled={!canRedeem || redeeming}
                    onClick={handleRedeem}
                  >
                    {redeeming ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Redeeming...</>
                    ) : (
                      <>Redeem{redeemPointsNum > 0 ? ` ${ZAR(redeemCreditZar)}` : ''}</>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Activity tabs */}
            <Tabs defaultValue="activity">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="commissions">
                  Commissions
                  {commissionsData?.commissions.length ? (
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                      {commissionsData.commissions.length}
                    </Badge>
                  ) : null}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="activity" className="mt-3">
                {!ledgerData?.ledger.length ? (
                  <p className="text-xs text-muted-foreground italic text-center py-6">
                    No activity yet. Start earning by subscribing or inviting someone.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {ledgerData.ledger.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border bg-card text-xs">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{EVENT_LABELS[entry.eventType] || entry.eventType}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {entry.pointsDelta !== 0 && (
                            <p className={`font-semibold ${entry.pointsDelta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                              {entry.pointsDelta > 0 ? '+' : ''}{entry.pointsDelta} pts
                            </p>
                          )}
                          {entry.zarDelta !== 0 && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400">
                              +{ZAR(Number(entry.zarDelta))}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="commissions" className="mt-3">
                {!commissionsData?.commissions.length ? (
                  <div className="text-center py-6 space-y-3">
                    <p className="text-xs text-muted-foreground italic">
                      No referral commissions yet.
                    </p>
                    {onShowReferral && (
                      <Button size="sm" variant="outline" onClick={onShowReferral}>
                        <Gift className="h-3.5 w-3.5 mr-1.5" />
                        Get your referral link
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {commissionsData.commissions.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border bg-card text-xs">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{c.referredEmail}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(c.createdAt).toLocaleDateString()} · {(c.rate * 100).toFixed(0)}% of {ZAR(c.grossZar)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                            +{ZAR(c.commissionZar)}
                          </p>
                          {c.paidOut && (
                            <p className="text-[10px] text-muted-foreground">paid out</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* How to earn hint */}
            <div className="rounded-xl border bg-muted/30 p-3 text-[11px] text-muted-foreground">
              <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                How to earn
              </p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>Paid subscription month: +50 pts</li>
                <li>Refer a paying group: up to 22% of their subscription for 24 months</li>
                <li>First-time referral conversion: +300 pts bonus</li>
              </ul>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
