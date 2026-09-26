// Loan book routes (chama table banking / VSLA). The group lends to its own
// members at a rate it sets; two signatories release; repayments are
// recorded by admins. Rules in loan_rules.ts (mirrors src/domain/loans.ts).

import { loanSignatures, outstanding } from './loan_rules.ts';

const PREFIX = '/make-server-34d0b231';
const ACTIVE = ['approved', 'managed'];
const LENDING_TYPES = ['chama', 'vsla'];

export function registerLoanRoutes(
  app: any,
  supabaseAdmin: any,
  getAuthUser: (c: any) => Promise<any>,
  getMembership: (groupId: string, email: string) => Promise<any>,
) {
  const SELECT = '*, loan_approvals(approver_email, approved_at), loan_repayments(id, amount, paid_on, method, recorded_by)';

  function toLoan(row: any) {
    return {
      id: row.id,
      groupId: row.group_id,
      borrowerEmail: row.borrower_email,
      principal: Number(row.principal),
      ratePercent: Number(row.rate_percent),
      termMonths: row.term_months,
      purpose: row.purpose ?? null,
      status: row.status,
      requestedBy: row.requested_by,
      createdAt: row.created_at,
      releasedAt: row.released_at ?? null,
      dueDate: row.due_date ?? null,
      closedAt: row.closed_at ?? null,
      declineReason: row.decline_reason ?? null,
      approvals: (row.loan_approvals ?? []).map((a: any) => ({ approverEmail: a.approver_email, approvedAt: a.approved_at })),
      repayments: (row.loan_repayments ?? [])
        .map((r: any) => ({ id: r.id, amount: Number(r.amount), paidOn: r.paid_on, method: r.method ?? null, recordedBy: r.recorded_by }))
        .sort((a: any, b: any) => (a.paidOn < b.paidOn ? -1 : 1)),
    };
  }

  async function loadLoan(id: string) {
    const { data } = await supabaseAdmin.from('loans').select(SELECT).eq('id', id).maybeSingle();
    return data;
  }

  async function activeAdminCount(groupId: string): Promise<number> {
    const { count } = await supabaseAdmin
      .from('group_memberships')
      .select('user_email', { count: 'exact', head: true })
      .eq('group_id', groupId).eq('role', 'admin').eq('status', 'approved');
    return count ?? 0;
  }

  async function audit(groupId: string, email: string, action: string, details: Record<string, unknown>) {
    try {
      await supabaseAdmin.from('audit_log').insert({ group_id: groupId, user_email: email, action, details, timestamp: new Date().toISOString() });
    } catch (e: any) {
      console.warn('Audit log failed:', e.message);
    }
  }

  function fail(c: any, message: string, status = 400) {
    return c.json({ error: message }, status);
  }

  // ── The book ──
  app.get(`${PREFIX}/groups/:groupId/loans`, async (c: any) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return fail(c, 'Unauthorized', 401);
      const groupId = c.req.param('groupId');
      const me = await getMembership(groupId, user.email!);
      if (!me || !ACTIVE.includes(me.status)) return fail(c, 'Not a member of this group', 403);

      const { data } = await supabaseAdmin.from('loans').select(SELECT).eq('group_id', groupId).order('created_at', { ascending: false });
      const { data: group } = await supabaseAdmin.from('groups').select('loan_rate_percent').eq('id', groupId).maybeSingle();
      return c.json({
        loans: (data ?? []).map(toLoan),
        ratePercent: group?.loan_rate_percent != null ? Number(group.loan_rate_percent) : null,
        activeAdminCount: await activeAdminCount(groupId),
      });
    } catch (err: any) {
      return fail(c, err.message, 500);
    }
  });

  // ── Request: a member for themselves, or an admin on a member's behalf ──
  app.post(`${PREFIX}/groups/:groupId/loans`, async (c: any) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return fail(c, 'Unauthorized', 401);
      const groupId = c.req.param('groupId');
      const me = await getMembership(groupId, user.email!);
      if (!me || !ACTIVE.includes(me.status)) return fail(c, 'Not a member of this group', 403);

      const { borrowerEmail, principal, termMonths, purpose } = await c.req.json();
      const borrower = borrowerEmail || user.email;
      if (borrower !== user.email && me.role !== 'admin') return fail(c, 'Only admins can record a loan for another member', 403);

      const { data: group } = await supabaseAdmin.from('groups').select('group_type, loan_rate_percent').eq('id', groupId).maybeSingle();
      if (!group || !LENDING_TYPES.includes(group.group_type)) return fail(c, 'This group type doesn’t keep a loan book');
      if (group.loan_rate_percent == null) return fail(c, 'Your group hasn’t set its loan rate yet. An admin can set it in Group settings.');

      // The group lends only to its own members.
      const b = await getMembership(groupId, borrower);
      if (!b || !ACTIVE.includes(b.status)) return fail(c, 'Loans can only go to current members of this group');

      const amount = Number(principal);
      const term = Math.round(Number(termMonths));
      if (!Number.isFinite(amount) || amount <= 0) return fail(c, 'Enter the amount to borrow');
      if (!Number.isFinite(term) || term < 1 || term > 36) return fail(c, 'Term must be between 1 and 36 months');

      const { data: loan, error } = await supabaseAdmin.from('loans').insert({
        group_id: groupId,
        borrower_email: borrower,
        principal: amount,
        rate_percent: Number(group.loan_rate_percent),
        term_months: term,
        purpose: purpose ? String(purpose).slice(0, 200) : null,
        requested_by: user.email,
      }).select('id').single();
      if (error) return fail(c, error.message, 500);

      await audit(groupId, user.email, 'loan_requested', { loanId: loan.id, borrower, principal: amount, termMonths: term });
      return c.json({ success: true, loan: toLoan(await loadLoan(loan.id)) });
    } catch (err: any) {
      return fail(c, err.message, 500);
    }
  });

  // ── Sign; the last required signature releases the loan ──
  app.post(`${PREFIX}/loans/:id/approve`, async (c: any) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return fail(c, 'Unauthorized', 401);
      const loan = await loadLoan(c.req.param('id'));
      if (!loan) return fail(c, 'Loan not found', 404);
      const me = await getMembership(loan.group_id, user.email!);
      if (!me || me.role !== 'admin' || me.status !== 'approved') return fail(c, 'Only admins can approve loans', 403);
      if (loan.status !== 'requested') return fail(c, 'Only requested loans can be approved');
      if (loan.borrower_email === user.email) return fail(c, 'You can’t approve your own loan');
      const signed = (loan.loan_approvals ?? []).map((a: any) => a.approver_email);
      if (signed.includes(user.email)) return fail(c, 'You have already signed this loan');

      await supabaseAdmin.from('loan_approvals').insert({ loan_id: loan.id, approver_email: user.email });

      const borrower = await getMembership(loan.group_id, loan.borrower_email);
      const sig = loanSignatures(signed.length + 1, await activeAdminCount(loan.group_id), borrower?.role === 'admin');
      if (sig.complete) {
        const released = new Date();
        const due = new Date(released);
        due.setMonth(due.getMonth() + loan.term_months);
        await supabaseAdmin.from('loans').update({
          status: 'active',
          released_at: released.toISOString(),
          due_date: due.toISOString().slice(0, 10),
        }).eq('id', loan.id).eq('status', 'requested');
        await audit(loan.group_id, user.email, 'loan_released', { loanId: loan.id, principal: Number(loan.principal) });
      } else {
        await audit(loan.group_id, user.email, 'loan_approved', { loanId: loan.id });
      }
      return c.json({ success: true, loan: toLoan(await loadLoan(loan.id)) });
    } catch (err: any) {
      return fail(c, err.message, 500);
    }
  });

  app.post(`${PREFIX}/loans/:id/decline`, async (c: any) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return fail(c, 'Unauthorized', 401);
      const loan = await loadLoan(c.req.param('id'));
      if (!loan) return fail(c, 'Loan not found', 404);
      const me = await getMembership(loan.group_id, user.email!);
      if (!me || me.role !== 'admin') return fail(c, 'Only admins can decline loans', 403);
      if (loan.status !== 'requested') return fail(c, 'Only requested loans can be declined');

      const { reason } = await c.req.json().catch(() => ({}));
      await supabaseAdmin.from('loans').update({
        status: 'rejected', closed_at: new Date().toISOString(), decline_reason: reason ? String(reason).slice(0, 300) : null,
      }).eq('id', loan.id);
      await audit(loan.group_id, user.email, 'loan_declined', { loanId: loan.id });
      return c.json({ success: true, loan: toLoan(await loadLoan(loan.id)) });
    } catch (err: any) {
      return fail(c, err.message, 500);
    }
  });

  // ── Repayment, recorded by an admin; paying in full closes the loan ──
  app.post(`${PREFIX}/loans/:id/repayments`, async (c: any) => {
    try {
      const user = await getAuthUser(c);
      if (!user) return fail(c, 'Unauthorized', 401);
      const loan = await loadLoan(c.req.param('id'));
      if (!loan) return fail(c, 'Loan not found', 404);
      const me = await getMembership(loan.group_id, user.email!);
      if (!me || me.role !== 'admin') return fail(c, 'Only admins can record repayments', 403);
      if (loan.status !== 'active') return fail(c, 'Repayments can only be recorded on an active loan');

      const { amount, paidOn, method } = await c.req.json();
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) return fail(c, 'Enter the amount repaid');
      const repaidSoFar = (loan.loan_repayments ?? []).map((r: any) => Number(r.amount));
      const left = outstanding(Number(loan.principal), Number(loan.rate_percent), repaidSoFar);
      if (value > left + 0.005) return fail(c, `That’s more than the ${left.toFixed(2)} still owed`);

      await supabaseAdmin.from('loan_repayments').insert({
        loan_id: loan.id,
        amount: value,
        paid_on: paidOn || new Date().toISOString().slice(0, 10),
        method: method ? String(method).slice(0, 40) : null,
        recorded_by: user.email,
      });
      const remaining = outstanding(Number(loan.principal), Number(loan.rate_percent), [...repaidSoFar, value]);
      if (remaining <= 0) {
        await supabaseAdmin.from('loans').update({ status: 'repaid', closed_at: new Date().toISOString() }).eq('id', loan.id);
      }
      await audit(loan.group_id, user.email, 'loan_repayment', { loanId: loan.id, amount: value, remaining });
      return c.json({ success: true, loan: toLoan(await loadLoan(loan.id)) });
    } catch (err: any) {
      return fail(c, err.message, 500);
    }
  });
}
