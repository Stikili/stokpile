import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import type { Vote } from '@/domain/types';
import { OUTCOME_LABEL, quorumRequired, tallyLine, DEFAULT_QUORUM_PERCENT } from '@/domain/meetings';
import { Button } from '@/presentation/ui/button';
import { Input } from '@/presentation/ui/input';
import { Label } from '@/presentation/ui/label';
import { Checkbox } from '@/presentation/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/presentation/ui/dialog';
import { StatusChip, type ChipTone } from '@/presentation/shared/StatusChip';
import { api } from '@/infrastructure/api';
import { formatDate } from '@/lib/export';

interface VotingViewProps {
  groupId: string;
  meetingId?: string;
  isAdmin: boolean;
  userEmail: string;
  /** Members marked present at this meeting (live quorum while a vote is open). */
  presentCount?: number;
  /** Current members of the group. */
  eligibleCount?: number;
  quorumPercent?: number;
}

const OUTCOME_TONE: Record<NonNullable<Vote['outcome']>, ChipTone> = {
  passed: 'paid',
  rejected: 'bad',
  no_quorum: 'due',
};

export function VotingView({
  groupId, meetingId, isAdmin, userEmail, presentCount = 0, eligibleCount = 0, quorumPercent = DEFAULT_QUORUM_PERCENT,
}: VotingViewProps) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [isResolution, setIsResolution] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState<Vote | null>(null);
  const [nextStep, setNextStep] = useState('');
  const [nextStepOwner, setNextStepOwner] = useState('');
  const [nextStepDue, setNextStepDue] = useState('');

  const quorum = quorumRequired(eligibleCount, quorumPercent);

  const loadVotes = async () => {
    try {
      setLoading(true);
      const data = await api.getVotes(groupId, meetingId);
      setVotes(data.votes || []);
    } catch {
      toast.error('Failed to load votes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, meetingId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createVote({ groupId, question, meetingId, kind: isResolution ? 'resolution' : 'poll' });
      toast.success(isResolution ? 'Resolution tabled' : 'Vote created');
      setCreateOpen(false);
      setQuestion('');
      loadVotes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create vote');
    } finally {
      setSubmitting(false);
    }
  };

  const cast = async (vote: Vote, answer: 'yes' | 'no') => {
    try {
      await api.castVote(vote.id, answer);
      toast.success(`Voted ${answer === 'yes' ? 'for' : 'against'}`);
      loadVotes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cast vote');
    }
  };

  const close = async () => {
    if (!closing) return;
    setSubmitting(true);
    try {
      const { vote } = await api.closeVote(closing.id, {
        nextStep: nextStep.trim() || undefined,
        nextStepOwner: nextStepOwner.trim() || undefined,
        nextStepDue: nextStepDue || undefined,
      });
      toast.success(vote?.kind === 'resolution' && vote.outcome ? `Closed: ${OUTCOME_LABEL[vote.outcome]}` : 'Vote closed');
      setClosing(null);
      setNextStep('');
      setNextStepOwner('');
      setNextStepDue('');
      loadVotes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to close vote');
    } finally {
      setSubmitting(false);
    }
  };

  const myVote = (v: Vote) => (v.yesVotes.includes(userEmail) ? 'yes' : v.noVotes.includes(userEmail) ? 'no' : null);

  return (
    <section className="card space-y-3" aria-label="Votes and resolutions">
      <div className="flex items-center justify-between gap-3">
        <h2 className="t-heading">Votes & resolutions</h2>
        {isAdmin && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />New vote
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Loading votes…</p>
      ) : votes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {isAdmin ? 'No votes yet. Table a resolution for the group to decide.' : 'No votes yet.'}
        </p>
      ) : (
        votes.map((vote) => {
          const open = vote.active !== false;
          const resolution = vote.kind === 'resolution';
          const mine = myVote(vote);

          if (!open && vote.tally) {
            // Closed: the minute, frozen as it was decided.
            return (
              <div key={vote.id} className="card card--quiet">
                <div className="flex items-start justify-between gap-2">
                  <span className="t-label">
                    {resolution ? 'Resolution' : 'Poll'} · closed {vote.closedAt ? formatDate(vote.closedAt) : ''}
                  </span>
                  {resolution && vote.outcome && <StatusChip tone={OUTCOME_TONE[vote.outcome]} label={OUTCOME_LABEL[vote.outcome]} />}
                </div>
                <div className="font-semibold mt-1">{vote.question}</div>
                <div className="t-figure text-xs text-muted-foreground mt-2">
                  {tallyLine(vote.tally)} · {vote.tally.present} present
                </div>
                {vote.outcome === 'passed' && vote.nextStep && (
                  <p className="text-sm mt-2">
                    <span className="font-semibold">Next: </span>{vote.nextStep}
                    {vote.nextStepOwner ? ` (${vote.nextStepOwner}` : ''}
                    {vote.nextStepOwner && vote.nextStepDue ? `, by ${formatDate(vote.nextStepDue)})` : vote.nextStepOwner ? ')' : ''}
                    {!vote.nextStepOwner && vote.nextStepDue ? ` By ${formatDate(vote.nextStepDue)}.` : ''}
                  </p>
                )}
                {vote.outcome === 'no_quorum' && (
                  <p className="text-sm mt-2 text-muted-foreground">Not enough members were present, so nothing was decided. Table it again at the next meeting.</p>
                )}
              </div>
            );
          }

          return (
            <div key={vote.id} className="card space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="t-label">{resolution ? 'Resolution · open' : 'Poll · open'}</span>
                {resolution && meetingId && (
                  <StatusChip tone={presentCount >= quorum ? 'paid' : 'due'} label={`${presentCount} present · quorum ${quorum}`} />
                )}
              </div>
              <div className="font-semibold">{vote.question}</div>
              <p className="text-xs text-muted-foreground">
                {vote.yesVotes.length} for · {vote.noVotes.length} against
                {mine ? ` · you voted ${mine === 'yes' ? 'for' : 'against'}` : ''}
              </p>
              <div className="flex gap-2">
                <Button variant={mine === 'yes' ? 'default' : 'outline'} className="flex-1" onClick={() => cast(vote, 'yes')}>
                  <ThumbsUp className="h-4 w-4 mr-2" />For
                </Button>
                <Button variant={mine === 'no' ? 'default' : 'outline'} className="flex-1" onClick={() => cast(vote, 'no')}>
                  <ThumbsDown className="h-4 w-4 mr-2" />Against
                </Button>
              </div>
              {isAdmin && (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setClosing(vote)}>Close vote</Button>
              )}
            </div>
          );
        })
      )}

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New vote</DialogTitle>
            <DialogDescription>Members vote for or against. You close it when the discussion is done.</DialogDescription>
          </DialogHeader>
          <form onSubmit={create} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vote-question">Question</Label>
              <Input id="vote-question" value={question} onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Increase the monthly contribution to R1 500" required disabled={submitting} />
            </div>
            <label className="flex items-start gap-2.5 text-sm cursor-pointer">
              <Checkbox checked={isResolution} onCheckedChange={(v) => setIsResolution(v === true)} className="mt-0.5" />
              <span>
                <span className="font-semibold block">Formal resolution</span>
                <span className="text-muted-foreground">Binds the group. Needs a quorum of {quorumPercent}% of members present, and records what happens next.</span>
              </span>
            </label>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Creating…' : isResolution ? 'Table resolution' : 'Create poll'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Close */}
      <Dialog open={!!closing} onOpenChange={(o) => !o && setClosing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close this vote?</DialogTitle>
            <DialogDescription>
              The tally{closing?.kind === 'resolution' ? ', attendance and quorum' : ''} are recorded as they stand now and can’t change afterwards.
            </DialogDescription>
          </DialogHeader>
          {closing?.kind === 'resolution' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">If it passes, what happens next? (Optional, but it’s what the minute is for.)</p>
              <div className="space-y-2">
                <Label htmlFor="next-step">Next step</Label>
                <Input id="next-step" value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="e.g. Treasurer moves R40 000 into the unit trust" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="next-owner">Who</Label>
                  <Input id="next-owner" value={nextStepOwner} onChange={(e) => setNextStepOwner(e.target.value)} placeholder="e.g. Lindiwe (treasurer)" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="next-due">By when</Label>
                  <Input id="next-due" type="date" value={nextStepDue} onChange={(e) => setNextStepDue(e.target.value)} />
                </div>
              </div>
            </div>
          )}
          <Button onClick={close} disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Close vote
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
