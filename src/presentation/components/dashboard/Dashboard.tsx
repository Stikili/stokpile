import { useEffect, useState, useMemo } from 'react';
import type { Contribution, Payout, DashboardStats, Meeting, Member, OverdueMember } from '@/domain/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Button } from '@/presentation/ui/button';
import { Calendar, Wallet, Users, AlertTriangle, TrendingUp, User, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/presentation/ui/badge';
import { GroupHealthScore } from '@/presentation/components/dashboard/GroupHealthScore';
import { EditTotalContributionsDialog } from '@/presentation/components/groups/EditTotalContributionsDialog';
import { ThisMonthStatus } from '@/presentation/components/dashboard/ThisMonthStatus';
import { NextTurnCard } from '@/presentation/components/dashboard/NextTurnCard';
import { LeaderboardCard } from '@/presentation/components/dashboard/LeaderboardCard';
import { AiAssistantCard } from '@/presentation/components/ai/AiAssistantCard';
import { AnnualProgressCard } from '@/presentation/components/dashboard/AnnualProgressCard';
import { api } from '@/infrastructure/api';
import { formatCurrency, formatDate } from '@/lib/export';

interface DashboardProps {
  groupId: string;
  groupType?: string;
  annualTarget?: number | null;
  isAdmin?: boolean;
  userEmail?: string;
}

export function Dashboard({ groupId, groupType, annualTarget, isAdmin = false, userEmail }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalContributions: 0,
    calculatedContributions: 0,
    contributionAdjustment: 0,
    totalPayouts: 0,
    netBalance: 0,
    nextPayout: null as Payout | null,
    completedPayoutsCount: 0,
    scheduledPayoutsCount: 0
  });
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [overdueMembers, setOverdueMembers] = useState<OverdueMember[]>([]);
  const [contributionTarget, setContributionTarget] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (groupId) loadStats();
  }, [groupId]);

  const loadStats = async () => {
    if (!groupId) return;

    try {
      setLoading(true);
      setError(null);
      const [contributionsData, payoutsData, adjustmentData, meetingsData, membersData, overdueData] = await Promise.all([
        api.getContributions(groupId),
        api.getPayouts(groupId),
        api.getContributionAdjustment(groupId).catch(() => ({ adjustment: 0 })),
        api.getMeetings(groupId).catch(() => ({ meetings: [] })),
        api.getMembers(groupId).catch(() => ({ members: [] })),
        isAdmin ? api.getOverdueMembers(groupId).catch(() => ({ members: [], target: 0 })) : Promise.resolve({ members: [], target: 0 }),
      ]);

      const allContributions = contributionsData.contributions || [];
      const allPayouts = payoutsData.payouts || [];
      const allMeetings = meetingsData.meetings || [];
      const allMembers = membersData.members || [];

      setContributions(allContributions);
      setPayouts(allPayouts);
      setMeetings(allMeetings);
      setMembers(allMembers);
      setOverdueMembers(overdueData.members || []);
      setContributionTarget(overdueData.target || 0);

      const calculatedContributions = allContributions
        .filter((c: Contribution) => c.paid)
        .reduce((sum: number, c: Contribution) => sum + c.amount, 0);

      const contributionAdjustment = adjustmentData.adjustment || 0;
      const totalContributions = calculatedContributions + contributionAdjustment;

      const totalPayouts = allPayouts
        .filter((p: Payout) => p.status === 'completed')
        .reduce((sum: number, p: Payout) => sum + p.amount, 0);

      const netBalance = totalContributions - totalPayouts;

      const completedPayoutsCount = allPayouts.filter((p: Payout) => p.status === 'completed').length;
      const scheduledPayoutsCount = allPayouts.filter((p: Payout) => p.status === 'scheduled').length;

      const scheduledPayouts = allPayouts
        .filter((p: Payout) => p.status === 'scheduled')
        .sort((a: Payout, b: Payout) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

      setStats({
        totalContributions,
        calculatedContributions,
        contributionAdjustment,
        totalPayouts,
        netBalance,
        nextPayout: scheduledPayouts[0] || null,
        completedPayoutsCount,
        scheduledPayoutsCount
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Derive actionable insights from loaded data
  const insights = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    // Members who haven't contributed this month
    const activeMembers = members.filter(m => m.status === 'approved');
    const contributedThisMonth = new Set(
      contributions
        .filter(c => {
          const d = new Date(c.date);
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        })
        .map(c => c.userEmail)
    );
    const notPaidThisMonth = activeMembers.filter(m => !contributedThisMonth.has(m.email));

    // Next upcoming meeting
    const upcomingMeetings = meetings
      .filter(m => new Date(`${m.date}T${m.time || '00:00'}`) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const nextMeeting = upcomingMeetings[0] || null;

    // Days until next meeting
    const daysUntilMeeting = nextMeeting
      ? Math.ceil((new Date(nextMeeting.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Personal summary for current user
    const myContributions = contributions.filter(c => c.userEmail === userEmail);
    const myPaid = myContributions.filter(c => c.paid).reduce((s, c) => s + c.amount, 0);
    const myUnpaid = myContributions.filter(c => !c.paid).reduce((s, c) => s + c.amount, 0);
    const myPayoutsReceived = payouts
      .filter(p => p.recipientEmail === userEmail && p.status === 'completed')
      .reduce((s, p) => s + p.amount, 0);
    const myPaidThisMonth = myContributions.some(c => {
      const d = new Date(c.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear && c.paid;
    });

    return { notPaidThisMonth, nextMeeting, daysUntilMeeting, myPaid, myUnpaid, myPayoutsReceived, myPaidThisMonth };
  }, [contributions, members, meetings, payouts, userEmail]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-muted animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <div>
          <p className="font-medium">Failed to load dashboard</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <Button variant="outline" onClick={loadStats}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* HERO: Group Balance — the most important number */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/[0.02]">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-primary" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Group Balance</span>
              </div>
              <div className="text-3xl md:text-4xl font-bold text-primary tracking-tight">
                {formatCurrency(stats.netBalance)}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                  In: {formatCurrency(stats.totalContributions)}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500" />
                  Out: {formatCurrency(stats.totalPayouts)}
                </span>
              </div>
            </div>
            {isAdmin && (
              <EditTotalContributionsDialog
                groupId={groupId}
                currentTotal={stats.totalContributions}
                calculatedTotal={stats.calculatedContributions}
                currentAdjustment={stats.contributionAdjustment}
                onSuccess={loadStats}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Whose turn? (only for rotating-style groups) */}
      <NextTurnCard groupId={groupId} groupType={groupType} />

      {/* Annual goal progress */}
      {annualTarget && annualTarget > 0 && (
        <AnnualProgressCard
          annualTarget={annualTarget}
          contributions={contributions}
          userEmail={userEmail}
        />
      )}

      {/* This Month Status — replaces chart */}
      {members.length > 0 && (
        <ThisMonthStatus
          members={members}
          contributions={contributions}
          contributionTarget={contributionTarget}
        />
      )}

      {/* Insights row: Next Meeting + Next Payout (when relevant) */}
      {(insights.nextMeeting || stats.nextPayout) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {insights.nextMeeting && (
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Next Meeting</p>
                  <p className="text-sm font-medium">
                    {insights.daysUntilMeeting === 0
                      ? 'Today'
                      : insights.daysUntilMeeting === 1
                      ? 'Tomorrow'
                      : `${insights.daysUntilMeeting} days away`}
                    <span className="text-muted-foreground font-normal"> · {insights.nextMeeting.venue}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {stats.nextPayout && (
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Next Payout</p>
                  <p className="text-sm font-medium truncate">
                    {formatCurrency(stats.nextPayout.amount)}
                    <span className="text-muted-foreground font-normal"> → {stats.nextPayout.recipient?.fullName !== 'Unknown' && stats.nextPayout.recipient
                      ? `${stats.nextPayout.recipient.fullName} ${stats.nextPayout.recipient.surname}`
                      : stats.nextPayout.recipientEmail}
                    {stats.scheduledPayoutsCount > 1 && ` (+${stats.scheduledPayoutsCount - 1})`}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Personal Summary — compact */}
      {userEmail && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">My Summary</span>
              </div>
              {insights.myPaidThisMonth ? (
                <Badge className="bg-green-600 text-white text-[10px] h-5">Paid this month</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] h-5 text-orange-600 border-orange-400">Not paid yet</Badge>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-base font-semibold text-green-600 dark:text-green-400">{formatCurrency(insights.myPaid)}</div>
                <p className="text-[10px] text-muted-foreground">Paid in</p>
              </div>
              <div>
                <div className={`text-base font-semibold ${insights.myUnpaid > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}>
                  {formatCurrency(insights.myUnpaid)}
                </div>
                <p className="text-[10px] text-muted-foreground">Outstanding</p>
              </div>
              <div>
                <div className={`text-base font-semibold ${insights.myPayoutsReceived > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {formatCurrency(insights.myPayoutsReceived)}
                </div>
                <p className="text-[10px] text-muted-foreground">Received</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue Members — expandable to show full list with names */}
      {isAdmin && contributionTarget > 0 && overdueMembers.length > 0 && (
        <OverdueMembersCard
          overdueMembers={overdueMembers}
          contributionTarget={contributionTarget}
        />
      )}

      {/* Top Contributors leaderboard */}
      <LeaderboardCard groupId={groupId} />

      {/* AI assistant */}
      <AiAssistantCard
        groupId={groupId}
        groupName="your group"
        groupType={groupType}
        isAdmin={isAdmin}
        userEmail={userEmail || ''}
      />

      {/* Group Health Score */}
      <GroupHealthScore groupId={groupId} />
    </div>
  );
}

// Expandable overdue members card
function OverdueMembersCard({
  overdueMembers,
  contributionTarget,
}: {
  overdueMembers: OverdueMember[];
  contributionTarget: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? overdueMembers : overdueMembers.slice(0, 3);

  return (
    <Card className="border-orange-300 dark:border-orange-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            {overdueMembers.length} Overdue Member{overdueMembers.length !== 1 ? 's' : ''}
          </CardTitle>
          <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-400">
            Target: {formatCurrency(contributionTarget)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {visible.map((m) => (
            <div key={m.email} className="flex items-center justify-between text-sm py-1">
              <span className="truncate max-w-[60%]">
                {m.fullName !== 'Unknown' ? `${m.fullName} ${m.surname}` : m.email}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-green-600 dark:text-green-400 text-xs">{formatCurrency(m.totalPaid)}</span>
                <span className="text-muted-foreground text-[10px]">/ {formatCurrency(contributionTarget)}</span>
              </div>
            </div>
          ))}
        </div>
        {overdueMembers.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((e) => !e)}
            className="w-full mt-2 h-7 text-xs"
          >
            {expanded ? (
              <><ChevronUp className="h-3 w-3 mr-1" />Show less</>
            ) : (
              <><ChevronDown className="h-3 w-3 mr-1" />Show all {overdueMembers.length}</>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

