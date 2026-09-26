import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/presentation/ui/button';
import { Input } from '@/presentation/ui/input';
import { Label } from '@/presentation/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/presentation/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/ui/select';
import { StatusChip } from '@/presentation/shared/StatusChip';
import { useLoanBook } from '@/application/hooks/useLoanBook';
import { useMembers } from '@/application/hooks/queries';
import {
  canApproveLoan, daysLate, instalment, instalmentsPaid, isLate, loanSignatures, outstanding, repaid, totalDue,
  type Loan,
} from '@/domain/loans';
import { displayName, isActiveMember } from '@/domain/round';
import { money } from '@/lib/money';
import { formatDate } from '@/lib/export';

interface LoanBookViewProps {
  groupId: string;
  isAdmin: boolean;
  userEmail: string;
  onOpenSettings?: () => void;
}

/**
 * The group's loan book. The group lends to its own members at a rate it
 * sets; two admins release each loan; Stokpile keeps the record.
 */
export function LoanBookView({ groupId, isAdmin, userEmail, onOpenSettings }: LoanBookViewProps) {
  const book = useLoanBook(groupId);
  const members = useMembers(groupId).data?.members ?? [];
  const [requestOpen, setRequestOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const nameOf = useMemo(() => {
    const map = new Map(members.map((m) => [m.email, displayName(m.fullName, m.surname, m.email)]));
    return (email: string) => map.get(email) ?? email;
  }, [members]);
  const adminEmails = useMemo(() => new Set(members.filter((m) => m.role === 'admin').map((m) => m.email)), [members]);
  const selected = book.loans.find((l) => l.id === selectedId) ?? null;
  const s = book.summary;

  return (
    <div className="space-y-4">
      <section className="card space-y-3" aria-label="Loan book">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="t-label">Loan book</span>
            <div className="t-figure text-[length:var(--t-display-size)] leading-none mt-1">{money(s.outstanding)}</div>
            <p className="text-sm text-muted-foreground mt-2">
              owed back on {s.activeCount} loan{s.activeCount === 1 ? '' : 's'} · {money(s.lentOut)} lent out
            </p>
          </div>
          {s.lateCount > 0 && <StatusChip tone="late" label={`${s.lateCount} late`} />}
        </div>
        <p className="text-xs text-muted-foreground">
          {book.ratePercent != null
            ? <>Interest: <span className="font-semibold">{book.ratePercent}% flat</span>, set by your group. Stokpile keeps the record; it doesn’t lend, set rates or score anyone.</>
            : <>Your group hasn’t set its loan rate yet.{isAdmin && onOpenSettings ? <> <button type="button" className="underline" onClick={onOpenSettings}>Set it in Group settings</button>.</> : ' An admin can set it in Group settings.'}</>}
        </p>
        <Button className="w-full h-11" onClick={() => setRequestOpen(true)} disabled={book.ratePercent == null}>
          <Plus className="h-4 w-4 mr-2" />{isAdmin ? 'Record a loan request' : 'Request a loan'}
        </Button>
      </section>

      <section className="card" aria-label="Loans">
        <div className="flex items-center justify-between mb-1">
          <h2 className="t-heading">Loans</h2>
          {s.awaitingApproval > 0 && <StatusChip tone="due" label={`${s.awaitingApproval} awaiting approval`} />}
        </div>
        {book.loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading loans…</p>
        ) : book.loans.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No loans yet.</p>
        ) : (
          <div>
            {book.loans.map((loan, i) => {
              const late = isLate(loan);
              const sig = loanSignatures(loan, book.activeAdminCount, adminEmails.has(loan.borrowerEmail));
              return (
                <button key={loan.id} type="button" onClick={() => setSelectedId(loan.id)}
                  className={`loan-row w-full text-left hover:bg-accent/40${late ? ' loan-row--late' : ''}`}>
                  <span className="loan-row__seq">{String(book.loans.length - i).padStart(2, '0')}</span>
                  <div className="min-w-0">
                    <div className="loan-row__who truncate">{nameOf(loan.borrowerEmail)}</div>
                    <div className="loan-row__what truncate">{loanLine(loan, late, sig)}</div>
                  </div>
                  <span className="loan-row__amt">
                    {loan.status === 'active' ? money(outstanding(loan)) : money(loan.principal)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <RequestLoanDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        isAdmin={isAdmin}
        userEmail={userEmail}
        ratePercent={book.ratePercent ?? 0}
        borrowers={members.filter(isActiveMember).map((m) => ({ email: m.email, name: displayName(m.fullName, m.surname, m.email) }))}
        onSubmit={async (data) => {
          await book.request.mutateAsync(data);
          toast.success('Loan request recorded. Two admins must approve it before it’s released.');
        }}
      />

      <LoanDialog
        loan={selected}
        onClose={() => setSelectedId(null)}
        nameOf={nameOf}
        isAdmin={isAdmin}
        userEmail={userEmail}
        signatures={selected ? loanSignatures(selected, book.activeAdminCount, adminEmails.has(selected.borrowerEmail)) : null}
        onApprove={async (id) => { await book.approve.mutateAsync(id); toast.success('Signed'); }}
        onDecline={async (id) => { await book.decline.mutateAsync({ loanId: id }); toast.success('Loan request declined'); }}
        onRepay={async (id, amount, method) => { await book.repay.mutateAsync({ loanId: id, amount, method }); toast.success('Repayment recorded'); }}
      />
    </div>
  );
}

function loanLine(loan: Loan, late: boolean, sig: { have: number; required: number; blocked: boolean }): string {
  const purpose = loan.purpose ? `${loan.purpose} · ` : '';
  switch (loan.status) {
    case 'requested':
      return sig.blocked ? `${purpose}needs another admin to approve` : `${purpose}${sig.have} of ${sig.required} signatures`;
    case 'active':
      return `${purpose}${instalmentsPaid(loan)} of ${loan.termMonths}${late ? ` · ${daysLate(loan)} days late` : loan.dueDate ? ` · due ${formatDate(loan.dueDate)}` : ''}`;
    case 'repaid':
      return `${purpose}repaid${loan.closedAt ? ` ${formatDate(loan.closedAt)}` : ''}`;
    default:
      return `${purpose}declined`;
  }
}

function RequestLoanDialog({ open, onOpenChange, isAdmin, userEmail, ratePercent, borrowers, onSubmit }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  isAdmin: boolean;
  userEmail: string;
  ratePercent: number;
  borrowers: { email: string; name: string }[];
  onSubmit: (data: { borrowerEmail?: string; principal: number; termMonths: number; purpose?: string }) => Promise<void>;
}) {
  const [borrower, setBorrower] = useState(userEmail);
  const [amount, setAmount] = useState('');
  const [term, setTerm] = useState('6');
  const [purpose, setPurpose] = useState('');
  const [busy, setBusy] = useState(false);
  const principal = Number(amount) || 0;
  const months = Math.max(1, Math.round(Number(term) || 1));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit({ borrowerEmail: isAdmin ? borrower : undefined, principal, termMonths: months, purpose: purpose.trim() || undefined });
      setAmount(''); setPurpose(''); onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t record the loan request');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isAdmin ? 'Record a loan request' : 'Request a loan'}</DialogTitle>
          <DialogDescription>The group decides. Two admins must approve before the money is released.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="loan-borrower">Borrower</Label>
              <Select value={borrower} onValueChange={setBorrower}>
                <SelectTrigger id="loan-borrower"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {borrowers.map((b) => <SelectItem key={b.email} value={b.email}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="loan-amount">Amount</Label>
              <Input id="loan-amount" type="number" inputMode="decimal" min="1" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loan-term">Months to repay</Label>
              <Input id="loan-term" type="number" inputMode="numeric" min="1" max="36" value={term} onChange={(e) => setTerm(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="loan-purpose">What it’s for (optional)</Label>
            <Input id="loan-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. School fees" />
          </div>
          {principal > 0 && (
            <div className="card card--quiet text-sm">
              <div className="ledger-row"><span>Borrowed</span><span className="ledger-row__leader" /><span className="ledger-row__value">{money(principal, { decimals: true })}</span></div>
              <div className="ledger-row"><span>Interest ({ratePercent}% flat)</span><span className="ledger-row__leader" /><span className="ledger-row__value">{money(totalDue(principal, ratePercent) - principal, { decimals: true })}</span></div>
              <div className="ledger-row"><span className="font-semibold">To repay</span><span className="ledger-row__leader" /><span className="ledger-row__value">{money(totalDue(principal, ratePercent), { decimals: true })}</span></div>
              <p className="text-xs text-muted-foreground mt-2">{months} monthly payment{months === 1 ? '' : 's'} of about {money(instalment(principal, ratePercent, months), { decimals: true })}</p>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={busy || principal <= 0}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}{isAdmin ? 'Record request' : 'Send request'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LoanDialog({ loan, onClose, nameOf, isAdmin, userEmail, signatures, onApprove, onDecline, onRepay }: {
  loan: Loan | null;
  onClose: () => void;
  nameOf: (email: string) => string;
  isAdmin: boolean;
  userEmail: string;
  signatures: { have: number; required: number; complete: boolean; blocked: boolean } | null;
  onApprove: (id: string) => Promise<void>;
  onDecline: (id: string) => Promise<void>;
  onRepay: (id: string, amount: number, method?: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [busy, setBusy] = useState<null | 'approve' | 'decline' | 'repay'>(null);

  const act = async (kind: 'approve' | 'decline' | 'repay', fn: () => Promise<void>) => {
    setBusy(kind);
    try { await fn(); if (kind === 'repay') setAmount(''); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Something went wrong'); }
    finally { setBusy(null); }
  };

  if (!loan) return null;
  const left = outstanding(loan);
  const late = isLate(loan);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{nameOf(loan.borrowerEmail)}</DialogTitle>
          <DialogDescription>{loan.purpose || 'Loan'} · requested {formatDate(loan.createdAt)}</DialogDescription>
        </DialogHeader>

        <div className="ledger text-sm">
          <Row k="Borrowed" v={money(loan.principal, { decimals: true })} />
          <Row k={`Interest (${loan.ratePercent}% flat)`} v={money(totalDue(loan.principal, loan.ratePercent) - loan.principal, { decimals: true })} />
          <Row k="Repaid" v={money(repaid(loan), { decimals: true })} />
          <Row k="Still owed" v={money(left, { decimals: true })} late={late} />
          {loan.dueDate && <Row k="Due by" v={formatDate(loan.dueDate)} />}
        </div>

        {loan.status === 'requested' && signatures && (
          <div className="space-y-2">
            <StatusChip tone={signatures.complete ? 'paid' : 'due'} label={signatures.blocked ? 'Needs another admin' : `${signatures.have} of ${signatures.required} signatures`} />
            {signatures.blocked && (
              <p className="text-xs text-muted-foreground">The only admin can’t approve their own loan. Promote another member to admin first.</p>
            )}
            {isAdmin && (
              <div className="flex gap-2">
                {canApproveLoan(loan, { email: userEmail, isAdmin }) && (
                  <Button className="flex-1" disabled={busy !== null} onClick={() => act('approve', () => onApprove(loan.id))}>
                    {busy === 'approve' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Approve
                  </Button>
                )}
                <Button variant="outline" className="flex-1" disabled={busy !== null} onClick={() => act('decline', () => onDecline(loan.id))}>Decline</Button>
              </div>
            )}
          </div>
        )}

        {loan.repayments.length > 0 && (
          <div>
            <span className="t-label">Repayments</span>
            <div className="ledger mt-1">
              {loan.repayments.map((r) => (
                <div key={r.id} className="ledger-row">
                  <div><div className="ledger-row__who">{formatDate(r.paidOn)}</div><div className="ledger-row__meta">{r.method ?? '—'}</div></div>
                  <span className="ledger-row__leader" />
                  <span className="ledger-row__value">{money(r.amount, { decimals: true })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isAdmin && loan.status === 'active' && (
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); act('repay', () => onRepay(loan.id, Number(amount), method)); }}>
            <Label htmlFor="repay-amount">Record a repayment</Label>
            <div className="flex gap-2">
              <Input id="repay-amount" type="number" inputMode="decimal" min="0.01" step="any" max={left} value={amount}
                onChange={(e) => setAmount(e.target.value)} placeholder={instalment(loan.principal, loan.ratePercent, loan.termMonths).toFixed(2)} className="flex-1" />
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="w-28" aria-label="Method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="eft">EFT</SelectItem>
                  <SelectItem value="mobile money">Mobile money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={busy !== null || !(Number(amount) > 0)}>
              {busy === 'repay' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Record repayment
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v, late = false }: { k: string; v: string; late?: boolean }) {
  return (
    <div className="ledger-row">
      <span>{k}</span>
      <span className="ledger-row__leader" />
      <span className={`ledger-row__value${late ? ' ledger-row__value--late' : ''}`}>{v}</span>
    </div>
  );
}
