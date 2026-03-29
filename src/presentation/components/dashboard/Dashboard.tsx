import { useEffect, useState, useMemo } from 'react';
import type { Contribution, Payout, DashboardStats, Meeting, Member } from '@/domain/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Button } from '@/presentation/ui/button';
import { Calendar, ArrowUpRight, ArrowDownLeft, Wallet, Users, AlertTriangle, TrendingUp, User, RefreshCw } from 'lucide-react';
import { Badge } from '@/presentation/ui/badge';
import { ContributionChart } from '@/presentation/components/contributions/ContributionChart';
import { EditTotalContributionsDialog } from '@/presentation/components/groups/EditTotalContributionsDialog';
import { api } from '@/infrastructure/api';
import { formatCurrency, formatDate } from '@/lib/export';

interface DashboardProps {
  groupId: string;
  isAdmin?: boolean;
  userEmail?: string;
}

export function Dashboard({ groupId, isAdmin = false, userEmail }: DashboardProps) {
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
      const [contributionsData, payoutsData, adjustmentData, meetingsData, membersData] = await Promise.all([
        api.getContributions(groupId),
        api.getPayouts(groupId),
        api.getContributionAdjustment(groupId).catch(() => ({ adjustment: 0 })),
        api.getMeetings(groupId).catch(() => ({ meetings: [] })),
        api.getMembers(groupId).catch(() => ({ members: [] })),
      ]);

      const allContributions = contributionsData.contributions || [];
      const allPayouts = payoutsData.payouts || [];
      const allMeetings = meetingsData.meetings || [];
      const allMembers = membersData.members || [];

      setContributions(allContributions);
      setPayouts(allPayouts);
      setMeetings(allMeetings);
      setMembers(allMembers);

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

  const chartData = generateChartData(contributions, payouts);
  const hasAnyData = contributions.length > 0 || payouts.length > 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Card className="dark:bg-card/50 dark:backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs">Total Contributions</CardTitle>
            <div className="flex items-center gap-1">
              {isAdmin && (
                <EditTotalContributionsDialog
                  groupId={groupId}
                  currentTotal={stats.totalContributions}
                  calculatedTotal={stats.calculatedContributions}
                  currentAdjustment={stats.contributionAdjustment}
                  onSuccess={loadStats}
                />
              )}
              <ArrowUpRight className="h-3.5 w-3.5 text-success" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-1">
            <div className="flex items-baseline gap-2">
              <div className="text-xl text-success">{formatCurrency(stats.totalContributions)}</div>
              {stats.contributionAdjustment !== 0 && (
                <Badge variant="secondary" className="text-xs">
                  {stats.contributionAdjustment > 0 ? '+' : ''}{formatCurrency(stats.contributionAdjustment)}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              All time paid{stats.contributionAdjustment !== 0 && ' (adjusted)'}
            </p>
          </CardContent>
        </Card>

        <Card className="dark:bg-card/50 dark:backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs">Total Payouts</CardTitle>
            <ArrowDownLeft className="h-3.5 w-3.5 text-destructive" />
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-1">
            <div className="text-xl text-destructive">{formatCurrency(stats.totalPayouts)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{stats.completedPayoutsCount} completed</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-card/50 dark:backdrop-blur border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs">Net Balance</CardTitle>
            <Wallet className="h-3.5 w-3.5 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-1">
            <div className="text-xl text-primary">{formatCurrency(stats.netBalance)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Available funds</p>
          </CardContent>
        </Card>
      </div>

      {/* Actionable Insights Row */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {/* Members not paid this month */}
        {members.length > 0 && (
          <Card className={insights.notPaidThisMonth.length > 0
            ? 'dark:bg-card/50 border-orange-300 dark:border-orange-800'
            : 'dark:bg-card/50'}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
              <CardTitle className="text-xs">This Month</CardTitle>
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-1">
              {insights.notPaidThisMonth.length === 0 ? (
                <>
                  <div className="text-xl text-green-600 dark:text-green-400">All paid</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Every member has contributed</p>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <div className="text-xl text-orange-600 dark:text-orange-400">{insights.notPaidThisMonth.length}</div>
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    member{insights.notPaidThisMonth.length !== 1 ? 's' : ''} haven't paid yet
                  </p>
                  {isAdmin && insights.notPaidThisMonth.length <= 3 && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      {insights.notPaidThisMonth.map(m => m.fullName).join(', ')}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Next meeting */}
        {insights.nextMeeting && (
          <Card className="dark:bg-card/50 dark:backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
              <CardTitle className="text-xs">Next Meeting</CardTitle>
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-1">
              <div className="text-xl">
                {insights.daysUntilMeeting === 0
                  ? 'Today'
                  : insights.daysUntilMeeting === 1
                  ? 'Tomorrow'
                  : `${insights.daysUntilMeeting}d away`}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(insights.nextMeeting.date)} · {insights.nextMeeting.venue}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Next payout */}
        {stats.nextPayout && (
          <Card className="dark:bg-card/50 dark:backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
              <CardTitle className="text-xs">Next Scheduled Payout</CardTitle>
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-1">
              <div className="text-xl">{formatCurrency(stats.nextPayout.amount)}</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                To: {stats.nextPayout.recipient && stats.nextPayout.recipient.fullName !== 'Unknown'
                  ? `${stats.nextPayout.recipient.fullName} ${stats.nextPayout.recipient.surname}`
                  : stats.nextPayout.recipientEmail}
                {stats.scheduledPayoutsCount > 1 && ` (+${stats.scheduledPayoutsCount - 1} more)`}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Personal Summary Card */}
      {userEmail && (
        <Card className="dark:bg-card/50 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
            <CardTitle className="text-xs flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              My Summary
            </CardTitle>
            {insights.myPaidThisMonth ? (
              <Badge className="bg-green-600 text-white text-xs">Paid this month</Badge>
            ) : (
              <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-800 text-xs">
                Not paid this month
              </Badge>
            )}
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-1">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-lg text-green-600 dark:text-green-400">{formatCurrency(insights.myPaid)}</div>
                <p className="text-xs text-muted-foreground">Total paid in</p>
              </div>
              {insights.myUnpaid > 0 && (
                <div>
                  <div className="text-lg text-orange-600 dark:text-orange-400">{formatCurrency(insights.myUnpaid)}</div>
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                </div>
              )}
              {insights.myPayoutsReceived > 0 && (
                <div>
                  <div className="text-lg text-primary">{formatCurrency(insights.myPayoutsReceived)}</div>
                  <p className="text-xs text-muted-foreground">Received in payouts</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Flow Chart — only shown when there's actual data */}
      {hasAnyData && (
        <ContributionChart
          data={chartData}
          totalPaidContributions={stats.totalContributions}
          totalPayouts={stats.totalPayouts}
          netBalance={stats.netBalance}
        />
      )}
    </div>
  );
}

function generateChartData(contributions: Contribution[], payouts: Payout[]) {
  const months: { month: string; year: number; monthNum: number; total: number; paid: number; unpaid: number; payouts: number; netFlow: number; count: number }[] = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      year: date.getFullYear(),
      monthNum: date.getMonth(),
      total: 0, paid: 0, unpaid: 0, payouts: 0, netFlow: 0, count: 0
    });
  }

  contributions.forEach((c: Contribution) => {
    const d = new Date(c.date);
    const bucket = months.find(m => m.year === d.getFullYear() && m.monthNum === d.getMonth());
    if (bucket) {
      bucket.total += c.amount;
      bucket.count += 1;
      if (c.paid) bucket.paid += c.amount;
      else bucket.unpaid += c.amount;
    }
  });

  payouts.filter((p: Payout) => p.status === 'completed').forEach((p: Payout) => {
    const d = new Date(p.completedAt || p.scheduledDate);
    const bucket = months.find(m => m.year === d.getFullYear() && m.monthNum === d.getMonth());
    if (bucket) bucket.payouts += p.amount;
  });

  months.forEach(m => { m.netFlow = m.paid - m.payouts; });

  return months.map(({ year, monthNum, ...rest }) => rest);
}
