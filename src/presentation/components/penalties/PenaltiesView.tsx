import { useEffect, useState } from 'react';
import type { PenaltyRule, PenaltyCharge, Member } from '@/domain/types';
import { Button } from '@/presentation/ui/button';
import { Input } from '@/presentation/ui/input';
import { Label } from '@/presentation/ui/label';
import { Textarea } from '@/presentation/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Badge } from '@/presentation/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/presentation/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/presentation/ui/table';
import { ConfirmationDialog } from '@/presentation/shared/ConfirmationDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/ui/tooltip';
import { Plus, Trash2, Gavel, AlertCircle } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/export';

interface PenaltiesViewProps {
  groupId: string;
  isAdmin: boolean;
}

const statusVariants: Record<string, string> = {
  outstanding: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
  paid: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
  waived: 'bg-muted text-muted-foreground',
};

export function PenaltiesView({ groupId, isAdmin }: PenaltiesViewProps) {
  const [rules, setRules] = useState<PenaltyRule[]>([]);
  const [charges, setCharges] = useState<PenaltyCharge[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [chargeDialogOpen, setChargeDialogOpen] = useState(false);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Rule form
  const [ruleName, setRuleName] = useState('');
  const [ruleAmount, setRuleAmount] = useState('');
  const [ruleDesc, setRuleDesc] = useState('');

  // Charge form
  const [chargeMember, setChargeMember] = useState('');
  const [chargeRule, setChargeRule] = useState('');
  const [chargeReason, setChargeReason] = useState('');

  useEffect(() => { load(); }, [groupId]);

  const load = async () => {
    setLoading(true);
    try {
      const [penData, membersData] = await Promise.all([
        api.getPenalties(groupId),
        api.getMembers(groupId),
      ]);
      setRules(penData.rules || []);
      setCharges(penData.charges || []);
      setMembers(membersData.members.filter(m => m.status === 'approved'));
    } catch {
      toast.error('Failed to load penalties');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createPenaltyRule(groupId, { name: ruleName, amount: Number(ruleAmount), description: ruleDesc || undefined });
      toast.success('Penalty rule created');
      setRuleDialogOpen(false);
      setRuleName(''); setRuleAmount(''); setRuleDesc('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRule = async () => {
    if (!deleteRuleId) return;
    try {
      await api.deletePenaltyRule(groupId, deleteRuleId);
      toast.success('Rule removed');
      setDeleteRuleId(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove rule');
    }
  };

  const handleCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.chargePenalty(groupId, { memberEmail: chargeMember, ruleId: chargeRule, reason: chargeReason || undefined });
      toast.success('Fine issued');
      setChargeDialogOpen(false);
      setChargeMember(''); setChargeRule(''); setChargeReason('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to issue fine');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCharge = async (chargeId: string, status: string) => {
    try {
      await api.updatePenaltyCharge(groupId, chargeId, { status });
      toast.success(`Fine marked as ${status}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update fine');
    }
  };

  const totalOutstanding = charges.filter(c => c.status === 'outstanding').reduce((s, c) => s + c.amount, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Gavel className="h-5 w-5" />
          Penalties &amp; Fines
          {totalOutstanding > 0 && (
            <Badge variant="destructive" className="ml-2">{formatCurrency(totalOutstanding)} outstanding</Badge>
          )}
        </CardTitle>
        {isAdmin && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setRuleDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Rule
            </Button>
            <Button size="sm" onClick={() => setChargeDialogOpen(true)} disabled={rules.length === 0}>
              <AlertCircle className="h-4 w-4 mr-1" />
              Issue Fine
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="charges">
          <TabsList className="mb-4">
            <TabsTrigger value="charges">Fines Issued ({charges.length})</TabsTrigger>
            <TabsTrigger value="rules">Rules ({rules.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="charges">
            {loading ? (
              <p className="text-center py-6 text-sm text-muted-foreground">Loading...</p>
            ) : charges.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">No fines issued yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Rule</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      {isAdmin && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {charges.map(charge => (
                      <TableRow key={charge.id}>
                        <TableCell className="text-sm">{charge.memberEmail}</TableCell>
                        <TableCell className="text-sm">{charge.ruleName}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(charge.amount)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(charge.createdAt)}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${statusVariants[charge.status] || ''}`}>{charge.status}</Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            {charge.status === 'outstanding' && (
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleUpdateCharge(charge.id, 'paid')}>Paid</Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => handleUpdateCharge(charge.id, 'waived')}>Waive</Button>
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
          </TabsContent>

          <TabsContent value="rules">
            {rules.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">
                No penalty rules defined.{isAdmin ? ' Add a rule to start issuing fines.' : ''}
              </p>
            ) : (
              <div className="space-y-2">
                {rules.map(rule => (
                  <div key={rule.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium text-sm">{rule.name} — <span className="text-primary">{formatCurrency(rule.amount)}</span></p>
                      {rule.description && <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>}
                    </div>
                    {isAdmin && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteRuleId(rule.id)} aria-label="Delete rule">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete rule</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Create rule dialog */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Penalty Rule</DialogTitle>
            <DialogDescription>Define a fine that can be charged to members</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRule} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="rule-name">Rule Name</Label>
              <Input id="rule-name" value={ruleName} onChange={e => setRuleName(e.target.value)} placeholder="e.g. Missed meeting" required disabled={submitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-amount">Fine Amount</Label>
              <Input id="rule-amount" type="number" min="1" step="0.01" value={ruleAmount} onChange={e => setRuleAmount(e.target.value)} placeholder="50.00" required disabled={submitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-desc">Description (optional)</Label>
              <Textarea id="rule-desc" value={ruleDesc} onChange={e => setRuleDesc(e.target.value)} rows={2} disabled={submitting} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>{submitting ? 'Creating...' : 'Create Rule'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Issue fine dialog */}
      <Dialog open={chargeDialogOpen} onOpenChange={setChargeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Fine</DialogTitle>
            <DialogDescription>Charge a penalty to a group member</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCharge} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Member</Label>
              <Select value={chargeMember} onValueChange={setChargeMember} required>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {members.map(m => <SelectItem key={m.email} value={m.email}>{m.fullName} {m.surname}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Penalty Rule</Label>
              <Select value={chargeRule} onValueChange={setChargeRule} required>
                <SelectTrigger><SelectValue placeholder="Select rule" /></SelectTrigger>
                <SelectContent>
                  {rules.map(r => <SelectItem key={r.id} value={r.id}>{r.name} ({formatCurrency(r.amount)})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="charge-reason">Reason (optional)</Label>
              <Input id="charge-reason" value={chargeReason} onChange={e => setChargeReason(e.target.value)} placeholder="Additional context..." disabled={submitting} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting || !chargeMember || !chargeRule}>
              {submitting ? 'Issuing...' : 'Issue Fine'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={!!deleteRuleId}
        onOpenChange={v => !v && setDeleteRuleId(null)}
        title="Delete Penalty Rule"
        description="This rule will be permanently removed. Any existing charges using this rule will remain."
        onConfirm={handleDeleteRule}
        confirmText="Delete"
        variant="destructive"
      />
    </Card>
  );
}
