import { useEffect, useState } from 'react';
import type { BurialBeneficiary, BurialClaim } from '@/domain/types';
import { Button } from '@/presentation/ui/button';
import { Input } from '@/presentation/ui/input';
import { Label } from '@/presentation/ui/label';
import { Textarea } from '@/presentation/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Badge } from '@/presentation/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/ui/tabs';
import { ConfirmationDialog } from '@/presentation/shared/ConfirmationDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/ui/tooltip';
import { Plus, Users, FileText, Trash2, CheckCircle, XCircle, DollarSign, Heart } from 'lucide-react';
import { DependentsView } from './DependentsView';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';
import { formatDate, formatCurrency } from '@/lib/export';

interface BurialSocietyViewProps {
  groupId: string;
  isAdmin: boolean;
  userEmail: string;
}

// ─── Status badge helpers ─────────────────────────────────────────────────────

type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'paid';

const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  paid: 'Paid',
};

const CLAIM_STATUS_CLASS: Record<ClaimStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  approved: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  rejected: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  paid: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function BurialSocietyView({ groupId, isAdmin, userEmail }: BurialSocietyViewProps) {
  // Beneficiaries state
  const [beneficiaries, setBeneficiaries] = useState<BurialBeneficiary[]>([]);
  const [loadingBeneficiaries, setLoadingBeneficiaries] = useState(true);
  const [addBeneficiaryOpen, setAddBeneficiaryOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

  // Beneficiary form
  const [bName, setBName] = useState('');
  const [bRelationship, setBRelationship] = useState('');
  const [bIdNumber, setBIdNumber] = useState('');
  const [bPhone, setBPhone] = useState('');
  const [submittingBeneficiary, setSubmittingBeneficiary] = useState(false);

  // Claims state
  const [claims, setClaims] = useState<BurialClaim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [submitClaimOpen, setSubmitClaimOpen] = useState(false);

  // Claim form
  const [cBeneficiaryName, setCBeneficiaryName] = useState('');
  const [cRelationship, setCRelationship] = useState('');
  const [cDeceasedName, setCDeceasedName] = useState('');
  const [cDateOfDeath, setCDateOfDeath] = useState('');
  const [cAmount, setCAmount] = useState('');
  const [cNotes, setCNotes] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Admin action state
  const [actionConfirm, setActionConfirm] = useState<{
    open: boolean;
    claimId: string | null;
    action: ClaimStatus | null;
    label: string;
  }>({ open: false, claimId: null, action: null, label: '' });
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    loadBeneficiaries();
    loadClaims();
  }, [groupId]);

  // ─── Loaders ───────────────────────────────────────────────────────────────

  const loadBeneficiaries = async () => {
    try {
      setLoadingBeneficiaries(true);
      const data = await api.getBurialBeneficiaries(groupId);
      setBeneficiaries(data.beneficiaries || []);
    } catch {
      toast.error('Failed to load beneficiaries');
    } finally {
      setLoadingBeneficiaries(false);
    }
  };

  const loadClaims = async () => {
    try {
      setLoadingClaims(true);
      const data = await api.getBurialClaims(groupId);
      setClaims(data.claims || []);
    } catch {
      toast.error('Failed to load claims');
    } finally {
      setLoadingClaims(false);
    }
  };

  // ─── Beneficiary handlers ──────────────────────────────────────────────────

  const resetBeneficiaryForm = () => {
    setBName('');
    setBRelationship('');
    setBIdNumber('');
    setBPhone('');
  };

  const handleAddBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingBeneficiary(true);
    try {
      await api.addBurialBeneficiary(groupId, {
        name: bName.trim(),
        relationship: bRelationship.trim(),
        idNumber: bIdNumber.trim() || undefined,
        phone: bPhone.trim() || undefined,
      });
      toast.success('Beneficiary added');
      setAddBeneficiaryOpen(false);
      resetBeneficiaryForm();
      loadBeneficiaries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add beneficiary');
    } finally {
      setSubmittingBeneficiary(false);
    }
  };

  const handleDeleteBeneficiary = async () => {
    if (!deleteConfirm.id) return;
    try {
      await api.deleteBurialBeneficiary(groupId, deleteConfirm.id);
      toast.success('Beneficiary removed');
      setDeleteConfirm({ open: false, id: null });
      loadBeneficiaries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove beneficiary');
    }
  };

  // ─── Claim handlers ────────────────────────────────────────────────────────

  const resetClaimForm = () => {
    setCBeneficiaryName('');
    setCRelationship('');
    setCDeceasedName('');
    setCDateOfDeath('');
    setCAmount('');
    setCNotes('');
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingClaim(true);
    try {
      await api.submitBurialClaim(groupId, {
        beneficiaryName: cBeneficiaryName.trim(),
        relationship: cRelationship.trim(),
        deceasedName: cDeceasedName.trim(),
        dateOfDeath: cDateOfDeath,
        amount: parseFloat(cAmount) || 0,
        notes: cNotes.trim() || undefined,
      });
      toast.success('Claim submitted successfully');
      setSubmitClaimOpen(false);
      resetClaimForm();
      loadClaims();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit claim');
    } finally {
      setSubmittingClaim(false);
    }
  };

  const openActionConfirm = (claimId: string, action: ClaimStatus) => {
    const labels: Record<ClaimStatus, string> = {
      approved: 'Approve',
      rejected: 'Reject',
      paid: 'Mark as Paid',
      pending: 'Reset to Pending',
    };
    setActionConfirm({ open: true, claimId, action, label: labels[action] });
  };

  const handleClaimAction = async () => {
    if (!actionConfirm.claimId || !actionConfirm.action) return;
    setProcessingAction(true);
    try {
      await api.updateBurialClaim(groupId, actionConfirm.claimId, { status: actionConfirm.action });
      toast.success(`Claim ${CLAIM_STATUS_LABELS[actionConfirm.action].toLowerCase()}`);
      setActionConfirm({ open: false, claimId: null, action: null, label: '' });
      loadClaims();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update claim');
    } finally {
      setProcessingAction(false);
    }
  };

  // ─── Grouped beneficiaries ─────────────────────────────────────────────────

  const beneficiaryGroups = beneficiaries.reduce<Record<string, BurialBeneficiary[]>>(
    (acc, b) => {
      const key = b.memberEmail;
      if (!acc[key]) acc[key] = [];
      acc[key].push(b);
      return acc;
    },
    {}
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Burial Society
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="beneficiaries">
          <TabsList className="mb-4">
            <TabsTrigger value="beneficiaries" className="gap-1.5">
              <Users className="h-4 w-4" />
              Beneficiaries
            </TabsTrigger>
            <TabsTrigger value="claims" className="gap-1.5">
              <FileText className="h-4 w-4" />
              Claims
              {claims.filter((c) => c.status === 'pending').length > 0 && (
                <Badge className="h-5 min-w-5 px-1 text-xs bg-yellow-500 text-white ml-1">
                  {claims.filter((c) => c.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="dependents" className="gap-1.5">
              <Heart className="h-4 w-4" />
              Dependents
            </TabsTrigger>
          </TabsList>

          {/* ─── Beneficiaries Tab ─────────────────────────────────────── */}
          <TabsContent value="beneficiaries" className="mt-0">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Register your beneficiaries who will receive burial support.
              </p>
              <Dialog
                open={addBeneficiaryOpen}
                onOpenChange={(v) => { setAddBeneficiaryOpen(v); if (!v) resetBeneficiaryForm(); }}
              >
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Beneficiary
                  </Button>
                </DialogTrigger>
                {addBeneficiaryOpen && (
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Beneficiary</DialogTitle>
                      <DialogDescription>
                        Register a beneficiary who can receive burial support on your behalf.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddBeneficiary} className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="b-name">Full Name</Label>
                        <Input
                          id="b-name"
                          value={bName}
                          onChange={(e) => setBName(e.target.value)}
                          placeholder="e.g. Jane Doe"
                          required
                          disabled={submittingBeneficiary}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="b-relationship">Relationship</Label>
                        <Input
                          id="b-relationship"
                          value={bRelationship}
                          onChange={(e) => setBRelationship(e.target.value)}
                          placeholder="e.g. Spouse, Parent, Child"
                          required
                          disabled={submittingBeneficiary}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="b-id">ID Number (optional)</Label>
                        <Input
                          id="b-id"
                          value={bIdNumber}
                          onChange={(e) => setBIdNumber(e.target.value)}
                          placeholder="South African ID number"
                          disabled={submittingBeneficiary}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="b-phone">Phone Number (optional)</Label>
                        <Input
                          id="b-phone"
                          value={bPhone}
                          onChange={(e) => setBPhone(e.target.value)}
                          placeholder="+27 00 000 0000"
                          disabled={submittingBeneficiary}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={submittingBeneficiary}>
                        {submittingBeneficiary ? 'Adding...' : 'Add Beneficiary'}
                      </Button>
                    </form>
                  </DialogContent>
                )}
              </Dialog>
            </div>

            {loadingBeneficiaries ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Loading beneficiaries...
              </div>
            ) : beneficiaries.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No beneficiaries registered yet. Add yours above.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(beneficiaryGroups).map(([memberEmail, memberBeneficiaries]) => {
                  const isOwn = memberEmail === userEmail;
                  return (
                    <div key={memberEmail} className="rounded-lg border">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 rounded-t-lg border-b">
                        <p className="text-sm font-medium text-muted-foreground">
                          {isOwn ? 'Your beneficiaries' : memberEmail}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {memberBeneficiaries.length}{' '}
                          {memberBeneficiaries.length === 1 ? 'person' : 'people'}
                        </Badge>
                      </div>
                      <div className="divide-y">
                        {memberBeneficiaries.map((b) => (
                          <div key={b.id} className="flex items-center justify-between px-4 py-3 gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{b.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {b.relationship}
                                {b.idNumber && ` · ID: ${b.idNumber}`}
                                {b.phone && ` · ${b.phone}`}
                              </p>
                            </div>
                            {(isOwn || isAdmin) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                                    onClick={() => setDeleteConfirm({ open: true, id: b.id })}
                                    aria-label="Remove beneficiary"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Remove</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ─── Claims Tab ────────────────────────────────────────────── */}
          <TabsContent value="claims" className="mt-0">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Submit or review burial support claims.
              </p>
              <Dialog
                open={submitClaimOpen}
                onOpenChange={(v) => { setSubmitClaimOpen(v); if (!v) resetClaimForm(); }}
              >
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Submit Claim
                  </Button>
                </DialogTrigger>
                {submitClaimOpen && (
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Submit Burial Claim</DialogTitle>
                      <DialogDescription>
                        Submit a claim for burial society support. All details will be reviewed by the admin.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitClaim} className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="c-beneficiary">Beneficiary Name</Label>
                        <Input
                          id="c-beneficiary"
                          value={cBeneficiaryName}
                          onChange={(e) => setCBeneficiaryName(e.target.value)}
                          placeholder="Name of the registered beneficiary"
                          required
                          disabled={submittingClaim}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="c-relationship">Relationship to Deceased</Label>
                        <Input
                          id="c-relationship"
                          value={cRelationship}
                          onChange={(e) => setCRelationship(e.target.value)}
                          placeholder="e.g. Spouse, Parent"
                          required
                          disabled={submittingClaim}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="c-deceased">Deceased Full Name</Label>
                        <Input
                          id="c-deceased"
                          value={cDeceasedName}
                          onChange={(e) => setCDeceasedName(e.target.value)}
                          placeholder="Full name of the deceased"
                          required
                          disabled={submittingClaim}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="c-dod">Date of Death</Label>
                        <Input
                          id="c-dod"
                          type="date"
                          value={cDateOfDeath}
                          onChange={(e) => setCDateOfDeath(e.target.value)}
                          required
                          disabled={submittingClaim}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="c-amount">Amount Requested (R)</Label>
                        <Input
                          id="c-amount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={cAmount}
                          onChange={(e) => setCAmount(e.target.value)}
                          placeholder="0.00"
                          required
                          disabled={submittingClaim}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="c-notes">Additional Notes (optional)</Label>
                        <Textarea
                          id="c-notes"
                          value={cNotes}
                          onChange={(e) => setCNotes(e.target.value)}
                          rows={3}
                          placeholder="Any relevant information for the admin..."
                          disabled={submittingClaim}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={submittingClaim}>
                        {submittingClaim ? 'Submitting...' : 'Submit Claim'}
                      </Button>
                    </form>
                  </DialogContent>
                )}
              </Dialog>
            </div>

            {loadingClaims ? (
              <div className="text-center py-10 text-muted-foreground text-sm">Loading claims...</div>
            ) : claims.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No claims submitted yet.
              </div>
            ) : (
              <div className="space-y-3">
                {claims.map((claim) => {
                  const isOwn = claim.claimantEmail === userEmail;
                  const isPending = claim.status === 'pending';
                  const isApproved = claim.status === 'approved';

                  return (
                    <div key={claim.id} className="rounded-lg border p-4 space-y-3">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="text-sm font-semibold">
                            {claim.deceasedName}{' '}
                            <span className="font-normal text-muted-foreground">
                              · {claim.relationship}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Beneficiary: {claim.beneficiaryName} · Passed:{' '}
                            {formatDate(claim.dateOfDeath)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                          <Badge
                            variant="outline"
                            className={`text-xs ${CLAIM_STATUS_CLASS[claim.status]}`}
                          >
                            {CLAIM_STATUS_LABELS[claim.status]}
                          </Badge>
                          <span className="text-sm font-bold">{formatCurrency(claim.amount)}</span>
                        </div>
                      </div>

                      {/* Notes */}
                      {claim.notes && (
                        <p className="text-xs text-muted-foreground border-l-2 pl-3">
                          {claim.notes}
                        </p>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="text-xs text-muted-foreground">
                          Submitted {formatDate(claim.createdAt)}
                          {isOwn && ' · by you'}
                          {!isOwn && ` · ${claim.claimantEmail}`}
                          {claim.processedAt && ` · processed ${formatDate(claim.processedAt)}`}
                        </p>

                        {/* Admin actions */}
                        {isAdmin && (
                          <div className="flex items-center gap-1.5">
                            {isPending && (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950/30"
                                      onClick={() => openActionConfirm(claim.id, 'approved')}
                                    >
                                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                      Approve
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Approve this claim</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30"
                                      onClick={() => openActionConfirm(claim.id, 'rejected')}
                                    >
                                      <XCircle className="h-3.5 w-3.5 mr-1" />
                                      Reject
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Reject this claim</TooltipContent>
                                </Tooltip>
                              </>
                            )}
                            {isApproved && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950/30"
                                    onClick={() => openActionConfirm(claim.id, 'paid')}
                                  >
                                    <DollarSign className="h-3.5 w-3.5 mr-1" />
                                    Mark Paid
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Mark this claim as paid out</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="dependents" className="mt-0">
            <DependentsView groupId={groupId} isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Delete beneficiary confirmation */}
      <ConfirmationDialog
        open={deleteConfirm.open}
        onOpenChange={(v) => setDeleteConfirm({ open: v, id: deleteConfirm.id })}
        title="Remove Beneficiary"
        description="This beneficiary will be permanently removed from the group records."
        onConfirm={handleDeleteBeneficiary}
        confirmText="Remove"
        variant="destructive"
      />

      {/* Admin claim action confirmation */}
      <ConfirmationDialog
        open={actionConfirm.open}
        onOpenChange={(v) => setActionConfirm((prev) => ({ ...prev, open: v }))}
        title={`${actionConfirm.label} Claim`}
        description={
          actionConfirm.action === 'approved'
            ? 'This claim will be approved. The claimant will be notified.'
            : actionConfirm.action === 'rejected'
            ? 'This claim will be rejected. This action should only be taken after careful review.'
            : 'This will mark the claim as paid out. Ensure the funds have been transferred.'
        }
        onConfirm={handleClaimAction}
        confirmText={processingAction ? 'Processing...' : actionConfirm.label}
        variant={actionConfirm.action === 'rejected' ? 'destructive' : 'default'}
      />
    </Card>
  );
}
