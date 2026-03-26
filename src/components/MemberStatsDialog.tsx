import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { UserAvatar } from './UserAvatar';
import { BarChart3, DollarSign, TrendingUp } from 'lucide-react';
import { api } from '../utils/api';
import { formatCurrency, formatDate } from '../utils/export';
import type { MemberStats, Contribution, Payout } from '../types';

interface MemberStatsDialogProps {
  groupId: string;
  memberEmail: string;
  memberName: string;
  children?: React.ReactNode;
}

export function MemberStatsDialog({ groupId, memberEmail, memberName, children }: MemberStatsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<MemberStats | null>(null);

  useEffect(() => {
    if (open) {
      loadStats();
    }
  }, [open]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await api.getMemberStats(groupId, memberEmail);
      setStats(data);
    } catch (error) {
      console.error('Failed to load member stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm">
            <BarChart3 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <UserAvatar name={memberName} email={memberEmail} />
            <div>
              <DialogTitle>Member Statistics</DialogTitle>
              <DialogDescription>{memberName}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : stats ? (
          <div className="space-y-6 pt-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Contributions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    <span className="text-2xl">{formatCurrency(stats.totalContributions || 0)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.contributionCount || 0} contribution{stats.contributionCount !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Payouts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    <span className="text-2xl">{formatCurrency(stats.totalPayouts || 0)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.payoutCount || 0} payout{stats.payoutCount !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Net Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-500" />
                    <span className="text-2xl">
                      {formatCurrency((stats.totalContributions || 0) - (stats.totalPayouts || 0))}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Contributions - Payouts
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Contributions */}
            {stats.recentContributions && stats.recentContributions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Recent Contributions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.recentContributions.slice(0, 5).map((contribution: Contribution, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{formatDate(contribution.date)}</TableCell>
                          <TableCell>{formatCurrency(contribution.amount)}</TableCell>
                          <TableCell>
                            <Badge variant={contribution.status === 'verified' ? 'default' : 'secondary'}>
                              {contribution.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Recent Payouts */}
            {stats.recentPayouts && stats.recentPayouts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Recent Payouts</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.recentPayouts.slice(0, 5).map((payout: Payout, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{formatDate(payout.scheduledDate)}</TableCell>
                          <TableCell>{formatCurrency(payout.amount)}</TableCell>
                          <TableCell>
                            <Badge variant={payout.status === 'completed' ? 'default' : 'secondary'}>
                              {payout.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No statistics available</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
