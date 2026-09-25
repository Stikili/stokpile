import { useState } from 'react';
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
import { useDashboard } from '@/application/hooks/useDashboard';
import { useContributions } from '@/application/hooks/queries';
import { displayName, type RoundSummary } from '@/domain/round';
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

const LEDGER_PREVIEW = 6;

const STATUS_CHIP: Record<RoundSummary['status'], (r: RoundSummary) => { tone: ChipTone; label: string }> = {
  empty:    () => ({ tone: 'due', label: 'No members yet' }),
  all_paid: () => ({ tone: 'paid', label: 'All paid' }),
  late:     (r) => ({ tone: 'late', label: `${r.lateCount} late` }),
  due:      (r) => ({ tone: 'due', label: `${r.outstanding} to pay` }),
};

export function Dashboard({
  groupId, groupName, groupType, contributionTarget, annualTarget,
  isAdmin = false, userEmail, onNavigate,
}: DashboardProps) {
  const d = useDashboard({ groupId, groupType, contributionTarget, isAdmin, userEmail });
  const contributions = useContributions(groupId).data?.contributions ?? [];
  const [showAll, setShowAll] = useState(false);
  const [dialog, setDialog] = useState<null | 'share' | 'adjust' | 'growth' | 'bank'>(null);

  if (d.loading) return <DashboardSkeleton />;

  if (d.error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <div>
          <p className="font-medium">Couldn’t load your group</p>
          <p className="text-sm text-muted-foreground mt-1">{d.error}</p>
        </div>
        <Button variant="outline" onClick={d.refresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try again
        </Button>
      </div>
    );
  }

  const r = d.round;
  const hasRound = d.rotating && d.position.total > 0;
  const status = STATUS_CHIP[r.status](r);
  const total = Math.max(r.rows.length, 1);
  const paidPct = (r.paidCount / total) * 100;
  const latePct = (r.lateCount / total) * 100;
  const visibleRows = showAll ? r.rows : r.rows.slice(0, LEDGER_PREVIEW);

  const primary = isAdmin
    ? { label: 'Record a payment', tab: 'contributions' }
    : d.me.isMember && !d.me.paidThisPeriod
      ? { label: 'Pay my contribution', tab: 'contributions' }
      : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
      <div className="space-y-4 min-w-0">
      {/* ─── Hero: the round, before any number ─── */}
      <section className="card space-y-4" aria-label="This round">
        <div className="flex items-center justify-between gap-3">
          <span className="t-label">
            {hasRound ? `Round ${d.position.round} of ${d.position.total} · ${d.periodLabel}` : `${d.periodLabel} · ${groupName ?? 'Your group'}`}
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

        {hasRound && <CycleRail members={d.position.total} round={d.position.round} />}

        <div>
          <span className="t-label">{hasRound ? 'Collected this round' : 'Group funds'}</span>
          <div className="mt-1 flex items-baseline gap-2 flex-wrap">
            <span className="t-figure text-[length:var(--t-display-size)] leading-none">
              {money(hasRound ? r.collected : d.totals.balance)}
            </span>
            {hasRound && r.expected > 0 && (
              <span className="t-figure text-sm text-muted-foreground">/ {money(r.expected)}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {!hasRound && <>Collected in {d.periodLabel}: {money(r.collected)} · </>}
            {r.paidCount} of {r.rows.length} paid
          </p>
        </div>

        {r.rows.length > 0 && (
          <div className="meter" aria-hidden="true">
            <i className="meter__fill" style={{ width: `${paidPct}%` }} />
            {latePct > 0 && <i className="meter__fill meter__fill--late" style={{ width: `${latePct}%` }} />}
          </div>
        )}

        {primary ? (
          <Button className="w-full h-11" onClick={() => onNavigate?.(primary.tab)}>{primary.label}</Button>
        ) : d.me.paidThisPeriod ? (
          <p className="text-sm text-muted-foreground">You’re paid up for {d.periodLabel}. Thank you.</p>
        ) : null}
      </section>

      {/* ─── Annual goal (grocery, goal groups) ─── */}
      {annualTarget && annualTarget > 0 && (
        <AnnualProgressCard annualTarget={annualTarget} contributions={contributions} userEmail={userEmail} />
      )}

      {/* ─── Who has paid ─── */}
      {r.rows.length > 0 && (
        <section className="card" aria-label="Who has paid">
          <div className="flex items-center justify-between mb-1">
            <h2 className="t-heading">{hasRound ? 'This round' : d.periodLabel}</h2>
            <span className="t-label">{r.paidCount}/{r.rows.length} paid</span>
          </div>
          <div className="ledger">
            {visibleRows.map((row) => (
              <div key={row.email} className="ledger-row">
                <div className="min-w-0">
                  <div className="ledger-row__who truncate">{row.name}</div>
                  <div className={`ledger-row__meta${row.state === 'late' ? ' ledger-row__meta--late' : ''}`}>
                    {row.state === 'paid' && row.paidOn ? `Paid ${formatDate(row.paidOn)}`
                      : row.state === 'late' ? 'Late'
                      : row.paid > 0 ? `Part paid · ${money(row.paid)}`
                      : 'Not yet'}
                  </div>
                </div>
                <div className="ledger-row__leader" />
                {row.state === 'paid'
                  ? <span className="ledger-row__value">{money(row.paid)}</span>
                  : <StatusChip tone={row.state} label={row.state === 'late' ? 'Late' : 'Due'} />}
              </div>
            ))}
          </div>
          {r.rows.length > LEDGER_PREVIEW && (
            <Button variant="ghost" size="sm" className="w-full mt-2 h-8 text-xs" onClick={() => setShowAll((s) => !s)}>
              {showAll ? 'Show less' : `Show all ${r.rows.length}`}
            </Button>
          )}
        </section>
      )}

      </div>

      <div className="space-y-4 min-w-0">
      {/* ─── Coming up ─── */}
      {(d.position.current || d.nextPayout || d.nextMeeting) && (
        <section className="card" aria-label="Coming up">
          <h2 className="t-heading mb-1">Coming up</h2>
          <div className="ledger">
            {hasRound && d.position.current && (
              <div className="ledger-row">
                <div className="min-w-0">
                  <div className="ledger-row__who truncate">{displayName(d.position.current.fullName, d.position.current.surname, d.position.current.email)}</div>
                  <div className="ledger-row__meta">Their turn · cycle {d.position.cycle}</div>
                </div>
                <div className="ledger-row__leader" />
                {d.position.next && d.position.next.email !== d.position.current.email
                  ? <span className="ledger-row__meta">then {displayName(d.position.next.fullName, d.position.next.surname, d.position.next.email)}</span>
                  : <StatusChip tone="payout" label="Payout" />}
              </div>
            )}
            {d.nextPayout && (
              <div className="ledger-row">
                <div className="min-w-0">
                  <div className="ledger-row__who truncate">
                    Payout to {d.nextPayout.recipient && d.nextPayout.recipient.fullName !== 'Unknown'
                      ? displayName(d.nextPayout.recipient.fullName, d.nextPayout.recipient.surname)
                      : d.nextPayout.recipientEmail}
                  </div>
                  <div className="ledger-row__meta">{formatDate(d.nextPayout.scheduledDate)}</div>
                </div>
                <div className="ledger-row__leader" />
                <span className="ledger-row__value ledger-row__value--out">{money(-d.nextPayout.amount)}</span>
              </div>
            )}
            {d.nextMeeting && (
              <div className="ledger-row">
                <div className="min-w-0">
                  <div className="ledger-row__who truncate">Meeting{d.nextMeeting.venue ? ` · ${d.nextMeeting.venue}` : ''}</div>
                  <div className="ledger-row__meta">{formatDate(d.nextMeeting.date)}{d.nextMeeting.time ? `, ${d.nextMeeting.time}` : ''}</div>
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
      {d.me.isMember && (
        <section className="card card--quiet" aria-label="My summary">
          <span className="t-label">My summary</span>
          <div className="grid grid-cols-3 gap-3 mt-2">
            <Figure label="Paid in" value={money(d.me.paidIn)} />
            <Figure label="Owing" value={money(d.me.owing)} late={d.me.owing > 0} />
            <Figure label="Received" value={money(d.me.received)} />
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
              totalContributedZar: d.totals.totalIn,
              totalPaidOutZar: d.totals.totalOut,
              memberCount: d.memberCount,
              headline: 'A strong year, together.',
            }}
          />
          <EditTotalContributionsDialog
            groupId={groupId}
            currentTotal={d.totals.totalIn}
            calculatedTotal={d.totals.totalIn - d.adjustment}
            currentAdjustment={d.adjustment}
            onSuccess={d.refresh}
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
