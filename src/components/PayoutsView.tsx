import { useEffect, useState, useMemo } from 'react';
import type { Payout, Member } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { EmptyState } from './EmptyState';
import { UserAvatar } from './UserAvatar';
import { Alert, AlertDescription } from './ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { ConfirmationDialog } from './ConfirmationDialog';
import { Plus, Download, TrendingUp, Info, Search, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { exportToCSV, formatCurrency, formatDate } from '../utils/export';
import { sanitizeAmount } from '../utils/sanitize';

interface PayoutsViewProps {
  groupId: string;
  isAdmin: boolean;
}

export function PayoutsView({ groupId, isAdmin }: PayoutsViewProps) {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');
  const [updateConfirm, setUpdateConfirm] = useState<{ open: boolean; payoutId: string; status: string; label: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [groupId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [payoutsData, membersData] = await Promise.all([
        api.getPayouts(groupId),
        api.getMembers(groupId)
      ]);

      const sortedPayouts = (payoutsData.payouts || []).sort((a: Payout, b: Payout) =>
        new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
      );

      setPayouts(sortedPayouts);
      setMembers(membersData.members || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const sanitized = sanitizeAmount(amount);
      await api.createPayout({
        groupId,
        recipientEmail,
        amount: sanitized,
        scheduledDate
      });

      toast.success('Payout scheduled successfully');
      setOpen(false);
      setRecipientEmail('');
      setAmount('');
      setScheduledDate(new Date().toISOString().split('T')[0]);
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to schedule payout');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (payoutId: string, status: string) => {
    try {
      await api.updatePayout(payoutId, { status });
      toast.success(`Payout marked as ${status}`);
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update payout');
    }
  };

  const handleExportPayouts = () => {
    const exportData = filteredPayouts.map(p => ({
      'Scheduled Date': formatDate(p.scheduledDate),
      Recipient: p.recipient && p.recipient.fullName !== 'Unknown'
        ? `${p.recipient.fullName} ${p.recipient.surname}`
        : p.recipientEmail,
      Email: p.recipientEmail,
      Amount: p.amount,
      Status: p.status,
      'Created At': formatDate(p.createdAt)
    }));

    exportToCSV(exportData, `payouts_${groupId}_${new Date().toISOString().split('T')[0]}`);
    toast.success('Payouts exported successfully!');
  };

  // Filtered + searched payouts
  const filteredPayouts = useMemo(() => {
    return payouts.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const name = p.recipient && p.recipient.fullName !== 'Unknown'
        ? `${p.recipient.fullName} ${p.recipient.surname}`.toLowerCase()
        : p.recipientEmail.toLowerCase();
      return name.includes(q) || p.recipientEmail.toLowerCase().includes(q) || p.amount.toString().includes(q);
    });
  }, [payouts, searchQuery, statusFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const scheduled = payouts.filter(p => p.status === 'scheduled').reduce((s, p) => s + p.amount, 0);
    const completed = payouts.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
    const scheduledCount = payouts.filter(p => p.status === 'scheduled').length;
    const completedCount = payouts.filter(p => p.status === 'completed').length;
    return { scheduled, completed, scheduledCount, completedCount };
  }, [payouts]);

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return <Badge className="bg-green-600 dark:bg-green-700 text-white"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
    }
    if (status === 'cancelled') {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
    }
    return <Badge className="bg-blue-600 dark:bg-blue-700 text-white"><Clock className="h-3 w-3 mr-1" />Scheduled</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Payouts</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {isAdmin
                  ? 'Schedule and manage payouts to group members'
                  : 'View scheduled payouts for group members'}
              </p>
            </div>
            <div className="flex gap-2">
              {payouts.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleExportPayouts}>
                      <Download className="h-4 w-4 lg:mr-2" />
                      <span className="hidden lg:inline">Export CSV</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export to CSV</TooltipContent>
                </Tooltip>
              )}
              {isAdmin && (
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 lg:mr-2" />
                      <span className="hidden lg:inline">Schedule Payout</span>
                    </Button>
                  </DialogTrigger>
                  {open && (
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Schedule Payout</DialogTitle>
                        <DialogDescription>
                          Set up a new payout for approved group members
                        </DialogDescription>
                      </DialogHeader>
                      {members.filter(m => m.status === 'approved').length === 0 && (
                        <Alert variant="destructive" className="mt-4">
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            No approved members available for payouts.
                          </AlertDescription>
                        </Alert>
                      )}
                      <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label htmlFor="recipient">Recipient <span className="text-destructive">*</span></Label>
                          <Select value={recipientEmail} onValueChange={setRecipientEmail} required disabled={submitting}>
                            <SelectTrigger id="recipient">
                              <SelectValue placeholder="Select approved group member" />
                            </SelectTrigger>
                            <SelectContent>
                              {members
                                .filter(member => member.status === 'approved')
                                .sort((a, b) => `${a.fullName} ${a.surname}`.localeCompare(`${b.fullName} ${b.surname}`))
                                .map(member => (
                                  <SelectItem key={member.email} value={member.email}>
                                    <div className="flex items-center gap-2">
                                      <span>{member.fullName} {member.surname}</span>
                                      {member.role === 'admin' && (
                                        <Badge variant="secondary" className="text-xs">Admin</Badge>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <p className="text-sm text-muted-foreground">
                            {members.filter(m => m.status === 'approved').length} approved member{members.filter(m => m.status === 'approved').length !== 1 ? 's' : ''} available
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="amount">Amount (ZAR)</Label>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            max="999999999"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                            disabled={submitting}
                            placeholder="0.00"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="date">Scheduled Date</Label>
                          <Input
                            id="date"
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            required
                            disabled={submitting}
                          />
                        </div>

                        <Button
                          type="submit"
                          className="w-full"
                          disabled={submitting || members.filter(m => m.status === 'approved').length === 0}
                        >
                          {submitting ? 'Scheduling...' : 'Schedule Payout'}
                        </Button>
                      </form>
                    </DialogContent>
                  )}
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!loading && payouts.length > 0 && (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-xs">Scheduled</span>
                    </div>
                    <p className="text-lg">{formatCurrency(stats.scheduled)}</p>
                    <p className="text-xs text-muted-foreground">{stats.scheduledCount} payout{stats.scheduledCount !== 1 ? 's' : ''}</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span className="text-xs">Paid Out</span>
                    </div>
                    <p className="text-lg">{formatCurrency(stats.completed)}</p>
                    <p className="text-xs text-muted-foreground">{stats.completedCount} completed</p>
                  </CardContent>
                </Card>
              </div>

              {/* Search and filter */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or amount..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  {(['all', 'scheduled', 'completed', 'cancelled'] as const).map(s => (
                    <Button
                      key={s}
                      variant={statusFilter === s ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter(s)}
                      className="capitalize"
                    >
                      {s === 'all' ? `All (${payouts.length})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${payouts.filter(p => p.status === s).length})`}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

          {!isAdmin && payouts.length > 0 && (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Only group admins can schedule or manage payouts.
              </AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : payouts.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No payouts scheduled"
              description={isAdmin
                ? 'Create your first payout to distribute funds to members'
                : "Your group admins haven't scheduled any payouts yet."}
              action={isAdmin ? { label: 'Schedule Payout', onClick: () => setOpen(true) } : undefined}
            />
          ) : filteredPayouts.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matching payouts"
              description="Try adjusting your search or filter"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={payout.recipient && payout.recipient.fullName !== 'Unknown'
                              ? `${payout.recipient.fullName} ${payout.recipient.surname}`
                              : payout.recipientEmail}
                            email={payout.recipientEmail}
                            profilePictureUrl={payout.recipient?.profilePictureUrl}
                          />
                          <div className="flex flex-col">
                            <span className="hidden sm:block">
                              {payout.recipient && payout.recipient.fullName !== 'Unknown'
                                ? `${payout.recipient.fullName} ${payout.recipient.surname}`
                                : payout.recipientEmail}
                            </span>
                            <span className="text-xs text-muted-foreground hidden sm:block">{payout.recipientEmail}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(payout.amount)}</TableCell>
                      <TableCell>{formatDate(payout.scheduledDate)}</TableCell>
                      <TableCell>{getStatusBadge(payout.status)}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          {payout.status === 'scheduled' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => setUpdateConfirm({ open: true, payoutId: payout.id, status: 'completed', label: 'complete' })}
                              >
                                Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setUpdateConfirm({ open: true, payoutId: payout.id, status: 'cancelled', label: 'cancel' })}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {updateConfirm && (
        <ConfirmationDialog
          open={updateConfirm.open}
          onOpenChange={(open) => setUpdateConfirm(open ? updateConfirm : null)}
          title={updateConfirm.status === 'completed' ? 'Complete Payout' : 'Cancel Payout'}
          description={
            updateConfirm.status === 'completed'
              ? 'Confirm that this payout has been made. This will mark it as completed and deduct it from the group balance.'
              : 'Are you sure you want to cancel this payout? The recipient will not receive the funds.'
          }
          confirmText={updateConfirm.status === 'completed' ? 'Mark Complete' : 'Cancel Payout'}
          variant={updateConfirm.status === 'completed' ? 'default' : 'warning'}
          onConfirm={() => {
            handleUpdateStatus(updateConfirm!.payoutId, updateConfirm!.status);
            setUpdateConfirm(null);
          }}
        />
      )}
    </>
  );
}
