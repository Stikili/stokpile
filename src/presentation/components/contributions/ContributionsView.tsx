import { useEffect, useState, useMemo } from 'react';
import type { Contribution, Member } from '@/domain/types';
import { Button } from '@/presentation/ui/button';
import { Input } from '@/presentation/ui/input';
import { Label } from '@/presentation/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/presentation/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/ui/select';
import { Checkbox } from '@/presentation/ui/checkbox';
import { Skeleton } from '@/presentation/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/ui/tooltip';
import { Alert, AlertDescription } from '@/presentation/ui/alert';
import { Badge } from '@/presentation/ui/badge';
import { EmptyState } from '@/presentation/shared/EmptyState';
import { UserAvatar } from '@/presentation/components/profile/UserAvatar';
import { MemberStatsDialog } from '@/presentation/components/members/MemberStatsDialog';
import { DatePicker } from '@/presentation/shared/DatePicker';
import { ConfirmationDialog } from '@/presentation/shared/ConfirmationDialog';
import { Plus, Download, DollarSign, Trash2, Search, Info, CreditCard, Loader2, Zap } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';
import { exportToCSV, formatCurrency, formatDate } from '@/lib/export';
import { PaymentProofButton } from '@/presentation/components/shared/PaymentProofButton';

interface ContributionsViewProps {
  groupId: string;
  userEmail: string;
  isAdmin?: boolean;
}

