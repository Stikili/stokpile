import { useEffect, useMemo, useState } from 'react';
import type { Contribution, Payout, Meeting, Member, OverdueMember, RotationOrder } from '@/domain/types';
import { hasRotation } from '@/domain/types';
import { Button } from '@/presentation/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/presentation/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/presentation/ui/collapsible';
import { AlertTriangle, RefreshCw, MoreHorizontal, Share2, SlidersHorizontal, Rocket, Landmark, ChevronDown } from 'lucide-react';
import { CycleRail } from '@/presentation/brand/CycleRail';
import { StatusChip, type ChipTone } from '@/presentation/shared/StatusChip';
import { GroupHealthScore } from '@/presentation/components/dashboard/GroupHealthScore';
import { LeaderboardCard } from '@/presentation/components/dashboard/LeaderboardCard';
import { AnnualProgressCard } from '@/presentation/components/dashboard/AnnualProgressCard';
import { EditTotalContributionsDialog } from '@/presentation/components/groups/EditTotalContributionsDialog';
import { SharePayoutImage } from '@/presentation/components/reports/SharePayoutImage';
import { AiDrawer } from '@/presentation/components/ai/AiDrawer';
import { api } from '@/infrastructure/api';
import { money } from '@/lib/money';
import { formatDate } from '@/lib/export';

interface DashboardProps {
  groupId: string;
  groupName?: string;
  groupType?: string;
  /** Per-member contribution expected each period, if the group set one. */
  contributionTarget?: number | null;
  annualTarget?: number | null;
  isAdmin?: boolean;
  userEmail?: string;
  /** Jump to another tab, e.g. 'contributions'. */
  onNavigate?: (tab: string) => void;
}

type RowState = 'paid' | 'late' | 'due';

interface RoundRow {
  email: string;
  name: string;
  state: RowState;
  paid: number;
  paidOn?: string;
}

const LEDGER_PREVIEW = 6;

const fullName = (first?: string, last?: string, fallback = '') =>
  `${first ?? ''} ${last ?? ''}`.trim() || fallback;

