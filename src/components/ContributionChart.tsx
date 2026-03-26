import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area, AreaChart } from 'recharts';
import { BarChart3, Wallet, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

// Helper function for currency formatting
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR'
  }).format(amount);
};

// Simplified formatter for Y-axis
const formatAxisCurrency = (value: number) => {
  if (value === 0) return 'R0';
  if (Math.abs(value) >= 1000) {
    return `R${(value / 1000).toFixed(1)}k`;
  }
  return `R${value.toFixed(0)}`;
};

interface ContributionData {
  month: string;
  total: number;
  paid: number;
  unpaid: number;
  payouts: number;
  netFlow: number;
  count: number;
}

interface ContributionChartProps {
  data: ContributionData[];
  totalPaidContributions?: number;
  totalPayouts?: number;
  netBalance?: number;
}

export function ContributionChart({ 
  data, 
  totalPaidContributions: allTimePaidContributions,
  totalPayouts: allTimePayouts,
  netBalance: allTimeNetBalance
}: ContributionChartProps) {
  // Use all-time totals if provided, otherwise calculate from chart data
  const totalPaidContributions = allTimePaidContributions ?? data.reduce((sum, d) => sum + d.paid, 0);
  const totalPayouts = allTimePayouts ?? data.reduce((sum, d) => sum + d.payouts, 0);
  const netFlow = allTimeNetBalance ?? (totalPaidContributions - totalPayouts);
  
  // Calculate averages from chart data (6 months)
  const chartPaidTotal = data.reduce((sum, d) => sum + d.paid, 0);
  const chartPayoutsTotal = data.reduce((sum, d) => sum + d.payouts, 0);
  const averageMonthlyIn = data.length > 0 ? chartPaidTotal / data.length : 0;
  const averageMonthlyOut = data.length > 0 ? chartPayoutsTotal / data.length : 0;

  return (
    <Card className="dark:bg-card/50 dark:backdrop-blur">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          Financial Overview
        </CardTitle>
        <CardDescription className="text-xs">
          12-month view of money flowing in and out of your group
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <Tabs defaultValue="simple" className="space-y-3">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="simple" className="text-xs">
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
              Money Flow
            </TabsTrigger>
            <TabsTrigger value="balance" className="text-xs">
              <Wallet className="h-3.5 w-3.5 mr-1.5" />
              Balance
            </TabsTrigger>
            <TabsTrigger value="details" className="text-xs">
              <Info className="h-3.5 w-3.5 mr-1.5" />
              Details
            </TabsTrigger>
          </TabsList>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="p-2.5 rounded-lg border" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              <p className="text-xs text-muted-foreground mb-0.5">Money In</p>
              <p className="text-lg" style={{ color: '#10b981' }}>{formatCurrency(totalPaidContributions)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(averageMonthlyIn)}/mo avg</p>
            </div>
            <div className="p-2.5 rounded-lg border" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <p className="text-xs text-muted-foreground mb-0.5">Money Out</p>
              <p className="text-lg" style={{ color: '#ef4444' }}>{formatCurrency(totalPayouts)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(averageMonthlyOut)}/mo avg</p>
            </div>
            <div className={`${netFlow >= 0 ? 'bg-primary/10 dark:bg-primary/5 border-primary/20' : 'bg-warning/10 dark:bg-warning/5 border-warning/20'} p-2.5 rounded-lg border`}>
              <p className="text-xs text-muted-foreground mb-0.5">Net Balance</p>
              <p className={`text-lg ${netFlow >= 0 ? 'text-primary' : 'text-warning'}`}>
                {formatCurrency(netFlow)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {netFlow >= 0 ? 'Positive flow' : 'Negative flow'}
              </p>
            </div>
          </div>

          {/* Simple Money Flow - Default View */}
          <TabsContent value="simple" className="space-y-2">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded" style={{ backgroundColor: '#10b981' }}></span>
                  Money In
                </span>
                <span className="mx-2">•</span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded" style={{ backgroundColor: '#ef4444' }}></span>
                  Money Out
                </span>
              </p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart 
                data={data}
                margin={{ top: 5, right: 15, left: 0, bottom: 5 }}
                barGap={4}
                barCategoryGap="20%"
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="currentColor"
                  className="text-border dark:text-border"
                  opacity={0.3}
                  vertical={false}
                />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: 'currentColor' }}
                  stroke="currentColor"
                  className="text-muted-foreground/40 dark:text-muted-foreground/30"
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickFormatter={formatAxisCurrency}
                  tickLine={false}
                  axisLine={false}
                  stroke="currentColor"
                  className="text-muted-foreground/40 dark:text-muted-foreground/30"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.2)'
                  }}
                  labelStyle={{ 
                    color: 'hsl(var(--foreground))', 
                    marginBottom: '8px',
                    fontWeight: 600,
                    fontSize: '13px'
                  }}
                  itemStyle={{
                    color: 'hsl(var(--foreground))',
                    fontSize: '12px'
                  }}
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'paid' ? '💰 Money In' : '📤 Money Out'
                  ]}
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }}
                  iconType="square"
                  iconSize={10}
                  formatter={(value) => value === 'paid' ? 'Money In (Contributions)' : 'Money Out (Payouts)'}
                />
                <Bar 
                  dataKey="paid" 
                  fill="#10b981"
                  name="paid"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
                <Bar 
                  dataKey="payouts" 
                  fill="#ef4444"
                  name="payouts"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Balance Trend - Shows cumulative balance over time */}
          <TabsContent value="balance" className="space-y-2">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Track how your group's balance grows or shrinks each month
              </p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart 
                data={data}
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="netFlowGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="currentColor"
                  className="text-border dark:text-border"
                  opacity={0.3}
                  vertical={false}
                />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: 'currentColor' }}
                  stroke="currentColor"
                  className="text-muted-foreground/40 dark:text-muted-foreground/30"
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickFormatter={formatAxisCurrency}
                  tickLine={false}
                  axisLine={false}
                  stroke="currentColor"
                  className="text-muted-foreground/40 dark:text-muted-foreground/30"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.2)'
                  }}
                  labelStyle={{ 
                    color: 'hsl(var(--foreground))', 
                    marginBottom: '8px',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                  itemStyle={{
                    color: 'hsl(var(--foreground))',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Net Balance']}
                  cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2, strokeDasharray: '5 5', opacity: 0.3 }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }}
                  iconSize={10}
                  formatter={() => 'Monthly Net Balance (In - Out)'}
                />
                <Area
                  type="monotone"
                  dataKey="netFlow"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fill="url(#netFlowGradient)"
                  name="netFlow"
                  dot={{ fill: '#3b82f6', r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                  activeDot={{ r: 6, strokeWidth: 2, fill: '#3b82f6', stroke: 'hsl(var(--card))' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Details View - For users who want all the information */}
          <TabsContent value="details" className="space-y-2">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Complete breakdown including paid, unpaid contributions, and payouts
              </p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart 
                data={data}
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="currentColor"
                  className="text-border dark:text-border"
                  opacity={0.3}
                  vertical={false}
                />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: 'currentColor' }}
                  stroke="currentColor"
                  className="text-muted-foreground/40 dark:text-muted-foreground/30"
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickFormatter={formatAxisCurrency}
                  tickLine={false}
                  axisLine={false}
                  stroke="currentColor"
                  className="text-muted-foreground/40 dark:text-muted-foreground/30"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.2)'
                  }}
                  labelStyle={{ 
                    color: 'hsl(var(--foreground))', 
                    marginBottom: '8px',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                  itemStyle={{
                    color: 'hsl(var(--foreground))',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '15px', fontSize: '11px' }}
                  iconType="square"
                  iconSize={10}
                />
                <Bar 
                  dataKey="paid" 
                  fill="#10b981"
                  name="Paid Contributions"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={35}
                />
                <Bar 
                  dataKey="unpaid" 
                  fill="#3b82f6"
                  name="Unpaid Contributions"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={35}
                />
                <Bar 
                  dataKey="payouts" 
                  fill="#ef4444"
                  name="Payouts"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={35}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