export function ContributionsView({ groupId, userEmail, isAdmin = false }: ContributionsViewProps) {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [selectedMemberEmail, setSelectedMemberEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [payingId, setPayingId] = useState<string | null>(null);
  const [flutterwaveId, setFlutterwaveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<{ open: boolean; pendingSubmit: (() => Promise<void>) | null }>({ open: false, pendingSubmit: null });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMarking, setBulkMarking] = useState(false);

  // Derive filtered list from contributions + search query (no extra state or useEffect needed)
  const filteredContributions = useMemo(() => {
    let filtered = contributions;

    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.user?.fullName?.toLowerCase().includes(search) ||
        c.user?.surname?.toLowerCase().includes(search) ||
        c.userEmail?.toLowerCase().includes(search) ||
        c.amount?.toString().includes(search)
      );
    }

    return [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [contributions, searchQuery]);

  useEffect(() => {
    loadContributions();
    loadMembers();
  }, [groupId]);

  const loadContributions = async () => {
    try {
      setLoading(true);
      const data = await api.getContributions(groupId);
      setContributions(data.contributions || []);
    } catch (error) {
      console.error('Failed to load contributions:', error);
      toast.error('Failed to load contributions');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const data = await api.getMembers(groupId);
      setMembers(data.members || []);
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      const targetEmail = isAdmin && selectedMemberEmail && selectedMemberEmail !== 'self'
        ? selectedMemberEmail
        : undefined;

      await api.createContribution({
        groupId,
        amount: parseFloat(amount),
        date: date.toISOString().split('T')[0],
        paid: false,
        userEmail: targetEmail
      });

      if (targetEmail) {
        const member = members.find(m => m.email === targetEmail);
        toast.success(`Contribution added for ${member?.fullName} ${member?.surname}`);
      } else {
        toast.success('Contribution added successfully');
      }

      setOpen(false);
      setAmount('');
      setDate(new Date());
      setSelectedMemberEmail('');
      loadContributions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add contribution');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for duplicate: same member + same date
    const targetEmail = isAdmin && selectedMemberEmail && selectedMemberEmail !== 'self'
      ? selectedMemberEmail
      : userEmail;
    const dateStr = date.toISOString().split('T')[0];
    const duplicate = contributions.find(
      c => c.userEmail === targetEmail && c.date.split('T')[0] === dateStr
    );

    if (duplicate) {
      setDuplicateWarning({ open: true, pendingSubmit: doSubmit });
      return;
    }

    await doSubmit();
  };

  const handleTogglePaid = async (contribution: Contribution) => {
    try {
      await api.updateContribution(contribution.id, { paid: !contribution.paid });
      toast.success(`Marked as ${!contribution.paid ? 'paid' : 'unpaid'}`);
      loadContributions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update contribution');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;

    try {
      await api.deleteContribution(deleteConfirm.id);
      toast.success('Contribution deleted');
      setDeleteConfirm({ open: false, id: null });
      loadContributions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete contribution');
    }
  };

  const handleBulkMark = async (paid: boolean) => {
    if (selectedIds.size === 0) return;
    setBulkMarking(true);
    try {
      const data = await api.bulkMarkContributions(groupId, Array.from(selectedIds), paid);
      toast.success(`${data.updated} contribution${data.updated !== 1 ? 's' : ''} marked as ${paid ? 'paid' : 'unpaid'}`);
      setSelectedIds(new Set());
      loadContributions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update contributions');
    } finally {
      setBulkMarking(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredContributions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContributions.map(c => c.id)));
    }
  };

  const handlePayNow = async (contribution: Contribution) => {
    setPayingId(contribution.id);
    try {
      const data = await api.createPaymentLink(contribution.id);
      window.open(data.authorizationUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Payment not available');
    } finally {
      setPayingId(null);
    }
  };

  const handleFlutterwavePay = async (contribution: Contribution) => {
    setFlutterwaveId(contribution.id);
    try {
      const data = await api.createFlutterwaveLink(contribution.id);
      window.open(data.paymentLink, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Flutterwave payment not available');
    } finally {
      setFlutterwaveId(null);
    }
  };

  const handleExportContributions = (myOnly = false) => {
    const source = myOnly
      ? filteredContributions.filter(c => c.userEmail === userEmail)
      : filteredContributions;

    const exportData = source.map(c => ({
      Date: formatDate(c.date),
      Member: c.user?.fullName + ' ' + c.user?.surname,
      Email: c.userEmail,
      Amount: c.amount,
      Status: c.paid ? 'Paid' : 'Unpaid',
      'Created At': formatDate(c.createdAt)
    }));

    const suffix = myOnly ? 'my_history' : `all_${groupId}`;
    exportToCSV(exportData, `contributions_${suffix}_${new Date().toISOString().split('T')[0]}`);
    toast.success('Contributions exported successfully!');
  };

  // Calculate totals (memoized to avoid recalculating on every render)
  const { totalContributions, paidContributions, unpaidContributions } = useMemo(() => {
    const total = filteredContributions.reduce((sum, c) => sum + c.amount, 0);
    const paid = filteredContributions.filter(c => c.paid).reduce((sum, c) => sum + c.amount, 0);
    return { totalContributions: total, paidContributions: paid, unpaidContributions: total - paid };
  }, [filteredContributions]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Contributions</CardTitle>
          <div className="flex gap-2">
            {isAdmin && selectedIds.size > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={() => handleBulkMark(true)} disabled={bulkMarking} className="text-green-700 border-green-300">
                  {bulkMarking ? 'Marking...' : `Mark ${selectedIds.size} Paid`}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkMark(false)} disabled={bulkMarking} className="text-orange-700 border-orange-300">
                  Mark Unpaid
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} disabled={bulkMarking}>
                  Clear
                </Button>
              </>
            )}
            {contributions.length > 0 && isAdmin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => handleExportContributions(false)}>
                    <Download className="h-4 w-4 lg:mr-2" />
                    <span className="hidden lg:inline">Export All</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export all contributions to CSV</TooltipContent>
              </Tooltip>
            )}
            {contributions.some(c => c.userEmail === userEmail) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => handleExportContributions(!isAdmin)}>
                    <Download className="h-4 w-4 lg:mr-2" />
                    <span className="hidden lg:inline">{isAdmin ? 'Export Mine' : 'Export CSV'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isAdmin ? 'Export only your contributions' : 'Export your contribution history'}</TooltipContent>
              </Tooltip>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline">Add Contribution</span>
                </Button>
              </DialogTrigger>
              {open && (
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Monthly Contribution</DialogTitle>
                    <DialogDescription>
                      {isAdmin 
                        ? 'Add a contribution for yourself or on behalf of a group member'
                        : 'Record your monthly contribution to the group'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    {isAdmin && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="member">Member</Label>
                          <Select 
                            value={selectedMemberEmail} 
                            onValueChange={setSelectedMemberEmail}
                            disabled={submitting}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select member (optional - defaults to yourself)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="self">Myself ({userEmail})</SelectItem>
                              {members
                                .filter(member => member.status === 'approved' && member.email !== userEmail)
                                .map(member => (
                                  <SelectItem key={member.email} value={member.email}>
                                    {member.fullName} {member.surname}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {selectedMemberEmail && selectedMemberEmail !== 'self' && (
                          <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                              You are adding this contribution on behalf of {
                                members.find(m => m.email === selectedMemberEmail)?.fullName
                              } {
                                members.find(m => m.email === selectedMemberEmail)?.surname
                              }
                            </AlertDescription>
                          </Alert>
                        )}
                      </>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (ZAR)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        disabled={submitting}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date">Contribution Date</Label>
                      <DatePicker
                        date={date}
                        onSelect={(d) => d && setDate(d)}
                        disabled={submitting}
                      />
                      <p className="text-xs text-muted-foreground">Select the date when this contribution was made</p>
                    </div>

                    {/* Real-time duplicate warning */}
                    {(() => {
                      const targetEmail = isAdmin && selectedMemberEmail && selectedMemberEmail !== 'self'
                        ? selectedMemberEmail
                        : userEmail;
                      const dateStr = date.toISOString().split('T')[0];
                      const existing = contributions.find(
                        c => c.userEmail === targetEmail && c.date.split('T')[0] === dateStr
                      );
                      return existing ? (
                        <Alert variant="destructive">
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            A contribution of {formatCurrency(existing.amount)} already exists for this member on {formatDate(existing.date)}. You can still submit to add a second one.
                          </AlertDescription>
                        </Alert>
                      ) : null;
                    })()}

                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? 'Adding...' : 'Add Contribution'}
                    </Button>
                  </form>
                </DialogContent>
              )}
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          {!loading && contributions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl">{formatCurrency(totalContributions)}</div>
                  <p className="text-xs text-muted-foreground">Total Contributions</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl text-green-600 dark:text-green-400">{formatCurrency(paidContributions)}</div>
                  <p className="text-xs text-muted-foreground">Paid</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl text-orange-600 dark:text-orange-400">{formatCurrency(unpaidContributions)}</div>
                  <p className="text-xs text-muted-foreground">Unpaid</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Search */}
          {!loading && contributions.length > 0 && (
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search contributions by name, email, or amount..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : contributions.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No contributions yet"
              description="Start by adding your first contribution to the group"
              action={{
                label: 'Add Contribution',
                onClick: () => setOpen(true)
              }}
            />
          ) : filteredContributions.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No matching contributions"
              description="Try adjusting your filters"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && (
                      <TableHead className="w-8">
                        <Checkbox
                          checked={filteredContributions.length > 0 && selectedIds.size === filteredContributions.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                    )}
                    <TableHead>Member</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContributions.map((contribution) => (
                    <TableRow key={contribution.id} className={selectedIds.has(contribution.id) ? 'bg-muted/40' : ''}>
                      {isAdmin && (
                        <TableCell className="w-8">
                          <Checkbox
                            checked={selectedIds.has(contribution.id)}
                            onCheckedChange={() => toggleSelect(contribution.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <MemberStatsDialog
                            groupId={groupId}
                            memberEmail={contribution.userEmail}
                            memberName={`${contribution.user?.fullName} ${contribution.user?.surname}`}
                          >
                            <button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                              <UserAvatar 
                                name={`${contribution.user?.fullName} ${contribution.user?.surname}`}
                                email={contribution.userEmail}
                                profilePictureUrl={contribution.user?.profilePictureUrl}
                              />
                              <div className="hidden sm:flex sm:flex-col sm:items-start">
                                <span>{contribution.user?.fullName} {contribution.user?.surname}</span>
                                {contribution.createdBy && contribution.createdBy !== contribution.userEmail && (
                                  <Badge variant="secondary" className="text-xs mt-0.5">
                                    Added by admin
                                  </Badge>
                                )}
                              </div>
                            </button>
                          </MemberStatsDialog>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(contribution.amount)}</TableCell>
                      <TableCell>{formatDate(contribution.date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={contribution.paid}
                            onCheckedChange={() => handleTogglePaid(contribution)}
                            disabled={!isAdmin && contribution.userEmail !== userEmail}
                          />
                          <Badge
                            variant={contribution.paid ? 'default' : 'secondary'}
                            className={contribution.paid
                              ? 'bg-green-600 dark:bg-green-700 text-white'
                              : 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-800'}
                          >
                            {contribution.paid ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!contribution.paid && contribution.userEmail === userEmail && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePayNow(contribution)}
                                    disabled={payingId === contribution.id}
                                    className="text-primary border-primary/30 hover:bg-primary/5 h-8 px-2"
                                  >
                                    {payingId === contribution.id
                                      ? <Loader2 className="h-3 w-3 animate-spin" />
                                      : <><CreditCard className="h-3 w-3 mr-1" /><span className="text-xs">Pay</span></>
                                    }
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Pay via Paystack (card/bank)</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleFlutterwavePay(contribution)}
                                    disabled={flutterwaveId === contribution.id}
                                    className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/20 h-8 px-2"
                                  >
                                    {flutterwaveId === contribution.id
                                      ? <Loader2 className="h-3 w-3 animate-spin" />
                                      : <><Zap className="h-3 w-3 mr-1" /><span className="text-xs">Flutterwave</span></>
                                    }
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Pay via Flutterwave (mobile money, card)</TooltipContent>
                              </Tooltip>
                            </>
                          )}
                          <PaymentProofButton
                            groupId={groupId}
                            linkedType="contribution"
                            linkedId={contribution.id}
                            isAdmin={isAdmin}
                          />
                          {(contribution.userEmail === userEmail || isAdmin) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteConfirm({ open: true, id: contribution.id })}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {contribution.userEmail === userEmail ? 'Delete contribution' : 'Delete contribution (Admin)'}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
        title="Delete Contribution"
        description="Are you sure you want to delete this contribution? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />

      <ConfirmationDialog
        open={duplicateWarning.open}
        onOpenChange={(open) => setDuplicateWarning({ open, pendingSubmit: open ? duplicateWarning.pendingSubmit : null })}
        title="Duplicate Contribution"
        description="A contribution already exists for this member on the selected date. Are you sure you want to add another one?"
        confirmText="Add Anyway"
        variant="warning"
        onConfirm={async () => {
          setDuplicateWarning({ open: false, pendingSubmit: null });
          if (duplicateWarning.pendingSubmit) await duplicateWarning.pendingSubmit();
        }}
      />
    </>
  );
}
