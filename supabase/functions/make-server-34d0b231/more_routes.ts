// more_routes.ts — Additional routes that complement extra_routes.ts
// All routes use Postgres via supabaseAdmin (NOT KV store).

const PREFIX = '/make-server-34d0b231';

export function registerMoreRoutes(
  app: any,
  supabaseAdmin: any,
  getAuthUser: (c: any) => Promise<any>,
  getMembership: (groupId: string, email: string) => Promise<any>,
) {

  // ────────────────────────────────────────────────────────────
  // INTERNAL HELPERS
  // ────────────────────────────────────────────────────────────

  async function requireUser(c: any) {
    const user = await getAuthUser(c);
    if (!user) throw { status: 401, message: 'Unauthorized' };
    return user;
  }

  async function requireAdmin(c: any, groupId: string) {
    const user = await requireUser(c);
    const m = await getMembership(groupId, user.email);
    if (!m || m.role !== 'admin') throw { status: 403, message: 'Admins only' };
    return user;
  }

  async function requireMember(c: any, groupId: string) {
    const user = await requireUser(c);
    const m = await getMembership(groupId, user.email);
    if (!m || m.status !== 'approved') throw { status: 403, message: 'Not a member of this group' };
    return { user, membership: m };
  }

  function handleError(c: any, err: any) {
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    console.log(`Route error: ${message}`);
    return c.json({ error: message }, status);
  }

  async function logAudit(groupId: string, userEmail: string, action: string, details: Record<string, unknown> = {}) {
    try {
      await supabaseAdmin.from('audit_log').insert({
        id: crypto.randomUUID(),
        group_id: groupId,
        user_email: userEmail,
        action,
        details,
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      console.warn('Audit log insert failed:', e.message);
    }
  }

  async function storeNotification(recipientEmail: string, groupId: string, title: string, message: string, type: string = 'info') {
    try {
      await supabaseAdmin.from('notifications').insert({
        id: crypto.randomUUID(),
        user_email: recipientEmail,
        group_id: groupId,
        title,
        message,
        type,
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (e: any) {
      console.warn('Notification insert failed:', e.message);
    }
  }

  // ────────────────────────────────────────────────────────────
  // GROCERY CRUD
  // ────────────────────────────────────────────────────────────

  app.get(`${PREFIX}/groups/:groupId/grocery`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      await requireMember(c, groupId);

      const { data, error } = await supabaseAdmin
        .from('grocery_items')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) return c.json({ error: error.message }, 500);

      const items = (data || []).map((r: any) => ({
        id: r.id,
        groupId: r.group_id,
        name: r.name,
        quantity: r.quantity,
        unit: r.unit,
        estimatedCost: r.estimated_cost,
        assignedTo: r.assigned_to,
        status: r.status,
        notes: r.notes,
        addedBy: r.added_by,
        createdAt: r.created_at,
      }));

      return c.json({ items });
    } catch (err: any) { return handleError(c, err); }
  });

  app.post(`${PREFIX}/groups/:groupId/grocery`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      const { user } = await requireMember(c, groupId);

      const { name, quantity, unit, estimatedCost, assignedTo, notes } = await c.req.json();
      if (!name?.trim()) return c.json({ error: 'Name is required' }, 400);

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const row = {
        id,
        group_id: groupId,
        name: name.trim(),
        quantity: quantity ?? 1,
        unit: unit || null,
        estimated_cost: estimatedCost ?? null,
        assigned_to: assignedTo || null,
        status: 'needed',
        notes: notes || null,
        added_by: user.email,
        created_at: now,
      };

      const { error } = await supabaseAdmin.from('grocery_items').insert(row);
      if (error) return c.json({ error: error.message }, 500);

      logAudit(groupId, user.email, 'grocery_item_added', { id, name: name.trim() }).catch(console.warn);

      return c.json({
        item: {
          id, groupId, name: name.trim(), quantity: row.quantity,
          unit: row.unit, estimatedCost: row.estimated_cost,
          assignedTo: row.assigned_to, status: 'needed',
          notes: row.notes, addedBy: user.email, createdAt: now,
        },
      });
    } catch (err: any) { return handleError(c, err); }
  });

  app.put(`${PREFIX}/groups/:groupId/grocery/:itemId`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      const itemId = c.req.param('itemId');
      const { user } = await requireMember(c, groupId);

      const { name, quantity, unit, estimatedCost, assignedTo, status, notes } = await c.req.json();

      if (status && !['needed', 'sourced', 'purchased'].includes(status)) {
        return c.json({ error: 'Status must be needed, sourced, or purchased' }, 400);
      }

      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name.trim();
      if (quantity !== undefined) updates.quantity = quantity;
      if (unit !== undefined) updates.unit = unit;
      if (estimatedCost !== undefined) updates.estimated_cost = estimatedCost;
      if (assignedTo !== undefined) updates.assigned_to = assignedTo;
      if (status !== undefined) updates.status = status;
      if (notes !== undefined) updates.notes = notes;

      const { data, error } = await supabaseAdmin
        .from('grocery_items')
        .update(updates)
        .eq('id', itemId)
        .eq('group_id', groupId)
        .select()
        .single();

      if (error) return c.json({ error: error.message }, 404);

      logAudit(groupId, user.email, 'grocery_item_updated', { id: itemId }).catch(console.warn);

      return c.json({
        item: {
          id: data.id, groupId: data.group_id, name: data.name,
          quantity: data.quantity, unit: data.unit,
          estimatedCost: data.estimated_cost, assignedTo: data.assigned_to,
          status: data.status, notes: data.notes,
          addedBy: data.added_by, createdAt: data.created_at,
        },
      });
    } catch (err: any) { return handleError(c, err); }
  });

  app.delete(`${PREFIX}/groups/:groupId/grocery/:itemId`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      const itemId = c.req.param('itemId');
      const { user } = await requireMember(c, groupId);

      const { error } = await supabaseAdmin
        .from('grocery_items')
        .delete()
        .eq('id', itemId)
        .eq('group_id', groupId);

      if (error) return c.json({ error: error.message }, 500);

      logAudit(groupId, user.email, 'grocery_item_deleted', { id: itemId }).catch(console.warn);
      return c.json({ message: 'Grocery item deleted' });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // BURIAL BENEFICIARIES
  // ────────────────────────────────────────────────────────────

  app.get(`${PREFIX}/groups/:groupId/burial/beneficiaries`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      await requireMember(c, groupId);

      const { data, error } = await supabaseAdmin
        .from('burial_beneficiaries')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) return c.json({ error: error.message }, 500);

      const beneficiaries = (data || []).map((r: any) => ({
        id: r.id,
        groupId: r.group_id,
        memberEmail: r.member_email,
        fullName: r.full_name,
        relationship: r.relationship,
        idNumber: r.id_number,
        createdAt: r.created_at,
      }));

      return c.json({ beneficiaries });
    } catch (err: any) { return handleError(c, err); }
  });

  app.post(`${PREFIX}/groups/:groupId/burial/beneficiaries`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      const { user } = await requireMember(c, groupId);

      const { fullName, relationship, idNumber } = await c.req.json();
      if (!fullName?.trim() || !relationship?.trim()) {
        return c.json({ error: 'Full name and relationship are required' }, 400);
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const row = {
        id,
        group_id: groupId,
        member_email: user.email,
        full_name: fullName.trim(),
        relationship: relationship.trim(),
        id_number: idNumber || null,
        created_at: now,
      };

      const { error } = await supabaseAdmin.from('burial_beneficiaries').insert(row);
      if (error) return c.json({ error: error.message }, 500);

      logAudit(groupId, user.email, 'burial_beneficiary_added', { id, fullName: fullName.trim() }).catch(console.warn);

      return c.json({
        beneficiary: {
          id, groupId, memberEmail: user.email,
          fullName: fullName.trim(), relationship: relationship.trim(),
          idNumber: row.id_number, createdAt: now,
        },
      });
    } catch (err: any) { return handleError(c, err); }
  });

  app.delete(`${PREFIX}/groups/:groupId/burial/beneficiaries/:beneficiaryId`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      const beneficiaryId = c.req.param('beneficiaryId');
      const { user } = await requireMember(c, groupId);

      // Members can only delete their own beneficiaries
      const { data: existing } = await supabaseAdmin
        .from('burial_beneficiaries')
        .select('member_email')
        .eq('id', beneficiaryId)
        .eq('group_id', groupId)
        .maybeSingle();

      if (!existing) return c.json({ error: 'Beneficiary not found' }, 404);

      const m = await getMembership(groupId, user.email);
      if (existing.member_email !== user.email && m?.role !== 'admin') {
        return c.json({ error: 'Can only delete your own beneficiaries' }, 403);
      }

      const { error } = await supabaseAdmin
        .from('burial_beneficiaries')
        .delete()
        .eq('id', beneficiaryId)
        .eq('group_id', groupId);

      if (error) return c.json({ error: error.message }, 500);

      logAudit(groupId, user.email, 'burial_beneficiary_deleted', { id: beneficiaryId }).catch(console.warn);
      return c.json({ message: 'Beneficiary deleted' });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // BURIAL CLAIMS
  // ────────────────────────────────────────────────────────────

  app.get(`${PREFIX}/groups/:groupId/burial/claims`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      await requireMember(c, groupId);

      const { data, error } = await supabaseAdmin
        .from('burial_claims')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) return c.json({ error: error.message }, 500);

      const claims = (data || []).map((r: any) => ({
        id: r.id,
        groupId: r.group_id,
        claimantEmail: r.claimant_email,
        beneficiaryName: r.beneficiary_name,
        description: r.description,
        amount: r.amount,
        status: r.status,
        createdAt: r.created_at,
      }));

      return c.json({ claims });
    } catch (err: any) { return handleError(c, err); }
  });

  app.post(`${PREFIX}/groups/:groupId/burial/claims`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      const { user } = await requireMember(c, groupId);

      const { beneficiaryName, description, amount } = await c.req.json();
      if (!beneficiaryName?.trim() || !description?.trim() || !amount) {
        return c.json({ error: 'Beneficiary name, description, and amount are required' }, 400);
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const row = {
        id,
        group_id: groupId,
        claimant_email: user.email,
        beneficiary_name: beneficiaryName.trim(),
        description: description.trim(),
        amount: Number(amount),
        status: 'pending',
        created_at: now,
      };

      const { error } = await supabaseAdmin.from('burial_claims').insert(row);
      if (error) return c.json({ error: error.message }, 500);

      logAudit(groupId, user.email, 'burial_claim_submitted', { id, amount: Number(amount) }).catch(console.warn);

      // Notify admins
      const { data: admins } = await supabaseAdmin
        .from('group_memberships')
        .select('user_email')
        .eq('group_id', groupId)
        .eq('role', 'admin')
        .neq('user_email', user.email);

      if (admins) {
        for (const a of admins) {
          storeNotification(a.user_email, groupId, 'New burial claim submitted',
            `${user.email} submitted a burial claim for R${Number(amount).toFixed(2)}`, 'warning').catch(console.warn);
        }
      }

      return c.json({
        claim: {
          id, groupId, claimantEmail: user.email,
          beneficiaryName: beneficiaryName.trim(), description: description.trim(),
          amount: Number(amount), status: 'pending', createdAt: now,
        },
      });
    } catch (err: any) { return handleError(c, err); }
  });

  app.put(`${PREFIX}/groups/:groupId/burial/claims/:claimId`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      const claimId = c.req.param('claimId');
      const user = await requireAdmin(c, groupId);

      const { status } = await c.req.json();
      if (!['pending', 'approved', 'rejected', 'paid'].includes(status)) {
        return c.json({ error: 'Status must be pending, approved, rejected, or paid' }, 400);
      }

      const { data, error } = await supabaseAdmin
        .from('burial_claims')
        .update({ status })
        .eq('id', claimId)
        .eq('group_id', groupId)
        .select()
        .single();

      if (error) return c.json({ error: error.message }, 404);

      logAudit(groupId, user.email, 'burial_claim_updated', { id: claimId, status }).catch(console.warn);

      // Notify claimant
      storeNotification(data.claimant_email, groupId, 'Burial claim updated',
        `Your burial claim has been ${status}`, status === 'approved' ? 'success' : 'info').catch(console.warn);

      return c.json({
        claim: {
          id: data.id, groupId: data.group_id,
          claimantEmail: data.claimant_email, beneficiaryName: data.beneficiary_name,
          description: data.description, amount: data.amount,
          status: data.status, createdAt: data.created_at,
        },
      });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // ROTATION ORDER
  // ────────────────────────────────────────────────────────────

  app.get(`${PREFIX}/groups/:groupId/rotation`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      await requireMember(c, groupId);

      const { data } = await supabaseAdmin
        .from('rotation_orders')
        .select('*')
        .eq('group_id', groupId)
        .maybeSingle();

      if (!data) return c.json({ rotation: null });

      return c.json({
        rotation: {
          groupId: data.group_id,
          slots: data.slots,
          currentPosition: data.current_position,
          currentCycle: data.current_cycle,
          updatedAt: data.updated_at,
        },
      });
    } catch (err: any) { return handleError(c, err); }
  });

  app.post(`${PREFIX}/groups/:groupId/rotation/init`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      const user = await requireAdmin(c, groupId);

      const { slots } = await c.req.json();
      if (!Array.isArray(slots) || slots.length === 0) {
        return c.json({ error: 'Slots array is required' }, 400);
      }

      const now = new Date().toISOString();

      const row = {
        group_id: groupId,
        slots,
        current_position: 0,
        current_cycle: 1,
        updated_at: now,
      };

      await supabaseAdmin.from('rotation_orders').upsert(row, { onConflict: 'group_id' });

      logAudit(groupId, user.email, 'rotation_initialized', { slotCount: slots.length }).catch(console.warn);

      return c.json({
        rotation: {
          groupId, slots, currentPosition: 0, currentCycle: 1, updatedAt: now,
        },
      });
    } catch (err: any) { return handleError(c, err); }
  });

  app.put(`${PREFIX}/groups/:groupId/rotation/advance`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      const user = await requireAdmin(c, groupId);

      const { data: existing } = await supabaseAdmin
        .from('rotation_orders')
        .select('*')
        .eq('group_id', groupId)
        .maybeSingle();

      if (!existing) return c.json({ error: 'Rotation not initialized' }, 404);

      const slots = existing.slots || [];
      let nextPosition = existing.current_position + 1;
      let nextCycle = existing.current_cycle;

      if (nextPosition >= slots.length) {
        nextPosition = 0;
        nextCycle += 1;
      }

      const now = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from('rotation_orders')
        .update({ current_position: nextPosition, current_cycle: nextCycle, updated_at: now })
        .eq('group_id', groupId)
        .select()
        .single();

      if (error) return c.json({ error: error.message }, 500);

      logAudit(groupId, user.email, 'rotation_advanced', { position: nextPosition, cycle: nextCycle }).catch(console.warn);

      // Notify the next person in rotation
      const nextSlot = slots[nextPosition];
      if (nextSlot?.email) {
        storeNotification(nextSlot.email, groupId, 'Your turn in the rotation',
          `It is now your turn (position ${nextPosition + 1}, cycle ${nextCycle})`, 'info').catch(console.warn);
      }

      return c.json({
        rotation: {
          groupId: data.group_id, slots: data.slots,
          currentPosition: data.current_position, currentCycle: data.current_cycle,
          updatedAt: data.updated_at,
        },
      });
    } catch (err: any) { return handleError(c, err); }
  });

  app.put(`${PREFIX}/groups/:groupId/rotation/reorder`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      const user = await requireAdmin(c, groupId);

      const { slots } = await c.req.json();
      if (!Array.isArray(slots) || slots.length === 0) {
        return c.json({ error: 'Slots array is required' }, 400);
      }

      const now = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from('rotation_orders')
        .update({ slots, updated_at: now })
        .eq('group_id', groupId)
        .select()
        .single();

      if (error) return c.json({ error: error.message }, 404);

      logAudit(groupId, user.email, 'rotation_reordered', { slotCount: slots.length }).catch(console.warn);

      return c.json({
        rotation: {
          groupId: data.group_id, slots: data.slots,
          currentPosition: data.current_position, currentCycle: data.current_cycle,
          updatedAt: data.updated_at,
        },
      });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // PENALTIES
  // ────────────────────────────────────────────────────────────

  app.get(`${PREFIX}/groups/:groupId/penalties`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      await requireMember(c, groupId);

      const { data: rules } = await supabaseAdmin
        .from('penalty_rules')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      const { data: charges } = await supabaseAdmin
        .from('penalty_charges')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      const mappedRules = (rules || []).map((r: any) => ({
        id: r.id,
        groupId: r.group_id,
        name: r.name,
        amount: r.amount,
        description: r.description,
        createdBy: r.created_by,
        createdAt: r.created_at,
      }));

      const mappedCharges = (charges || []).map((r: any) => ({
        id: r.id,
        groupId: r.group_id,
        ruleId: r.rule_id,
        memberEmail: r.member_email,
        amount: r.amount,
        reason: r.reason,
        status: r.status,
        createdBy: r.created_by,
        createdAt: r.created_at,
      }));

      return c.json({ rules: mappedRules, charges: mappedCharges });
    } catch (err: any) { return handleError(c, err); }
  });

  app.post(`${PREFIX}/penalties/rules`, async (c: any) => {
    try {
      const { groupId, name, amount, description } = await c.req.json();
      if (!groupId || !name?.trim() || !amount) {
        return c.json({ error: 'groupId, name, and amount are required' }, 400);
      }

      const user = await requireAdmin(c, groupId);

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const row = {
        id,
        group_id: groupId,
        name: name.trim(),
        amount: Number(amount),
        description: description || null,
        created_by: user.email,
        created_at: now,
      };

      const { error } = await supabaseAdmin.from('penalty_rules').insert(row);
      if (error) return c.json({ error: error.message }, 500);

      logAudit(groupId, user.email, 'penalty_rule_created', { id, name: name.trim() }).catch(console.warn);

      return c.json({
        rule: {
          id, groupId, name: name.trim(), amount: Number(amount),
          description: row.description, createdBy: user.email, createdAt: now,
        },
      });
    } catch (err: any) { return handleError(c, err); }
  });

  app.delete(`${PREFIX}/penalties/rules/:id`, async (c: any) => {
    try {
      const ruleId = c.req.param('id');

      const { data: rule } = await supabaseAdmin
        .from('penalty_rules')
        .select('group_id')
        .eq('id', ruleId)
        .maybeSingle();

      if (!rule) return c.json({ error: 'Rule not found' }, 404);

      const user = await requireAdmin(c, rule.group_id);

      const { error } = await supabaseAdmin
        .from('penalty_rules')
        .delete()
        .eq('id', ruleId);

      if (error) return c.json({ error: error.message }, 500);

      logAudit(rule.group_id, user.email, 'penalty_rule_deleted', { id: ruleId }).catch(console.warn);
      return c.json({ message: 'Penalty rule deleted' });
    } catch (err: any) { return handleError(c, err); }
  });

  app.post(`${PREFIX}/penalties/charge`, async (c: any) => {
    try {
      const { groupId, ruleId, memberEmail, amount, reason } = await c.req.json();
      if (!groupId || !memberEmail || !amount) {
        return c.json({ error: 'groupId, memberEmail, and amount are required' }, 400);
      }

      const user = await requireAdmin(c, groupId);

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const row = {
        id,
        group_id: groupId,
        rule_id: ruleId || null,
        member_email: memberEmail,
        amount: Number(amount),
        reason: reason || null,
        status: 'pending',
        created_by: user.email,
        created_at: now,
      };

      const { error } = await supabaseAdmin.from('penalty_charges').insert(row);
      if (error) return c.json({ error: error.message }, 500);

      logAudit(groupId, user.email, 'penalty_charged', { id, memberEmail, amount: Number(amount) }).catch(console.warn);

      storeNotification(memberEmail, groupId, 'Penalty charged',
        `You have been charged a penalty of R${Number(amount).toFixed(2)}${reason ? ': ' + reason : ''}`, 'warning').catch(console.warn);

      return c.json({
        charge: {
          id, groupId, ruleId: row.rule_id, memberEmail,
          amount: Number(amount), reason: row.reason,
          status: 'pending', createdBy: user.email, createdAt: now,
        },
      });
    } catch (err: any) { return handleError(c, err); }
  });

  app.put(`${PREFIX}/penalties/charges/:id`, async (c: any) => {
    try {
      const chargeId = c.req.param('id');

      const { data: charge } = await supabaseAdmin
        .from('penalty_charges')
        .select('group_id')
        .eq('id', chargeId)
        .maybeSingle();

      if (!charge) return c.json({ error: 'Charge not found' }, 404);

      const user = await requireAdmin(c, charge.group_id);

      const { status } = await c.req.json();
      if (!['pending', 'paid', 'waived'].includes(status)) {
        return c.json({ error: 'Status must be pending, paid, or waived' }, 400);
      }

      const { data, error } = await supabaseAdmin
        .from('penalty_charges')
        .update({ status })
        .eq('id', chargeId)
        .select()
        .single();

      if (error) return c.json({ error: error.message }, 500);

      logAudit(charge.group_id, user.email, 'penalty_charge_updated', { id: chargeId, status }).catch(console.warn);

      return c.json({
        charge: {
          id: data.id, groupId: data.group_id, ruleId: data.rule_id,
          memberEmail: data.member_email, amount: data.amount,
          reason: data.reason, status: data.status,
          createdBy: data.created_by, createdAt: data.created_at,
        },
      });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // VOICE NOTES
  // ────────────────────────────────────────────────────────────

  app.post(`${PREFIX}/meetings/:meetingId/voice-note`, async (c: any) => {
    try {
      const user = await requireUser(c);
      const meetingId = c.req.param('meetingId');

      const { data: meeting } = await supabaseAdmin
        .from('meetings')
        .select('id, group_id')
        .eq('id', meetingId)
        .single();
      if (!meeting) return c.json({ error: 'Meeting not found' }, 404);

      const m = await getMembership(meeting.group_id, user.email);
      if (!m || m.status !== 'approved') return c.json({ error: 'Not a member of this group' }, 403);

      const { audio } = await c.req.json();
      if (!audio) return c.json({ error: 'Audio data is required' }, 400);

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const row = {
        id,
        meeting_id: meetingId,
        group_id: meeting.group_id,
        uploaded_by: user.email,
        audio,
        uploaded_at: now,
      };

      const { error } = await supabaseAdmin.from('voice_notes').insert(row);
      if (error) return c.json({ error: error.message }, 500);

      logAudit(meeting.group_id, user.email, 'voice_note_uploaded', { id, meetingId }).catch(console.warn);

      return c.json({
        voiceNote: {
          id, meetingId, groupId: meeting.group_id,
          uploadedBy: user.email, uploadedAt: now,
        },
      });
    } catch (err: any) { return handleError(c, err); }
  });

  app.get(`${PREFIX}/meetings/:meetingId/voice-note`, async (c: any) => {
    try {
      const user = await requireUser(c);
      const meetingId = c.req.param('meetingId');

      const { data: meeting } = await supabaseAdmin
        .from('meetings')
        .select('id, group_id')
        .eq('id', meetingId)
        .single();
      if (!meeting) return c.json({ error: 'Meeting not found' }, 404);

      const m = await getMembership(meeting.group_id, user.email);
      if (!m || m.status !== 'approved') return c.json({ error: 'Not a member of this group' }, 403);

      const { data, error } = await supabaseAdmin
        .from('voice_notes')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('uploaded_at', { ascending: false });

      if (error) return c.json({ error: error.message }, 500);

      const voiceNotes = (data || []).map((r: any) => ({
        id: r.id,
        meetingId: r.meeting_id,
        groupId: r.group_id,
        uploadedBy: r.uploaded_by,
        audio: r.audio,
        uploadedAt: r.uploaded_at,
      }));

      return c.json({ voiceNotes });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // LEADERBOARD
  // ────────────────────────────────────────────────────────────

  app.get(`${PREFIX}/groups/:groupId/leaderboard`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      await requireMember(c, groupId);

      const { data: members } = await supabaseAdmin
        .from('group_memberships')
        .select('user_email')
        .eq('group_id', groupId)
        .eq('status', 'approved');

      const { data: contributions } = await supabaseAdmin
        .from('contributions')
        .select('user_email, amount, paid, date')
        .eq('group_id', groupId);

      const emails = (members || []).map((m: any) => m.user_email);
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name, surname, profile_picture_url')
        .in('email', emails.length > 0 ? emails : ['__none__']);

      const profileMap: Record<string, any> = {};
      for (const p of (profiles || [])) profileMap[p.email] = p;

      const leaderboard = (members || []).map((m: any) => {
        const memberContribs = (contributions || []).filter((c: any) => c.user_email === m.user_email);
        const totalPaid = memberContribs
          .filter((c: any) => c.paid)
          .reduce((s: number, c: any) => s + Number(c.amount), 0);
        const paidCount = memberContribs.filter((c: any) => c.paid).length;

        // Calculate streak: consecutive months with at least one paid contribution
        const paidDates = memberContribs
          .filter((c: any) => c.paid)
          .map((c: any) => new Date(c.date))
          .sort((a: Date, b: Date) => b.getTime() - a.getTime());

        let streak = 0;
        if (paidDates.length > 0) {
          const now = new Date();
          let checkMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          for (let i = 0; i < 24; i++) {
            const hasPayment = paidDates.some((d: Date) =>
              d.getFullYear() === checkMonth.getFullYear() && d.getMonth() === checkMonth.getMonth()
            );
            if (hasPayment) {
              streak++;
              checkMonth = new Date(checkMonth.getFullYear(), checkMonth.getMonth() - 1, 1);
            } else {
              break;
            }
          }
        }

        const profile = profileMap[m.user_email];
        return {
          email: m.user_email,
          fullName: profile?.full_name || 'Unknown',
          surname: profile?.surname || '',
          profilePictureUrl: profile?.profile_picture_url || null,
          totalPaid,
          paidCount,
          streak,
        };
      });

      // Sort by totalPaid descending
      leaderboard.sort((a: any, b: any) => b.totalPaid - a.totalPaid);

      return c.json({ leaderboard });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // DEPENDENTS
  // ────────────────────────────────────────────────────────────

  app.get(`${PREFIX}/groups/:groupId/dependents`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      await requireMember(c, groupId);

      const { data, error } = await supabaseAdmin
        .from('dependents')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) return c.json({ error: error.message }, 500);

      const dependents = (data || []).map((r: any) => ({
        id: r.id,
        groupId: r.group_id,
        memberEmail: r.member_email,
        fullName: r.full_name,
        relationship: r.relationship,
        dateOfBirth: r.date_of_birth,
        idNumber: r.id_number,
        createdAt: r.created_at,
      }));

      return c.json({ dependents });
    } catch (err: any) { return handleError(c, err); }
  });

  app.post(`${PREFIX}/groups/:groupId/dependents`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      const { user } = await requireMember(c, groupId);

      const { fullName, relationship, dateOfBirth, idNumber } = await c.req.json();
      if (!fullName?.trim() || !relationship?.trim()) {
        return c.json({ error: 'Full name and relationship are required' }, 400);
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const row = {
        id,
        group_id: groupId,
        member_email: user.email,
        full_name: fullName.trim(),
        relationship: relationship.trim(),
        date_of_birth: dateOfBirth || null,
        id_number: idNumber || null,
        created_at: now,
      };

      const { error } = await supabaseAdmin.from('dependents').insert(row);
      if (error) return c.json({ error: error.message }, 500);

      logAudit(groupId, user.email, 'dependent_added', { id, fullName: fullName.trim() }).catch(console.warn);

      return c.json({
        dependent: {
          id, groupId, memberEmail: user.email,
          fullName: fullName.trim(), relationship: relationship.trim(),
          dateOfBirth: row.date_of_birth, idNumber: row.id_number,
          createdAt: now,
        },
      });
    } catch (err: any) { return handleError(c, err); }
  });

  app.delete(`${PREFIX}/groups/:groupId/dependents/:id`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      const depId = c.req.param('id');
      const { user } = await requireMember(c, groupId);

      const { data: existing } = await supabaseAdmin
        .from('dependents')
        .select('member_email')
        .eq('id', depId)
        .eq('group_id', groupId)
        .maybeSingle();

      if (!existing) return c.json({ error: 'Dependent not found' }, 404);

      const m = await getMembership(groupId, user.email);
      if (existing.member_email !== user.email && m?.role !== 'admin') {
        return c.json({ error: 'Can only delete your own dependents' }, 403);
      }

      const { error } = await supabaseAdmin
        .from('dependents')
        .delete()
        .eq('id', depId)
        .eq('group_id', groupId);

      if (error) return c.json({ error: error.message }, 500);

      logAudit(groupId, user.email, 'dependent_deleted', { id: depId }).catch(console.warn);
      return c.json({ message: 'Dependent deleted' });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // SMS INCOMING (Africa's Talking webhook — no auth needed)
  // ────────────────────────────────────────────────────────────

  app.post(`${PREFIX}/sms/incoming`, async (c: any) => {
    try {
      let from: string | undefined;
      let text: string | undefined;

      const contentType = c.req.header('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await c.req.json();
        from = body.from;
        text = body.text;
      } else {
        const formData = await c.req.formData();
        from = formData.get('from')?.toString();
        text = formData.get('text')?.toString();
      }

      if (!from || !text) return c.json({ error: 'Missing from or text' }, 400);

      const command = text.trim().toUpperCase();

      // Find user by phone number
      const { data: appUser } = await supabaseAdmin
        .from('app_users')
        .select('email, id')
        .eq('phone', from)
        .maybeSingle();

      if (!appUser) {
        return c.json({ message: 'User not found. Please register on the app first.' });
      }

      // Find their first group
      const { data: membership } = await supabaseAdmin
        .from('group_memberships')
        .select('group_id')
        .eq('user_email', appUser.email)
        .eq('status', 'approved')
        .limit(1)
        .maybeSingle();

      if (command.startsWith('PAY ')) {
        const amountStr = command.replace('PAY ', '').trim();
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) {
          return c.json({ message: 'Invalid amount. Use: PAY <amount>' });
        }
        if (!membership) {
          return c.json({ message: 'You are not a member of any group.' });
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await supabaseAdmin.from('contributions').insert({
          id,
          group_id: membership.group_id,
          user_email: appUser.email,
          amount,
          paid: false,
          date: now,
          created_at: now,
        });

        return c.json({ message: `Contribution of R${amount.toFixed(2)} recorded. Please complete payment.` });

      } else if (command === 'BALANCE') {
        if (!membership) {
          return c.json({ message: 'You are not a member of any group.' });
        }

        const { data: contribs } = await supabaseAdmin
          .from('contributions')
          .select('amount, paid')
          .eq('group_id', membership.group_id)
          .eq('user_email', appUser.email);

        const totalPaid = (contribs || []).filter((c: any) => c.paid).reduce((s: number, c: any) => s + Number(c.amount), 0);
        const totalOwed = (contribs || []).filter((c: any) => !c.paid).reduce((s: number, c: any) => s + Number(c.amount), 0);

        return c.json({ message: `Paid: R${totalPaid.toFixed(2)}, Outstanding: R${totalOwed.toFixed(2)}` });

      } else if (command === 'HELP') {
        return c.json({ message: 'Commands: PAY <amount> - record a contribution, BALANCE - check your balance, HELP - show this message' });

      } else {
        return c.json({ message: 'Unknown command. Reply HELP for available commands.' });
      }
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // DEMO GROUP
  // ────────────────────────────────────────────────────────────

  app.post(`${PREFIX}/demo-group`, async (c: any) => {
    try {
      const user = await requireUser(c);

      // Idempotent — if user already has a demo group, return it
      const { data: existingDemo } = await supabaseAdmin
        .from('groups')
        .select('id, name')
        .eq('created_by', user.email)
        .eq('is_demo', true)
        .maybeSingle();
      if (existingDemo) {
        return c.json({ groupId: existingDemo.id, groupName: existingDemo.name, alreadyExisted: true });
      }

      const groupId = crypto.randomUUID();
      const groupCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const now = new Date();

      // Helper: date N months ago
      const monthsAgo = (n: number) => {
        const d = new Date(now);
        d.setMonth(d.getMonth() - n);
        return d;
      };
      const daysFromNow = (n: number) => {
        const d = new Date(now);
        d.setDate(d.getDate() + n);
        return d;
      };

      // ─── 1. Create the group ─────────────────────────────────────
      await supabaseAdmin.from('groups').insert({
        id: groupId,
        name: 'Stokpile Demo Group',
        description: 'A sample rotating stokvel with 6 months of realistic data. Explore every feature — contributions, payouts, meetings, rotation, and more.',
        group_code: groupCode,
        is_public: false,
        payouts_allowed: true,
        group_type: 'rotating',
        contribution_frequency: 'monthly',
        contribution_target: 500,
        contribution_target_annual: 6000,
        archived: false,
        is_demo: true,
        admin1: user.email,
        created_by: user.email,
        created_at: monthsAgo(6).toISOString(),
      });

      // ─── 2. Members ──────────────────────────────────────────────
      const fakeMembers = [
        { email: 'thandi.demo@stokpile.app', fullName: 'Thandi', surname: 'Mokoena' },
        { email: 'sipho.demo@stokpile.app', fullName: 'Sipho', surname: 'Dlamini' },
        { email: 'precious.demo@stokpile.app', fullName: 'Precious', surname: 'Khumalo' },
        { email: 'kagiso.demo@stokpile.app', fullName: 'Kagiso', surname: 'Tladi' },
      ];

      // Admin membership
      await supabaseAdmin.from('group_memberships').insert({
        id: crypto.randomUUID(),
        group_id: groupId,
        user_email: user.email,
        role: 'admin',
        status: 'approved',
        joined_at: monthsAgo(6).toISOString(),
      });

      for (const fm of fakeMembers) {
        await supabaseAdmin.from('group_memberships').insert({
          id: crypto.randomUUID(),
          group_id: groupId,
          user_email: fm.email,
          full_name: fm.fullName,
          surname: fm.surname,
          role: 'member',
          status: 'approved',
          joined_at: monthsAgo(6).toISOString(),
        });
      }

      // ─── 3. Contributions (6 months) ─────────────────────────────
      const allMembers = [
        { email: user.email, reliable: true },
        { email: fakeMembers[0].email, reliable: true },   // Thandi: always pays
        { email: fakeMembers[1].email, reliable: true },   // Sipho: always pays
        { email: fakeMembers[2].email, reliable: true },   // Precious: mostly pays
        { email: fakeMembers[3].email, reliable: false },  // Kagiso: inconsistent
      ];

      for (let month = 5; month >= 0; month--) {
        const contribDate = monthsAgo(month);
        for (const member of allMembers) {
          // Kagiso skips ~40% of months; Precious skips ~10%
          const paid = member.reliable
            ? (member.email === fakeMembers[2].email ? Math.random() > 0.1 : true)
            : Math.random() > 0.4;
          // Current month: Kagiso hasn't paid yet (for demo effect)
          const isPaid = month === 0 && !member.reliable ? false : paid;

          await supabaseAdmin.from('contributions').insert({
            id: crypto.randomUUID(),
            group_id: groupId,
            user_email: member.email,
            amount: 500,
            date: contribDate.toISOString().slice(0, 10),
            paid: isPaid,
            created_at: contribDate.toISOString(),
          });
        }
      }

      // ─── 4. Payouts ──────────────────────────────────────────────
      // Completed payout 2 months ago
      await supabaseAdmin.from('payouts').insert({
        id: crypto.randomUUID(),
        group_id: groupId,
        recipient_email: fakeMembers[0].email,
        amount: 2500,
        status: 'completed',
        scheduled_date: monthsAgo(2).toISOString().slice(0, 10),
        completed_at: monthsAgo(2).toISOString(),
        reference_number: 'EFT-DEMO-001',
        confirmed_by_recipient: true,
        confirmed_at: monthsAgo(2).toISOString(),
        payment_method: 'eft',
        created_at: monthsAgo(2).toISOString(),
      });

      // Completed payout last month
      await supabaseAdmin.from('payouts').insert({
        id: crypto.randomUUID(),
        group_id: groupId,
        recipient_email: fakeMembers[1].email,
        amount: 2500,
        status: 'completed',
        scheduled_date: monthsAgo(1).toISOString().slice(0, 10),
        completed_at: monthsAgo(1).toISOString(),
        reference_number: 'EFT-DEMO-002',
        confirmed_by_recipient: true,
        confirmed_at: monthsAgo(1).toISOString(),
        payment_method: 'eft',
        created_at: monthsAgo(1).toISOString(),
      });

      // Scheduled payout this month (upcoming)
      await supabaseAdmin.from('payouts').insert({
        id: crypto.randomUUID(),
        group_id: groupId,
        recipient_email: fakeMembers[2].email,
        amount: 2500,
        status: 'scheduled',
        scheduled_date: daysFromNow(5).toISOString().slice(0, 10),
        created_at: now.toISOString(),
      });

      // ─── 5. Meetings ─────────────────────────────────────────────
      // Past meeting (2 months ago) with attendance
      const pastMeetingId = crypto.randomUUID();
      await supabaseAdmin.from('meetings').insert({
        id: pastMeetingId,
        group_id: groupId,
        title: 'Monthly check-in — February',
        date: monthsAgo(2).toISOString().slice(0, 10),
        time: '18:00',
        venue: 'Community Hall, Soweto',
        agenda: '1. Review contributions\\n2. Confirm payout to Thandi\\n3. Discuss late payments\\n4. Set next meeting date',
        attendance: {
          [user.email]: true,
          [fakeMembers[0].email]: true,
          [fakeMembers[1].email]: true,
          [fakeMembers[2].email]: true,
          [fakeMembers[3].email]: false,
        },
        created_by: user.email,
        created_at: monthsAgo(2).toISOString(),
      });

      // Past meeting (last month)
      await supabaseAdmin.from('meetings').insert({
        id: crypto.randomUUID(),
        group_id: groupId,
        title: 'Monthly check-in — March',
        date: monthsAgo(1).toISOString().slice(0, 10),
        time: '18:00',
        venue: 'Community Hall, Soweto',
        agenda: '1. March contributions review\\n2. Sipho payout confirmation\\n3. Constitution update',
        attendance: {
          [user.email]: true,
          [fakeMembers[0].email]: true,
          [fakeMembers[1].email]: true,
          [fakeMembers[2].email]: false,
          [fakeMembers[3].email]: true,
        },
        created_by: user.email,
        created_at: monthsAgo(1).toISOString(),
      });

      // Upcoming meeting (next week)
      await supabaseAdmin.from('meetings').insert({
        id: crypto.randomUUID(),
        group_id: groupId,
        title: 'Monthly check-in — April',
        date: daysFromNow(7).toISOString().slice(0, 10),
        time: '18:00',
        venue: 'Community Hall, Soweto',
        agenda: '1. April contributions\\n2. Precious payout schedule\\n3. Kagiso late payment discussion',
        created_by: user.email,
        created_at: now.toISOString(),
      });

      // ─── 6. Announcements ────────────────────────────────────────
      await supabaseAdmin.from('announcements').insert({
        id: crypto.randomUUID(),
        group_id: groupId,
        title: 'Welcome to your Demo Group!',
        content: 'This group has 6 months of sample data so you can explore every feature in Stokpile. Try recording a contribution, scheduling a payout, or creating a meeting. When you\'re ready, create your own group and invite real members.',
        urgent: false,
        pinned: true,
        created_by: user.email,
        created_at: monthsAgo(6).toISOString(),
      });

      await supabaseAdmin.from('announcements').insert({
        id: crypto.randomUUID(),
        group_id: groupId,
        title: 'Reminder: April contributions due by the 25th',
        content: 'Please ensure your R500 contribution is paid before the 25th. Late payments may attract a fine as per our constitution.',
        urgent: true,
        pinned: false,
        created_by: user.email,
        created_at: now.toISOString(),
      });

      // ─── 7. Rotation order ───────────────────────────────────────
      await supabaseAdmin.from('rotation_orders').upsert({
        group_id: groupId,
        slots: [
          { email: fakeMembers[0].email, position: 0, fullName: 'Thandi', surname: 'Mokoena', cycleReceived: true },
          { email: fakeMembers[1].email, position: 1, fullName: 'Sipho', surname: 'Dlamini', cycleReceived: true },
          { email: fakeMembers[2].email, position: 2, fullName: 'Precious', surname: 'Khumalo', cycleReceived: false },
          { email: fakeMembers[3].email, position: 3, fullName: 'Kagiso', surname: 'Tladi', cycleReceived: false },
          { email: user.email, position: 4, cycleReceived: false },
        ],
        current_position: 2,
        current_cycle: 1,
        updated_at: now.toISOString(),
      }, { onConflict: 'group_id' });

      // ─── 8. Notes on past meeting ────────────────────────────────
      await supabaseAdmin.from('notes').insert({
        id: crypto.randomUUID(),
        group_id: groupId,
        meeting_id: pastMeetingId,
        content: 'Agreed: Kagiso will pay his outstanding R500 by end of week. Constitution to be updated with a R50 late payment fine.',
        created_by: user.email,
        created_at: monthsAgo(2).toISOString(),
      });

      // ─── 9. Vote on past meeting ─────────────────────────────────
      await supabaseAdmin.from('votes').insert({
        id: crypto.randomUUID(),
        group_id: groupId,
        meeting_id: pastMeetingId,
        question: 'Should we introduce a R50 fine for late payments?',
        active: true,
        created_by: user.email,
        created_at: monthsAgo(2).toISOString(),
      });

      // ─── 10. Audit log entries ───────────────────────────────────
      const auditEntries = [
        { action: 'group_created', userEmail: user.email, timestamp: monthsAgo(6) },
        { action: 'member_joined', userEmail: fakeMembers[0].email, timestamp: monthsAgo(6) },
        { action: 'member_joined', userEmail: fakeMembers[1].email, timestamp: monthsAgo(6) },
        { action: 'member_joined', userEmail: fakeMembers[2].email, timestamp: monthsAgo(6) },
        { action: 'member_joined', userEmail: fakeMembers[3].email, timestamp: monthsAgo(6) },
        { action: 'payout_completed', userEmail: user.email, timestamp: monthsAgo(2) },
        { action: 'payout_completed', userEmail: user.email, timestamp: monthsAgo(1) },
        { action: 'announcement_created', userEmail: user.email, timestamp: now },
      ];
      for (const entry of auditEntries) {
        await supabaseAdmin.from('audit_log').insert({
          id: crypto.randomUUID(),
          group_id: groupId,
          user_email: entry.userEmail,
          action: entry.action,
          timestamp: entry.timestamp.toISOString(),
        });
      }

      // ─── 11. Subscription (trial) ────────────────────────────────
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 90);
      await supabaseAdmin.from('subscriptions').upsert({
        group_id: groupId,
        tier: 'trial',
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnd.toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: 'group_id' });

      return c.json({
        groupId,
        groupName: 'Stokpile Demo Group',
        memberCount: 5,
        monthsOfData: 6,
        message: 'Demo group created with 6 months of sample data',
        alreadyExisted: false,
      });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // FLUTTERWAVE PAYMENT LINK
  // ────────────────────────────────────────────────────────────

  app.post(`${PREFIX}/contributions/:contributionId/flutterwave-link`, async (c: any) => {
    try {
      const user = await requireUser(c);
      const contributionId = c.req.param('contributionId');

      const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
      if (!flutterwaveSecretKey) return c.json({ error: 'Flutterwave not configured' }, 503);

      const { data: contribution } = await supabaseAdmin
        .from('contributions')
        .select('*')
        .eq('id', contributionId)
        .single();
      if (!contribution) return c.json({ error: 'Contribution not found' }, 404);
      if (contribution.user_email !== user.email) return c.json({ error: 'Not authorized' }, 403);

      const { data: group } = await supabaseAdmin
        .from('groups')
        .select('name, currency')
        .eq('id', contribution.group_id)
        .maybeSingle();

      const txRef = `stokpile-fw-${contributionId}-${Date.now()}`;
      const appUrl = Deno.env.get('APP_URL') || 'https://stokpilev1.vercel.app';

      const fwResponse = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${flutterwaveSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tx_ref: txRef,
          amount: Number(contribution.amount),
          currency: group?.currency || 'ZAR',
          redirect_url: `${appUrl}?payment=success&contributionId=${contributionId}`,
          customer: {
            email: user.email,
          },
          meta: {
            contributionId,
            groupId: contribution.group_id,
          },
          customizations: {
            title: `Stokpile - ${group?.name || 'Group'} Contribution`,
            description: `Contribution payment of ${group?.currency || 'ZAR'} ${Number(contribution.amount).toFixed(2)}`,
          },
        }),
      });

      const fwData = await fwResponse.json();
      if (fwData.status !== 'success') {
        return c.json({ error: fwData.message || 'Failed to create payment link' }, 400);
      }

      return c.json({
        paymentLink: fwData.data.link,
        txRef,
      });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // FLUTTERWAVE WEBHOOK
  // ────────────────────────────────────────────────────────────

  app.post(`${PREFIX}/flutterwave/webhook`, async (c: any) => {
    try {
      const flutterwaveSecretHash = Deno.env.get('FLUTTERWAVE_SECRET_HASH');
      if (!flutterwaveSecretHash) return c.json({ error: 'Not configured' }, 503);

      // Verify webhook signature
      const signature = c.req.header('verif-hash');
      if (signature !== flutterwaveSecretHash) {
        return c.json({ error: 'Invalid signature' }, 401);
      }

      const event = await c.req.json();

      if (event.event === 'charge.completed' && event.data?.status === 'successful') {
        const { contributionId, groupId } = event.data?.meta || {};

        if (contributionId) {
          // Verify transaction with Flutterwave
          const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
          if (flutterwaveSecretKey) {
            const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${event.data.id}/verify`, {
              headers: { Authorization: `Bearer ${flutterwaveSecretKey}` },
            });
            const verifyData = await verifyRes.json();

            if (verifyData.status === 'success' && verifyData.data?.status === 'successful') {
              await supabaseAdmin
                .from('contributions')
                .update({ paid: true, updated_at: new Date().toISOString() })
                .eq('id', contributionId);

              if (groupId) {
                const { data: contribution } = await supabaseAdmin
                  .from('contributions')
                  .select('user_email')
                  .eq('id', contributionId)
                  .maybeSingle();

                if (contribution) {
                  logAudit(groupId, contribution.user_email, 'flutterwave_payment_confirmed', {
                    contributionId, transactionId: event.data.id,
                  }).catch(console.warn);

                  storeNotification(contribution.user_email, groupId, 'Payment confirmed',
                    `Your Flutterwave payment has been confirmed`, 'success').catch(console.warn);
                }
              }
            }
          }
        }
      }

      return c.json({ success: true });
    } catch (err: any) { return handleError(c, err); }
  });

} // end registerMoreRoutes
