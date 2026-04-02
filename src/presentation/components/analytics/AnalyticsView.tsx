import { useEffect, useState } from 'react';
import type { GroupHealth } from '@/domain/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Badge } from '@/presentation/ui/badge';
import { Progress } from '@/presentation/ui/progress';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Activity, Users, DollarSign, Award } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/export';

interface AnalyticsViewProps {
  groupId: string;
}

const COLORS = ['#22c55e', '#f97316', '#3b82f6', '#a855f7', '#ec4899'];

export function AnalyticsView({ groupId }: AnalyticsViewProps) {
  const [health, setHealth] = useState<GroupHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await api.getGroupHealth(groupId);
        setHealth(data);
      } catch {
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [groupId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="h-40 flex items-center justify-center text-sm text-muted-foreground">
              Loading...
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!health) return null;

  const TrendIcon = health.trend === 'up' ? TrendingUp : health.trend === 'down' ? TrendingDown : Minus;
  const trendColor = health.trend === 'up' ? 'text-green-600' : health.trend === 'down' ? 'text-red-500' : 'text-muted-foreground';

  const scoreColor = health.score >= 80 ? 'text-green-600' : health.score >= 60 ? 'text-yellow-600' : 'text-red-500';
  const scoreLabel = health.score >= 80 ? 'Excellent' : health.score >= 60 ? 'Good' : health.score >= 40 ? 'Fair' : 'Needs Attention';

  const paidVsUnpaid = [
    { name: 'Paid', value: health.paidContributions },
    { name: 'Unpaid', value: health.totalContributions - health.paidContributions },
  ];

  return (
    <div className="space-y-4">
      {/* Health Score Card */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Award className="h-4 w-4" />
              Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${scoreColor}`}>{health.score}</div>
            <Badge variant="outline" className={`mt-1 text-xs ${scoreColor}`}>{scoreLabel}</Badge>
            <Progress value={health.score} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" />
              Payment Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.paymentRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">of all contributions paid</p>
            <Progress value={health.paymentRate} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Activity className="h-4 w-4" />
              Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.streak}</div>
            <p className="text-xs text-muted-foreground mt-1">months of contributions</p>
            <div className={`flex items-center gap-1 mt-2 text-xs ${trendColor}`}>
              <TrendIcon className="h-3.5 w-3.5" />
              <span className="capitalize">{health.trend}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.memberCount}</div>
            <p className="text-xs text-muted-foreground mt-1">active members</p>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {formatCurrency(health.totalContributions)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Breakdown Chart */}
      {health.monthlyBreakdown && health.monthlyBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Contributions</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={health.monthlyBreakdown} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R${v}`} />
                <RechartsTooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), name === 'paid' ? 'Paid' : 'Total']}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="total" name="Total" fill="#e2e8f0" radius={[3, 3, 0, 0]} />
                <Bar dataKey="paid" name="Paid" fill="#22c55e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Paid vs Unpaid Pie */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={paidVsUnpaid}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {paidVsUnpaid.map((_, index) => (
                    <Cell key={index} fill={index === 0 ? '#22c55e' : '#f97316'} />
                  ))}
                </Pie>
                <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
                <RechartsTooltip
                  formatter={(value: number) => [formatCurrency(value)]}
                  contentStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment rate trend line */}
        {health.monthlyBreakdown && health.monthlyBreakdown.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Rate Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={health.monthlyBreakdown.map(m => ({
                    label: m.label,
                    rate: m.total > 0 ? Math.round((m.paid / m.total) * 100) : 0,
                  }))}
                  margin={{ top: 5, right: 4, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <RechartsTooltip
                    formatter={(value: number) => [`${value}%`, 'Payment Rate']}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