export function Dashboard({
  groupId, groupName, groupType, contributionTarget, annualTarget,
  isAdmin = false, userEmail, onNavigate,
}: DashboardProps) {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [overdue, setOverdue] = useState<OverdueMember[]>([]);
  const [adjustment, setAdjustment] = useState(0);
  const [rotation, setRotation] = useState<RotationOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [dialog, setDialog] = useState<null | 'share' | 'adjust' | 'growth' | 'bank'>(null);

  const rotating = hasRotation(groupType);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [c, p, adj, m, mem, od, rot] = await Promise.all([
        api.getContributions(groupId),
        api.getPayouts(groupId),
        api.getContributionAdjustment(groupId).catch(() => ({ adjustment: 0 })),
        api.getMeetings(groupId).catch(() => ({ meetings: [] })),
        api.getMembers(groupId).catch(() => ({ members: [] })),
        isAdmin ? api.getOverdueMembers(groupId).catch(() => ({ members: [], target: 0 })) : Promise.resolve({ members: [], target: 0 }),
        rotating ? api.getRotationOrder(groupId).catch(() => ({ rotation: null })) : Promise.resolve({ rotation: null }),
      ]);
      setContributions(c.contributions || []);
      setPayouts(p.payouts || []);
      setAdjustment(adj.adjustment || 0);
      setMeetings(m.meetings || []);
      setMembers(mem.members || []);
      setOverdue(od.members || []);
      setRotation(rot.rotation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, groupType, isAdmin]);

  const view = useMemo(() => {
    const now = new Date();
    const inThisPeriod = (iso: string) => {
      const d = new Date(iso);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };
    const periodLabel = now.toLocaleDateString(undefined, { month: 'long' });

    // ── Totals ──
    const totalIn = contributions.filter((c) => c.paid).reduce((s, c) => s + c.amount, 0) + adjustment;
    const totalOut = payouts.filter((p) => p.status === 'completed').reduce((s, p) => s + p.amount, 0);

    // ── This round / month, per member ──
    const lateEmails = new Set(overdue.map((o) => o.email));
    const paidBy = new Map<string, { amount: number; on: string }>();
    for (const c of contributions) {
      if (!c.paid || !inThisPeriod(c.date)) continue;
      const prev = paidBy.get(c.userEmail);
      paidBy.set(c.userEmail, { amount: (prev?.amount ?? 0) + c.amount, on: c.date });
    }
    const target = contributionTarget && contributionTarget > 0 ? contributionTarget : 0;
    const rank: Record<RowState, number> = { late: 0, due: 1, paid: 2 };
    const rows: RoundRow[] = members
      .filter((m) => m.status === 'approved')
      .map((m) => {
        const p = paidBy.get(m.email);
        const paid = p?.amount ?? 0;
        const met = target ? paid >= target : paid > 0;
        const state: RowState = met ? 'paid' : lateEmails.has(m.email) ? 'late' : 'due';
        return { email: m.email, name: fullName(m.fullName, m.surname, m.email), state, paid, paidOn: p?.on };
      })
      .sort((a, b) => rank[a.state] - rank[b.state] || a.name.localeCompare(b.name));

    const collected = [...paidBy.values()].reduce((s, p) => s + p.amount, 0);
    const expected = target * rows.length;
    const paidCount = rows.filter((r) => r.state === 'paid').length;
    const lateCount = rows.filter((r) => r.state === 'late').length;
    const outstanding = rows.length - paidCount;

    // ── Rotation ──
    const slots = rotation?.slots ?? [];
    const round = slots.length ? Math.min(rotation!.currentPosition + 1, slots.length) : 0;
    const current = slots[rotation?.currentPosition ?? -1];
    const next = slots.length > 1 ? slots[((rotation?.currentPosition ?? 0) + 1) % slots.length] : undefined;

    // ── Coming up ──
    const nextMeeting = meetings
      .filter((m) => new Date(`${m.date}T${m.time || '00:00'}`) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    const nextPayout = payouts
      .filter((p) => p.status === 'scheduled')
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0];

    // ── Me ──
    const mine = contributions.filter((c) => c.userEmail === userEmail);
    const myRow = rows.find((r) => r.email === userEmail);
    const me = {
      paidIn: mine.filter((c) => c.paid).reduce((s, c) => s + c.amount, 0),
      owing: mine.filter((c) => !c.paid).reduce((s, c) => s + c.amount, 0),
      received: payouts.filter((p) => p.recipientEmail === userEmail && p.status === 'completed').reduce((s, p) => s + p.amount, 0),
      paidThisPeriod: myRow?.state === 'paid',
      isMember: !!myRow,
    };

    return {
      periodLabel, totalIn, totalOut, balance: totalIn - totalOut,
      rows, collected, expected, paidCount, lateCount, outstanding,
      round, roundsTotal: slots.length, cycle: rotation?.currentCycle ?? 1, current, next,
      nextMeeting, nextPayout, me,
    };
  }, [contributions, payouts, meetings, members, overdue, adjustment, rotation, contributionTarget, userEmail]);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <div>
          <p className="font-medium">Couldn’t load your group</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try again
        </Button>
      </div>
    );
  }

  const v = view;
  const hasRound = rotating && v.roundsTotal > 0;
  const status: { tone: ChipTone; label: string } =
    v.rows.length === 0 ? { tone: 'due', label: 'No members yet' }
    : v.outstanding === 0 ? { tone: 'paid', label: 'All paid' }
    : v.lateCount > 0 ? { tone: 'late', label: `${v.lateCount} late` }
    : { tone: 'due', label: `${v.outstanding} to pay` };
  const total = Math.max(v.rows.length, 1);
  const paidPct = (v.paidCount / total) * 100;
  const latePct = (v.lateCount / total) * 100;
  const visibleRows = showAll ? v.rows : v.rows.slice(0, LEDGER_PREVIEW);

  const primary = isAdmin
    ? { label: 'Record a payment', tab: 'contributions' }
    : v.me.isMember && !v.me.paidThisPeriod
      ? { label: 'Pay my contribution', tab: 'contributions' }
      : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
      <div className="space-y-4 min-w-0">
      {/* ─── Hero: the round, before any number ─── */}
      <section className="card space-y-4" aria-label="This round">
        <div className="flex items-center justify-between gap-3">
          <span className="t-label">
            {hasRound ? `Round ${v.round} of ${v.roundsTotal} · ${v.periodLabel}` : `${v.periodLabel} · ${groupName ?? 'Your group'}`}
          </span>
          <div className="flex items-center gap-1">
            <StatusChip tone={status.tone} label={status.label} />
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Group tools">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setDialog('share')}><Share2 className="h-4 w-4 mr-2" />Share summary image</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setDialog('adjust')}><SlidersHorizontal className="h-4 w-4 mr-2" />Adjust total contributions</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setDialog('growth')}><Rocket className="h-4 w-4 mr-2" />Growth audit with Pilo</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setDialog('bank')}><Landmark className="h-4 w-4 mr-2" />Bank account advisor</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {hasRound && <CycleRail members={v.roundsTotal} round={v.round} />}

        <div>
          <span className="t-label">{hasRound ? 'Collected this round' : 'Group funds'}</span>
          <div className="mt-1 flex items-baseline gap-2 flex-wrap">
            <span className="t-figure text-[length:var(--t-display-size)] leading-none">
              {money(hasRound ? v.collected : v.balance)}
            </span>
            {hasRound && v.expected > 0 && (
              <span className="t-figure text-sm text-muted-foreground">/ {money(v.expected)}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {!hasRound && <>Collected in {v.periodLabel}: {money(v.collected)} · </>}
            {v.paidCount} of {v.rows.length} paid
          </p>
        </div>

        {v.rows.length > 0 && (
          <div className="meter" aria-hidden="true">
            <i className="meter__fill" style={{ width: `${paidPct}%` }} />
            {latePct > 0 && <i className="meter__fill meter__fill--late" style={{ width: `${latePct}%` }} />}
          </div>
        )}

        {primary ? (
          <Button className="w-full h-11" onClick={() => onNavigate?.(primary.tab)}>{primary.label}</Button>
        ) : v.me.paidThisPeriod ? (
          <p className="text-sm text-muted-foreground">You’re paid up for {v.periodLabel}. Thank you.</p>
        ) : null}
      </section>

      {/* ─── Annual goal (grocery, goal groups) ─── */}
      {annualTarget && annualTarget > 0 && (
        <AnnualProgressCard annualTarget={annualTarget} contributions={contributions} userEmail={userEmail} />
      )}

      {/* ─── Who has paid ─── */}
      {v.rows.length > 0 && (
        <section className="card" aria-label="Who has paid">
          <div className="flex items-center justify-between mb-1">
            <h2 className="t-heading">{hasRound ? 'This round' : v.periodLabel}</h2>
            <span className="t-label">{v.paidCount}/{v.rows.length} paid</span>
          </div>
          <div className="ledger">
            {visibleRows.map((r) => (
              <div key={r.email} className="ledger-row">
                <div className="min-w-0">
                  <div className="ledger-row__who truncate">{r.name}</div>
                  <div className={`ledger-row__meta${r.state === 'late' ? ' ledger-row__meta--late' : ''}`}>
                    {r.state === 'paid' && r.paidOn ? `Paid ${formatDate(r.paidOn)}`
                      : r.state === 'late' ? 'Late'
                      : r.paid > 0 ? `Part paid · ${money(r.paid)}`
                      : 'Not yet'}
                  </div>
                </div>
                <div className="ledger-row__leader" />
                {r.state === 'paid'
                  ? <span className="ledger-row__value">{money(r.paid)}</span>
                  : <StatusChip tone={r.state} label={r.state === 'late' ? 'Late' : 'Due'} />}
              </div>
            ))}
          </div>
          {v.rows.length > LEDGER_PREVIEW && (
            <Button variant="ghost" size="sm" className="w-full mt-2 h-8 text-xs" onClick={() => setShowAll((s) => !s)}>
              {showAll ? 'Show less' : `Show all ${v.rows.length}`}
            </Button>
          )}
        </section>
      )}

      </div>

      <div className="space-y-4 min-w-0">
      {/* ─── Coming up ─── */}
      {(v.current || v.nextPayout || v.nextMeeting) && (
        <section className="card" aria-label="Coming up">
          <h2 className="t-heading mb-1">Coming up</h2>
          <div className="ledger">
            {hasRound && v.current && (
              <div className="ledger-row">
                <div className="min-w-0">
                  <div className="ledger-row__who truncate">{fullName(v.current.fullName, v.current.surname, v.current.email)}</div>
                  <div className="ledger-row__meta">Their turn · cycle {v.cycle}</div>
                </div>
                <div className="ledger-row__leader" />
                {v.next && v.next.email !== v.current.email
                  ? <span className="ledger-row__meta">then {fullName(v.next.fullName, v.next.surname, v.next.email)}</span>
                  : <StatusChip tone="payout" label="Payout" />}
              </div>
            )}
            {v.nextPayout && (
              <div className="ledger-row">
                <div className="min-w-0">
                  <div className="ledger-row__who truncate">
                    Payout to {v.nextPayout.recipient && v.nextPayout.recipient.fullName !== 'Unknown'
                      ? fullName(v.nextPayout.recipient.fullName, v.nextPayout.recipient.surname)
                      : v.nextPayout.recipientEmail}
                  </div>
                  <div className="ledger-row__meta">{formatDate(v.nextPayout.scheduledDate)}</div>
                </div>
                <div className="ledger-row__leader" />
                <span className="ledger-row__value ledger-row__value--out">{money(-v.nextPayout.amount)}</span>
              </div>
            )}
            {v.nextMeeting && (
              <div className="ledger-row">
                <div className="min-w-0">
                  <div className="ledger-row__who truncate">Meeting{v.nextMeeting.venue ? ` · ${v.nextMeeting.venue}` : ''}</div>
                  <div className="ledger-row__meta">{formatDate(v.nextMeeting.date)}{v.nextMeeting.time ? `, ${v.nextMeeting.time}` : ''}</div>
                </div>
                <div className="ledger-row__leader" />
                <button type="button" className="ledger-row__meta underline underline-offset-2" onClick={() => onNavigate?.('meetings')}>
                  Details
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── Me ─── */}
      {v.me.isMember && (
        <section className="card card--quiet" aria-label="My summary">
          <span className="t-label">My summary</span>
          <div className="grid grid-cols-3 gap-3 mt-2">
            <Figure label="Paid in" value={money(v.me.paidIn)} />
            <Figure label="Owing" value={money(v.me.owing)} late={v.me.owing > 0} />
            <Figure label="Received" value={money(v.me.received)} />
          </div>
        </section>
      )}

      {/* ─── Insights, out of the way until asked for ─── */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-10 text-sm text-muted-foreground group">
            Group insights
            <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          <GroupHealthScore groupId={groupId} />
          <LeaderboardCard groupId={groupId} />
        </CollapsibleContent>
      </Collapsible>

      </div>

      {/* ─── Admin tool surfaces (opened from the ⋯ menu) ─── */}
      {isAdmin && (
        <>
          <SharePayoutImage
            open={dialog === 'share'}
            onOpenChange={(o) => !o && setDialog(null)}
            data={{
              groupName: groupName ?? 'Our group',
              period: String(new Date().getFullYear()),
              totalContributedZar: v.totalIn,
              totalPaidOutZar: v.totalOut,
              memberCount: members.length,
              headline: 'A strong year, together.',
            }}
          />
          <EditTotalContributionsDialog
            groupId={groupId}
            currentTotal={v.totalIn}
            calculatedTotal={v.totalIn - adjustment}
            currentAdjustment={adjustment}
            onSuccess={load}
            open={dialog === 'adjust'}
            onOpenChange={(o) => !o && setDialog(null)}
          />
          <AiDrawer
            open={dialog === 'growth'}
            onOpenChange={(o) => !o && setDialog(null)}
            title="Growth audit"
            description="Pilo runs a diagnostic, applies the SA stokvel growth playbook, and recommends 3 high-leverage moves."
            task="growth_advisor"
            groupId={groupId}
            autoSubmit
          />
          <AiDrawer
            open={dialog === 'bank'}
            onOpenChange={(o) => !o && setDialog(null)}
            title="Bank account advisor"
            description="Compare SA bank accounts for your group. Pilo uses a curated knowledge base + live web search for current rates."
            task="ask_group"
            groupId={groupId}
            contextStatic={{ groupType }}
            fields={[
              { key: 'question', label: 'What do you want to know?', type: 'textarea', required: true,
                initial: 'Compare bank accounts suitable for my group. Show me their structural facts (fees, signatories, fit) and search the web for current interest rates. Recommend the best 2 options for our group size and type.' },
            ]}
          />
        </>
      )}
    </div>
  );
}

function Figure({ label, value, late = false }: { label: string; value: string; late?: boolean }) {
  return (
    <div className="min-w-0">
      <div className={`t-figure text-base truncate ${late ? 'text-warning' : ''}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="card space-y-4">
        <div className="h-3 w-40 bg-muted animate-pulse rounded" />
        <div className="h-3 w-full bg-muted animate-pulse rounded" />
        <div className="h-10 w-48 bg-muted animate-pulse rounded" />
        <div className="h-11 w-full bg-muted animate-pulse rounded" />
      </div>
      <div className="card space-y-3">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-8 w-full bg-muted animate-pulse rounded" />)}
      </div>
    </div>
  );
}
