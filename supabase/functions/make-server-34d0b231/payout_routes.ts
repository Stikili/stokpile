// Payout routes: schedule, list, approve (second signatory), move through
// the lifecycle. Rules live in payout_rules.ts (mirrors src/domain/payouts.ts).

import { canTransition, requiredApprovals, type Actor, type PayoutStatus } from './payout_rules.ts';

const PREFIX = '/make-server-34d0b231';
const ACTIVE = ['approved', 'managed'];

export function registerPayoutRoutes(
  app: any,
  supabaseAdmin: any,
  getAuthUser: (c: any) => Promise<any>,
  getMembership: (groupId: string, email: string) => Promise<any>,
) {
  function toPayout(row: any) {
    return {
      id: row.id,
      groupId: row.group_id,
      recipientEmail: row.recipient_email,
      amount: Number(row.amount),
      scheduledDate: row.scheduled_date,
      status: row.status,
      referenceNumber: row.reference_number ?? null,
      paymentMethod: row.payment_method ?? null,
      confirmedByRecipient: row.confirmed_by_recipient ?? null,
      confirmedAt: row.confirmed_at ?? null,
      disputeReason: row.dispute_reason ?? null,
      createdBy: row.created_by ?? null,
      createdAt: row.created_at,
      completedAt: row.completed_at ?? null,
      updatedAt: row.updated_at ?? null,
      approvals: (row.payout_approvals ?? []).map((a: any) => ({
        approverEmail: a.approver_email,
        approvedAt: a.approved_at,
      })),
    };
  }

  async function activeAdminCount(groupId: string): Promise<number> {
    const { count } = await supabaseAdmin
      .from('group_memberships')
      .select('user_email', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('role', 'admin')
      .eq('status', 'approved');
    return count ?? 1;
  }

  async function loadPayout(id: string) {
    const { data } = await supabaseAdmin
      .from('payouts').select('*, payout_approvals(approver_email, approved_at)').eq('id', id).maybeSingle();
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

  // ── Schedule: the scheduling admin is the first signatory ──
  app.post(`${PREFIX}/payouts`, async (c: any) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const { groupId, recipientEmail, amount, scheduledDate } = await c.req.json();
      const me = await getMembership(groupId, user.email!);
      if (!me || me.role !== 'admin') return c.json({ error: 'Not authorized – admin only' }, 403);

      const { data: group } = await supabaseAdmin.from('groups').select('payouts_allowed').eq('id', groupId).single();
      if (!group?.payouts_allowed) return c.json({ error: 'Payouts not allowed for this group' }, 400);

      const recipient = await getMembership(groupId, recipientEmail);
      if (!recipient || !ACTIVE.includes(recipient.status)) {
        return c.json({ error: 'Recipient must be a current group member' }, 400);
      }

      const { data: payout, error } = await supabaseAdmin
        .from('payouts')
        .insert({
          group_id: groupId,
          recipient_email: recipientEmail,
          amount: parseFloat(amount),
          scheduled_date: scheduledDate
            ? new Date(scheduledDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          status: 'scheduled',
          created_by: user.email,
        })
        .select()
        .single();
      if (error) return c.json({ error: error.message }, 500);

      await supabaseAdmin.from('payout_approvals').insert({ payout_id: payout.id, approver_email: user.email });
      await audit(groupId, user.email, 'payout_scheduled', { payoutId: payout.id, amount: payout.amount, recipientEmail });

      return c.json({ success: true, payout: toPayout(await loadPayout(payout.id)) });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // ── List, with signatures and how many the group needs ──
  app.get(`${PREFIX}/payouts`, async (c: any) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const groupId = c.req.query('groupId');
      const me = await getMembership(groupId!, user.email!);
      if (!me || !ACTIVE.includes(me.status)) return c.json({ error: 'Not a member of this group' }, 403);

      const { data } = await supabaseAdmin
        .from('payouts')
        .select('*, payout_approvals(approver_email, approved_at), profiles!payouts_recipient_email_fkey(full_name, surname, profile_picture_url)')
        .eq('group_id', groupId!)
        .order('scheduled_date', { ascending: false });

      const payouts = (data ?? []).map((row: any) => ({
        ...toPayout(row),
        recipient: {
          email: row.recipient_email,
          fullName: row.profiles?.full_name ?? 'Unknown',
          surname: row.profiles?.surname ?? 'User',
          profilePictureUrl: row.profiles?.profile_picture_url ?? null,
        },
      }));

      return c.json({ payouts, requiredApprovals: requiredApprovals(await activeAdminCount(groupId!)) });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // ── Second signatory ──
  app.post(`${PREFIX}/payouts/:id/approve`, async (c: any) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const payout = await loadPayout(c.req.param('id'));
      if (!payout) return c.json({ error: 'Payout not found' }, 404);
      const me = await getMembership(payout.group_id, user.email!);
      if (!me || me.role !== 'admin' || me.status !== 'approved') return c.json({ error: 'Only admins can approve payouts' }, 403);
      if (payout.status !== 'scheduled') return c.json({ error: 'Only scheduled payouts can be approved' }, 400);

      const signed = (payout.payout_approvals ?? []).map((a: any) => a.approver_email);
      if (signed.includes(user.email)) return c.json({ error: 'You have already signed this payout. Another admin must approve it.' }, 400);

      const { error } = await supabaseAdmin.from('payout_approvals').insert({ payout_id: payout.id, approver_email: user.email });
      if (error) return c.json({ error: error.message }, 500);
      await audit(payout.group_id, user.email, 'payout_approved', { payoutId: payout.id, amount: payout.amount });

      return c.json({ success: true, payout: toPayout(await loadPayout(payout.id)) });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // ── Lifecycle ──
  app.put(`${PREFIX}/payouts/:id`, async (c: any) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const payout = await loadPayout(c.req.param('id'));
      if (!payout) return c.json({ error: 'Payout not found' }, 404);
      const { status, referenceNumber, disputeReason, paymentMethod } = await c.req.json();

      const me = await getMembership(payout.group_id, user.email!);
      if (!me || !ACTIVE.includes(me.status)) return c.json({ error: 'Not a member of this group' }, 403);
      const isAdmin = me.role === 'admin';
      const isRecipient = payout.recipient_email === user.email;
      let actor: Actor = isRecipient ? 'recipient' : isAdmin ? 'admin' : 'member';
      if (isAdmin && !isRecipient) {
        // A member added by name can't log in to confirm; an admin confirms for them.
        const recipient = await getMembership(payout.group_id, payout.recipient_email);
        if (recipient?.status === 'managed') actor = 'admin_for_managed_recipient';
      }
      if (isAdmin && isRecipient && status !== 'completed' && status !== 'disputed') actor = 'admin';

      const signatures = (payout.payout_approvals ?? []).length;
      const signed = signatures >= requiredApprovals(await activeAdminCount(payout.group_id));
      const from = payout.status as PayoutStatus;
      if (!canTransition(from, status, actor, signed)) {
        const reason = from === 'scheduled' && status === 'processing' && !signed
          ? 'This payout needs a second admin’s approval before it can be released.'
          : `A payout can’t move from ${from} to ${status} by you.`;
        return c.json({ error: reason }, 400);
      }

      const now = new Date().toISOString();
      const updates: Record<string, any> = { status, updated_at: now };
      if (referenceNumber) updates.reference_number = String(referenceNumber).slice(0, 120);
      if (paymentMethod) updates.payment_method = String(paymentMethod).slice(0, 40);
      if (status === 'disputed') updates.dispute_reason = disputeReason ? String(disputeReason).slice(0, 500) : null;
      if (status === 'completed') {
        updates.completed_at = now;
        updates.confirmed_by_recipient = actor === 'recipient';
        updates.confirmed_at = now;
      }

      const { error } = await supabaseAdmin.from('payouts').update(updates).eq('id', payout.id);
      if (error) return c.json({ error: error.message }, 500);
      await audit(payout.group_id, user.email, `payout_${status}`, { payoutId: payout.id, from, amount: payout.amount });

      return c.json({ success: true, payout: toPayout(await loadPayout(payout.id)) });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });
}
