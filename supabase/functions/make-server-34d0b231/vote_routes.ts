// Vote routes: polls and formal resolutions, cast, and close with quorum.
// Rules live in meeting_rules.ts (mirrors src/domain/meetings.ts).

import { resolveOutcome, DEFAULT_QUORUM_PERCENT } from './meeting_rules.ts';

const PREFIX = '/make-server-34d0b231';
const ACTIVE = ['approved', 'managed'];

export function registerVoteRoutes(
  app: any,
  supabaseAdmin: any,
  getAuthUser: (c: any) => Promise<any>,
  getMembership: (groupId: string, email: string) => Promise<any>,
) {
  function toVote(row: any) {
    const yesVotes: string[] = [];
    const noVotes: string[] = [];
    for (const r of row.vote_responses ?? []) {
      if (r.response === 'yes') yesVotes.push(r.user_email);
      else noVotes.push(r.user_email);
    }
    return {
      id: row.id,
      groupId: row.group_id,
      meetingId: row.meeting_id ?? null,
      question: row.question,
      kind: row.kind ?? 'poll',
      active: row.active ?? true,
      yesVotes,
      noVotes,
      outcome: row.outcome ?? null,
      closedAt: row.closed_at ?? null,
      closedBy: row.closed_by ?? null,
      tally: row.closed_at
        ? {
            yes: row.yes_count ?? 0,
            no: row.no_count ?? 0,
            present: row.present_count ?? 0,
            eligible: row.eligible_count ?? 0,
            quorum: row.quorum_required ?? 0,
          }
        : null,
      nextStep: row.next_step ?? null,
      nextStepOwner: row.next_step_owner ?? null,
      nextStepDue: row.next_step_due ?? null,
      createdBy: row.created_by,
      createdAt: row.created_at,
    };
  }

  async function loadVote(id: string) {
    const { data } = await supabaseAdmin.from('votes').select('*, vote_responses(*)').eq('id', id).maybeSingle();
    return data;
  }

  async function audit(groupId: string, email: string, action: string, details: Record<string, unknown>) {
    try {
      await supabaseAdmin.from('audit_log').insert({
        group_id: groupId, user_email: email, action, details, timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      console.warn('Audit log failed:', e.message);
    }
  }

  app.post(`${PREFIX}/votes`, async (c: any) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const { groupId, question, meetingId, kind } = await c.req.json();
      const me = await getMembership(groupId, user.email!);
      if (!me || me.role !== 'admin') return c.json({ error: 'Not authorized – admin only' }, 403);
      if (!question?.trim()) return c.json({ error: 'A question is required' }, 400);

      const { data: vote, error } = await supabaseAdmin
        .from('votes')
        .insert({
          group_id: groupId,
          meeting_id: meetingId ?? null,
          question: question.trim(),
          kind: kind === 'resolution' ? 'resolution' : 'poll',
          active: true,
          created_by: user.email,
        })
        .select('*, vote_responses(*)')
        .single();
      if (error) return c.json({ error: error.message }, 500);

      return c.json({ success: true, vote: toVote(vote) });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  app.get(`${PREFIX}/votes`, async (c: any) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const groupId = c.req.query('groupId');
      const meetingId = c.req.query('meetingId');
      const me = await getMembership(groupId!, user.email!);
      if (!me || !ACTIVE.includes(me.status)) return c.json({ error: 'Not a member of this group' }, 403);

      let q = supabaseAdmin.from('votes').select('*, vote_responses(*)').eq('group_id', groupId!);
      if (meetingId) q = q.eq('meeting_id', meetingId);
      const { data } = await q.order('created_at', { ascending: false });
      return c.json({ votes: (data ?? []).map(toVote) });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  app.post(`${PREFIX}/votes/:id/cast`, async (c: any) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const vote = await loadVote(c.req.param('id'));
      if (!vote) return c.json({ error: 'Vote not found' }, 404);
      if (vote.active === false) return c.json({ error: 'This vote has closed' }, 400);

      const { answer } = await c.req.json();
      if (answer !== 'yes' && answer !== 'no') return c.json({ error: 'Answer must be yes or no' }, 400);
      const me = await getMembership(vote.group_id, user.email!);
      if (!me || me.status !== 'approved') return c.json({ error: 'Not a member of this group' }, 403);

      await supabaseAdmin.from('vote_responses').upsert({
        vote_id: vote.id,
        user_email: user.email,
        response: answer,
        created_at: new Date().toISOString(),
      }, { onConflict: 'vote_id,user_email' });

      return c.json({ success: true, vote: toVote(await loadVote(vote.id)) });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // Close: freeze the tally, attendance and quorum, and record the outcome.
  app.post(`${PREFIX}/votes/:id/close`, async (c: any) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const vote = await loadVote(c.req.param('id'));
      if (!vote) return c.json({ error: 'Vote not found' }, 404);
      if (vote.active === false) return c.json({ error: 'This vote is already closed' }, 400);
      const me = await getMembership(vote.group_id, user.email!);
      if (!me || me.role !== 'admin') return c.json({ error: 'Only admins can close a vote' }, 403);

      const { nextStep, nextStepOwner, nextStepDue } = await c.req.json().catch(() => ({}));

      const responses = vote.vote_responses ?? [];
      const yes = responses.filter((r: any) => r.response === 'yes').length;
      const no = responses.length - yes;

      const { count: eligible } = await supabaseAdmin
        .from('group_memberships')
        .select('user_email', { count: 'exact', head: true })
        .eq('group_id', vote.group_id)
        .in('status', ACTIVE);

      let present = responses.length;
      if (vote.meeting_id) {
        const { count } = await supabaseAdmin
          .from('meeting_attendance')
          .select('user_email', { count: 'exact', head: true })
          .eq('meeting_id', vote.meeting_id)
          .eq('attended', true);
        present = Math.max(count ?? 0, responses.length);
      }

      const { data: group } = await supabaseAdmin.from('groups').select('quorum_percent').eq('id', vote.group_id).maybeSingle();
      const result = resolveOutcome({
        yes, no, present, eligible: eligible ?? 0, quorumPercent: group?.quorum_percent ?? DEFAULT_QUORUM_PERCENT,
      });

      const passed = result.outcome === 'passed';
      const { error } = await supabaseAdmin.from('votes').update({
        active: false,
        closed_at: new Date().toISOString(),
        closed_by: user.email,
        yes_count: yes,
        no_count: no,
        present_count: present,
        eligible_count: eligible ?? 0,
        quorum_required: result.quorum,
        outcome: vote.kind === 'resolution' ? result.outcome : null,
        next_step: passed && nextStep ? String(nextStep).slice(0, 500) : null,
        next_step_owner: passed && nextStepOwner ? String(nextStepOwner).slice(0, 200) : null,
        next_step_due: passed && nextStepDue ? nextStepDue : null,
      }).eq('id', vote.id);
      if (error) return c.json({ error: error.message }, 500);

      await audit(vote.group_id, user.email, 'vote_closed', {
        voteId: vote.id, kind: vote.kind, outcome: result.outcome, yes, no, present, quorum: result.quorum,
      });
      return c.json({ success: true, vote: toVote(await loadVote(vote.id)) });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });
}
