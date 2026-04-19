// extra_routes.ts — Additional routes that complement the core index.ts
// All routes use Postgres via supabaseAdmin (NOT KV store).

const PROOF_BUCKET = 'make-34d0b231-payment-proofs';
const PREFIX = '/make-server-34d0b231';
const VALID_TIERS = ['free', 'community', 'pro', 'enterprise'];
const TRIAL_DAYS = 90;

const TIER_FEATURES: Record<string, string[]> = {
  free:       ['announcements'],
  community:  ['announcements', 'payment-proofs', 'rotation', 'grocery', 'burial', 'sms', 'flutterwave'],
  pro:        ['announcements', 'payment-proofs', 'rotation', 'grocery', 'burial', 'sms', 'flutterwave', 'reports', 'analytics', 'penalties', 'audit'],
  enterprise: ['announcements', 'payment-proofs', 'rotation', 'grocery', 'burial', 'sms', 'flutterwave', 'reports', 'analytics', 'penalties', 'audit'],
  trial:      ['announcements', 'payment-proofs', 'rotation', 'grocery', 'burial', 'sms', 'flutterwave', 'reports', 'analytics', 'penalties', 'audit'],
};

const PLAN_CODES: Record<string, string | undefined> = {
  community: typeof Deno !== 'undefined' ? Deno.env.get('PAYSTACK_COMMUNITY_PLAN_CODE') : undefined,
  pro:       typeof Deno !== 'undefined' ? Deno.env.get('PAYSTACK_PRO_PLAN_CODE') : undefined,
};

// ────────────────────────────────────────────────────────────
// REWARDS — lifetime loyalty & referral commission accrual
// Credit-only, no point expiry. Called from Paystack + Flutterwave
// webhooks on successful subscription charges.
// ────────────────────────────────────────────────────────────
const REWARDS_TIER_THRESHOLDS: Array<[string, number]> = [
  ['platinum', 10000],
  ['gold',      2000],
  ['silver',     500],
  ['bronze',       0],
];
const REWARDS_COMMISSION_RATES: Record<string, number> = {
  platinum: 0.22, gold: 0.20, silver: 0.18, bronze: 0.15,
};
const REWARDS_SUBSCRIPTION_MONTH_POINTS = 50;
const REWARDS_REFERRAL_CONVERSION_POINTS = 300;
const REWARDS_ACTIVE_REFERRAL_CAP = 10;
const REWARDS_LIFETIME_WINDOW_MONTHS = 24;

function rewardsTier(points: number): string {
  for (const [tier, threshold] of REWARDS_TIER_THRESHOLDS) {
    if (points >= threshold) return tier;
  }
  return 'bronze';
}

async function rewardsEnsureAccount(supabaseAdmin: any, userId: string, email: string) {
  const { data } = await supabaseAdmin
    .from('rewards_accounts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (data) return data;
  const { data: created } = await supabaseAdmin
    .from('rewards_accounts')
    .insert({ user_id: userId, email })
    .select()
    .single();
  return created;
}

async function rewardsApplyDelta(
  supabaseAdmin: any,
  userId: string,
  pointsDelta: number,
  zarDelta: number,
) {
  const { data: acc } = await supabaseAdmin
    .from('rewards_accounts')
    .select('lifetime_points, available_points, lifetime_earnings_zar, pending_earnings_zar')
    .eq('user_id', userId)
    .maybeSingle();
  if (!acc) return;
  const newLifetime = (acc.lifetime_points || 0) + Math.max(0, pointsDelta);
  await supabaseAdmin.from('rewards_accounts').update({
    lifetime_points: newLifetime,
    available_points: (acc.available_points || 0) + pointsDelta,
    lifetime_earnings_zar: Number(acc.lifetime_earnings_zar || 0) + Math.max(0, zarDelta),
    pending_earnings_zar: Number(acc.pending_earnings_zar || 0) + zarDelta,
    tier: rewardsTier(newLifetime),
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);
}

async function rewardsAccrueForPayment(
  supabaseAdmin: any,
  opts: {
    provider: 'paystack' | 'flutterwave';
    providerEventId: string;
    providerReference?: string;
    groupId: string | null;
    tier: string;
    payerEmail: string;
    amountZar: number;
    currency?: string;
  },
) {
  try {
    const { provider, providerEventId, providerReference, groupId, tier, payerEmail, amountZar, currency } = opts;

    // 1. Insert subscription_payment (idempotent)
    const { data: payerUser } = await supabaseAdmin
      .from('app_users').select('id').eq('email', payerEmail).maybeSingle();
    const payerUserId = payerUser?.id || null;

    const { data: payment, error: payErr } = await supabaseAdmin
      .from('subscription_payments')
      .insert({
        group_id: groupId,
        payer_email: payerEmail,
        payer_user_id: payerUserId,
        tier,
        amount_zar: amountZar,
        currency: currency || 'ZAR',
        provider,
        provider_event_id: providerEventId,
        provider_reference: providerReference || null,
      })
      .select()
      .single();
    if (payErr || !payment) return; // duplicate or error — don't double-accrue

    // 2. Award "subscription month" points to payer
    if (payerUserId) {
      await rewardsEnsureAccount(supabaseAdmin, payerUserId, payerEmail);
      await supabaseAdmin.from('rewards_ledger').insert({
        user_id: payerUserId,
        event_type: 'subscription_month',
        points_delta: REWARDS_SUBSCRIPTION_MONTH_POINTS,
        source_id: payment.id,
        metadata: { tier, amount_zar: amountZar },
      });
      await rewardsApplyDelta(supabaseAdmin, payerUserId, REWARDS_SUBSCRIPTION_MONTH_POINTS, 0);
    }

    // 3. Referral commission accrual
    const { data: claim } = await supabaseAdmin
      .from('referral_claims')
      .select('referrer_id, claimed_at')
      .eq('new_user_email', payerEmail)
      .maybeSingle();
    if (!claim) return;

    // 24-month window from first claim
    const claimedAt = new Date(claim.claimed_at);
    const windowEnd = new Date(claimedAt);
    windowEnd.setMonth(windowEnd.getMonth() + REWARDS_LIFETIME_WINDOW_MONTHS);
    if (new Date() > windowEnd) return;

    // Active referral cap — count distinct referred emails in last 24 months with commissions
    const since = new Date();
    since.setMonth(since.getMonth() - REWARDS_LIFETIME_WINDOW_MONTHS);
    const { data: active } = await supabaseAdmin
      .from('rewards_referral_commissions')
      .select('referred_user_email')
      .eq('referrer_id', claim.referrer_id)
      .gte('month', since.toISOString().slice(0, 10));
    const activeSet = new Set((active || []).map((r: any) => r.referred_user_email));
    if (!activeSet.has(payerEmail) && activeSet.size >= REWARDS_ACTIVE_REFERRAL_CAP) return;

    // Determine referrer's tier → commission rate
    await rewardsEnsureAccount(supabaseAdmin, claim.referrer_id, '');
    const { data: referrerAcc } = await supabaseAdmin
      .from('rewards_accounts')
      .select('tier, lifetime_points')
      .eq('user_id', claim.referrer_id)
      .maybeSingle();
    const referrerTier = referrerAcc?.tier || 'bronze';
    const rate = REWARDS_COMMISSION_RATES[referrerTier] ?? 0.15;
    const commission = Math.round(amountZar * rate * 100) / 100;
    const monthStr = new Date().toISOString().slice(0, 7) + '-01';

    const { error: commErr } = await supabaseAdmin
      .from('rewards_referral_commissions')
      .insert({
        referrer_id: claim.referrer_id,
        referred_user_email: payerEmail,
        subscription_payment_id: payment.id,
        gross_amount_zar: amountZar,
        commission_rate: rate,
        commission_amount_zar: commission,
        month: monthStr,
      });
    if (commErr) return; // unique violation — already accrued

    // First conversion bonus — only if this is the first commission for this pair
    const { count } = await supabaseAdmin
      .from('rewards_referral_commissions')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', claim.referrer_id)
      .eq('referred_user_email', payerEmail);
    const isFirst = (count || 0) === 1;

    await supabaseAdmin.from('rewards_ledger').insert({
      user_id: claim.referrer_id,
      event_type: 'referral_commission',
      points_delta: isFirst ? REWARDS_REFERRAL_CONVERSION_POINTS : 0,
      zar_delta: commission,
      source_id: payment.id,
      metadata: { referred_email: payerEmail, rate, tier: referrerTier, first: isFirst },
    });
    await rewardsApplyDelta(
      supabaseAdmin,
      claim.referrer_id,
      isFirst ? REWARDS_REFERRAL_CONVERSION_POINTS : 0,
      commission,
    );
  } catch (e: any) {
    console.warn('rewardsAccrueForPayment failed:', e?.message);
  }
}

export function registerExtraRoutes(
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

  async function getGroupTier(groupId: string): Promise<string> {
    const { data } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('group_id', groupId)
      .maybeSingle();
    if (!data) return 'trial';
    if (data.tier === 'trial' && data.trial_ends_at && new Date(data.trial_ends_at) < new Date()) {
      return 'free';
    }
    return data.tier || 'free';
  }

  async function groupHasFeature(groupId: string, feature: string): Promise<boolean> {
    const tier = await getGroupTier(groupId);
    return (TIER_FEATURES[tier] || []).includes(feature);
  }

  function generateReferralCode(userId: string, email: string): string {
    const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
    const suffix = userId.replace(/[^0-9]/g, '').slice(-4) || '0000';
    return `${base}${suffix}`;
  }

  // ────────────────────────────────────────────────────────────
  // ANNOUNCEMENTS CRUD
  // ────────────────────────────────────────────────────────────

  app.post(`${PREFIX}/groups/:groupId/announcements`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      const user = await requireAdmin(c, groupId);

      const { title, content, urgent = false, pinned = false } = await c.req.json();
      if (!title?.trim() || !content?.trim()) return c.json({ error: 'Title and content are required' }, 400);

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      // Get author profile
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, surname, profile_picture_url')
        .eq('email', user.email)
        .maybeSingle();

      const row = {
        id,
        group_id: groupId,
        title: title.trim(),
        content: content.trim(),
        urgent: !!urgent,
        pinned: !!pinned,
        created_by: user.email,
        created_at: now,
      };
      const { error } = await supabaseAdmin.from('announcements').insert(row);
      if (error) return c.json({ error: error.message }, 500);

      logAudit(groupId, user.email, 'announcement_created', { id, title: title.trim(), urgent }).catch(console.warn);

      // Notify approved members
      const { data: members } = await supabaseAdmin
        .from('group_memberships')
        .select('user_email')
        .eq('group_id', groupId)
        .eq('status', 'approved')
        .neq('user_email', user.email);

      if (members) {
        const notifTitle = urgent ? `Urgent: ${title.trim()}` : title.trim();
        for (const m of members) {
          storeNotification(m.user_email, groupId, notifTitle, content.trim().substring(0, 120), urgent ? 'warning' : 'info').catch(console.warn);
        }
      }

      return c.json({
        announcement: {
          id, groupId, title: title.trim(), content: content.trim(),
          urgent: !!urgent, pinned: !!pinned,
          createdBy: user.email, createdAt: now,
          author: {
            fullName: profile?.full_name || '',
            surname: profile?.surname || '',
            profilePictureUrl: profile?.profile_picture_url || null,
          },
        },
      });
    } catch (err: any) { return handleError(c, err); }
  });

  app.get(`${PREFIX}/groups/:groupId/announcements`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      await requireMember(c, groupId);

      const { data, error } = await supabaseAdmin
        .from('announcements')
        .select('*')
        .eq('group_id', groupId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) return c.json({ error: error.message }, 500);

      const announcements = (data || []).map((r: any) => ({
        id: r.id,
        groupId: r.group_id,
        title: r.title,
        content: r.content,
        urgent: r.urgent,
        pinned: r.pinned,
        createdBy: r.created_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at ?? null,
      }));

      return c.json({ announcements });
    } catch (err: any) { return handleError(c, err); }
  });

  app.put(`${PREFIX}/groups/:groupId/announcements/:announcementId`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      const announcementId = c.req.param('announcementId');
      const user = await requireAdmin(c, groupId);

      const { title, content, urgent, pinned } = await c.req.json();
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (title !== undefined) updates.title = title.trim();
      if (content !== undefined) updates.content = content.trim();
      if (urgent !== undefined) updates.urgent = !!urgent;
      if (pinned !== undefined) updates.pinned = !!pinned;

      const { data, error } = await supabaseAdmin
        .from('announcements')
        .update(updates)
        .eq('id', announcementId)
        .eq('group_id', groupId)
        .select()
        .single();

      if (error) return c.json({ error: error.message }, 404);

      logAudit(groupId, user.email, 'announcement_updated', { id: announcementId }).catch(console.warn);
      return c.json({
        announcement: {
          id: data.id, groupId: data.group_id, title: data.title, content: data.content,
          urgent: data.urgent, pinned: data.pinned,
          createdBy: data.created_by, createdAt: data.created_at, updatedAt: data.updated_at,
        },
      });
    } catch (err: any) { return handleError(c, err); }
  });

  app.delete(`${PREFIX}/groups/:groupId/announcements/:announcementId`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      const announcementId = c.req.param('announcementId');
      const user = await requireAdmin(c, groupId);

      const { error } = await supabaseAdmin
        .from('announcements')
        .delete()
        .eq('id', announcementId)
        .eq('group_id', groupId);

      if (error) return c.json({ error: error.message }, 500);

      logAudit(groupId, user.email, 'announcement_deleted', { id: announcementId }).catch(console.warn);
      return c.json({ message: 'Announcement deleted' });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // NOTIFICATIONS
  // ────────────────────────────────────────────────────────────

  app.get(`${PREFIX}/notifications`, async (c: any) => {
    try {
      const user = await requireUser(c);

      const { data, error } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('user_email', user.email)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) return c.json({ error: error.message }, 500);

      const notifications = (data || []).map((r: any) => ({
        id: r.id,
        userEmail: r.user_email,
        groupId: r.group_id,
        title: r.title,
        message: r.message,
        type: r.type,
        read: r.read,
        createdAt: r.created_at,
      }));

      return c.json({ notifications });
    } catch (err: any) { return handleError(c, err); }
  });

  app.put(`${PREFIX}/notifications/:id/read`, async (c: any) => {
    try {
      const user = await requireUser(c);
      const id = c.req.param('id');

      await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_email', user.email);

      return c.json({ success: true });
    } catch (err: any) { return handleError(c, err); }
  });

  app.put(`${PREFIX}/notifications/read-all`, async (c: any) => {
    try {
      const user = await requireUser(c);

      await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('user_email', user.email)
        .eq('read', false);

      return c.json({ success: true });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // NOTIFICATION PREFERENCES
  // ────────────────────────────────────────────────────────────

  app.get(`${PREFIX}/notification-preferences`, async (c: any) => {
    try {
      const user = await requireUser(c);

      const { data } = await supabaseAdmin
        .from('notification_preferences')
        .select('*')
        .eq('user_email', user.email)
        .maybeSingle();

      return c.json({
        emailEnabled: data?.email_enabled ?? true,
        whatsappEnabled: data?.whatsapp_enabled ?? true,
        pushEnabled: data?.push_enabled ?? true,
      });
    } catch (err: any) { return handleError(c, err); }
  });

  app.put(`${PREFIX}/notification-preferences`, async (c: any) => {
    try {
      const user = await requireUser(c);
      const { emailEnabled, whatsappEnabled, pushEnabled } = await c.req.json();

      await supabaseAdmin.from('notification_preferences').upsert({
        user_email: user.email,
        email_enabled: emailEnabled ?? true,
        whatsapp_enabled: whatsappEnabled ?? true,
        push_enabled: pushEnabled ?? true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_email' });

      return c.json({ success: true });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // PAYMENT PROOFS
  // ────────────────────────────────────────────────────────────

  async function ensureProofBucket() {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (!buckets?.some((b: any) => b.name === PROOF_BUCKET)) {
      await supabaseAdmin.storage.createBucket(PROOF_BUCKET, { public: false, fileSizeLimit: 10485760 });
    }
  }

  app.post(`${PREFIX}/groups/:groupId/proofs/:linkedType/:linkedId`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      const linkedType = c.req.param('linkedType') as string;
      const linkedId = c.req.param('linkedId');

      if (!['payout', 'contribution'].includes(linkedType)) return c.json({ error: 'Invalid type' }, 400);

      const { user, membership } = await requireMember(c, groupId);

      // Verify the linked entity exists
      const table = linkedType === 'payout' ? 'payouts' : 'contributions';
      const { data: entity } = await supabaseAdmin
        .from(table)
        .select('*')
        .eq('id', linkedId)
        .eq('group_id', groupId)
        .maybeSingle();
      if (!entity) return c.json({ error: `${linkedType} not found` }, 404);

      const isAdmin = membership.role === 'admin';
      if (!isAdmin) {
        if (linkedType === 'contribution' && entity.user_email !== user.email) return c.json({ error: 'Forbidden' }, 403);
        if (linkedType === 'payout') return c.json({ error: 'Admins only for payout proofs' }, 403);
      }

      const formData = await c.req.formData();
      const file = formData.get('file') as File | null;
      if (!file) return c.json({ error: 'No file provided' }, 400);

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) return c.json({ error: 'Only JPEG, PNG, WebP, or PDF allowed' }, 400);
      if (file.size > 10 * 1024 * 1024) return c.json({ error: 'File must be under 10 MB' }, 400);

      const referenceNumber = formData.get('referenceNumber')?.toString() || null;
      const notes = formData.get('notes')?.toString() || null;

      await ensureProofBucket();

      // Delete old proof file if exists
      const { data: oldProof } = await supabaseAdmin
        .from('payment_proofs')
        .select('file_path')
        .eq('group_id', groupId)
        .eq('linked_id', linkedId)
        .maybeSingle();
      if (oldProof?.file_path) {
        await supabaseAdmin.storage.from(PROOF_BUCKET).remove([oldProof.file_path]).catch(console.warn);
      }

      const ext = file.name.split('.').pop();
      const filePath = `proofs/${groupId}/${linkedId}-${Date.now()}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadError } = await supabaseAdmin.storage.from(PROOF_BUCKET)
        .upload(filePath, arrayBuffer, { contentType: file.type, upsert: true });
      if (uploadError) throw new Error(uploadError.message);

      const id = crypto.randomUUID();
      const proof = {
        id,
        group_id: groupId,
        linked_id: linkedId,
        linked_type: linkedType,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: user.email,
        uploaded_at: new Date().toISOString(),
        reference_number: referenceNumber,
        notes,
      };

      // Upsert by group+linked_id
      await supabaseAdmin.from('payment_proofs').upsert(proof, { onConflict: 'group_id,linked_id' });

      logAudit(groupId, user.email, 'proof_uploaded', { linkedId, linkedType, fileName: file.name }).catch(console.warn);

      return c.json({
        proof: {
          id, groupId, linkedId, linkedType,
          fileName: file.name, filePath, fileType: file.type, fileSize: file.size,
          uploadedBy: user.email, uploadedAt: proof.uploaded_at,
          referenceNumber, notes,
        },
      });
    } catch (err: any) { return handleError(c, err); }
  });

  app.get(`${PREFIX}/groups/:groupId/proofs/:linkedType/:linkedId`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      const linkedId = c.req.param('linkedId');
      await requireMember(c, groupId);

      const { data: proof } = await supabaseAdmin
        .from('payment_proofs')
        .select('*')
        .eq('group_id', groupId)
        .eq('linked_id', linkedId)
        .maybeSingle();

      if (!proof) return c.json({ proof: null });

      const { data: urlData } = await supabaseAdmin.storage.from(PROOF_BUCKET)
        .createSignedUrl(proof.file_path, 3600);

      return c.json({
        proof: {
          id: proof.id, groupId: proof.group_id, linkedId: proof.linked_id, linkedType: proof.linked_type,
          fileName: proof.file_name, filePath: proof.file_path, fileType: proof.file_type, fileSize: proof.file_size,
          uploadedBy: proof.uploaded_by, uploadedAt: proof.uploaded_at,
          referenceNumber: proof.reference_number, notes: proof.notes,
          downloadUrl: urlData?.signedUrl || null,
        },
      });
    } catch (err: any) { return handleError(c, err); }
  });

  app.delete(`${PREFIX}/groups/:groupId/proofs/:linkedType/:linkedId`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      const linkedId = c.req.param('linkedId');
      const user = await requireAdmin(c, groupId);

      const { data: proof } = await supabaseAdmin
        .from('payment_proofs')
        .select('file_path')
        .eq('group_id', groupId)
        .eq('linked_id', linkedId)
        .maybeSingle();

      if (proof?.file_path) {
        await supabaseAdmin.storage.from(PROOF_BUCKET).remove([proof.file_path]).catch(console.warn);
      }

      await supabaseAdmin
        .from('payment_proofs')
        .delete()
        .eq('group_id', groupId)
        .eq('linked_id', linkedId);

      logAudit(groupId, user.email, 'proof_deleted', { linkedId }).catch(console.warn);
      return c.json({ message: 'Proof deleted' });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // PAYSTACK PAYMENT LINK (for individual contributions)
  // ────────────────────────────────────────────────────────────

  app.post(`${PREFIX}/contributions/:id/payment-link`, async (c: any) => {
    try {
      const user = await requireUser(c);

      const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
      if (!paystackSecretKey) return c.json({ error: 'Payment not configured' }, 503);

      const contributionId = c.req.param('id');

      const { data: contribution } = await supabaseAdmin
        .from('contributions')
        .select('*')
        .eq('id', contributionId)
        .single();
      if (!contribution) return c.json({ error: 'Contribution not found' }, 404);
      if (contribution.user_email !== user.email) return c.json({ error: 'Not authorized' }, 403);

      const { data: group } = await supabaseAdmin
        .from('groups')
        .select('name')
        .eq('id', contribution.group_id)
        .maybeSingle();

      const reference = `stokpile-${contributionId}-${Date.now()}`;

      const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          amount: Math.round(Number(contribution.amount) * 100),
          currency: 'ZAR',
          reference,
          metadata: {
            contributionId,
            groupId: contribution.group_id,
            groupName: group?.name || '',
          },
          callback_url: Deno.env.get('APP_URL') || 'https://stokpilev1.vercel.app',
        }),
      });

      const paystackData = await paystackResponse.json();
      if (!paystackData.status) return c.json({ error: paystackData.message || 'Payment initialization failed' }, 400);

      return c.json({
        authorizationUrl: paystackData.data.authorization_url,
        reference: paystackData.data.reference,
      });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // BULK CONTRIBUTION MARKING
  // ────────────────────────────────────────────────────────────

  app.post(`${PREFIX}/contributions/bulk-mark`, async (c: any) => {
    try {
      const user = await requireUser(c);
      const { groupId, contributionIds, paid } = await c.req.json();

      if (!groupId || !Array.isArray(contributionIds) || typeof paid !== 'boolean') {
        return c.json({ error: 'groupId, contributionIds[], and paid are required' }, 400);
      }

      const m = await getMembership(groupId, user.email);
      if (!m || m.role !== 'admin') return c.json({ error: 'Not authorized - admin only' }, 403);

      const { data, error } = await supabaseAdmin
        .from('contributions')
        .update({ paid, updated_at: new Date().toISOString() })
        .eq('group_id', groupId)
        .in('id', contributionIds)
        .select('id');

      if (error) return c.json({ error: error.message }, 500);

      logAudit(groupId, user.email, 'bulk_mark_contributions', { count: data?.length || 0, paid, contributionIds }).catch(console.warn);
      return c.json({ success: true, updated: data?.length || 0 });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // GROUP HEALTH SCORE
  // ────────────────────────────────────────────────────────────

  app.get(`${PREFIX}/groups/:groupId/health`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      await requireMember(c, groupId);

      const { data: contributions } = await supabaseAdmin
        .from('contributions')
        .select('amount, paid, date')
        .eq('group_id', groupId);

      const { data: members } = await supabaseAdmin
        .from('group_memberships')
        .select('user_email')
        .eq('group_id', groupId)
        .eq('status', 'approved');

      const allContribs = contributions || [];
      const totalContribs = allContribs.length;
      const paidContribs = allContribs.filter((c: any) => c.paid).length;
      const paymentRate = totalContribs > 0 ? Math.round((paidContribs / totalContribs) * 100) : 0;

      // Monthly breakdown (last 6 months)
      const now = new Date();
      const months: { label: string; paid: number; total: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' });
        const monthContribs = allContribs.filter((c: any) => {
          const cd = new Date(c.date);
          return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
        });
        months.push({ label, paid: monthContribs.filter((c: any) => c.paid).length, total: monthContribs.length });
      }

      // Trend
      const recent = months.slice(3);
      const older = months.slice(0, 3);
      const recentTotal = recent.reduce((s, m) => s + m.total, 0);
      const olderTotal = older.reduce((s, m) => s + m.total, 0);
      const recentRate = recentTotal > 0 ? Math.round((recent.reduce((s, m) => s + m.paid, 0) / recentTotal) * 100) : 0;
      const olderRate = olderTotal > 0 ? Math.round((older.reduce((s, m) => s + m.paid, 0) / olderTotal) * 100) : 0;
      const trend = recentRate > olderRate + 5 ? 'up' : recentRate < olderRate - 5 ? 'down' : 'stable';

      // Streak
      let streak = 0;
      for (let i = months.length - 1; i >= 0; i--) {
        if (months[i].paid > 0) streak++;
        else break;
      }

      // Composite score (0-100)
      const score = Math.min(100, Math.round(
        paymentRate * 0.6 +
        Math.min(streak * 10, 30) * 0.3 +
        (trend === 'up' ? 10 : trend === 'stable' ? 5 : 0)
      ));

      return c.json({
        score,
        paymentRate,
        streak,
        trend,
        memberCount: (members || []).length,
        totalContributions: totalContribs,
        paidContributions: paidContribs,
        monthlyBreakdown: months,
      });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // OVERDUE MEMBERS
  // ────────────────────────────────────────────────────────────

  app.get(`${PREFIX}/groups/:groupId/overdue`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      await requireMember(c, groupId);

      const { data: group } = await supabaseAdmin
        .from('groups')
        .select('contribution_target')
        .eq('id', groupId)
        .maybeSingle();
      const target = group?.contribution_target || 0;

      const { data: approved } = await supabaseAdmin
        .from('group_memberships')
        .select('user_email')
        .eq('group_id', groupId)
        .eq('status', 'approved');

      const { data: allContribs } = await supabaseAdmin
        .from('contributions')
        .select('user_email, amount, paid')
        .eq('group_id', groupId);

      // Get profiles for names
      const emails = (approved || []).map((m: any) => m.user_email);
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name, surname')
        .in('email', emails.length > 0 ? emails : ['__none__']);

      const profileMap: Record<string, any> = {};
      for (const p of (profiles || [])) profileMap[p.email] = p;

      const result = (approved || []).map((m: any) => {
        const memberContribs = (allContribs || []).filter((c: any) => c.user_email === m.user_email);
        const totalPaid = memberContribs.filter((c: any) => c.paid).reduce((s: number, c: any) => s + Number(c.amount), 0);
        const unpaidAmount = memberContribs.filter((c: any) => !c.paid).reduce((s: number, c: any) => s + Number(c.amount), 0);
        const isOverdue = target > 0 && totalPaid < target;
        const deficit = target > 0 ? Math.max(0, target - totalPaid) : 0;
        const profile = profileMap[m.user_email];
        return {
          email: m.user_email,
          fullName: profile?.full_name || 'Unknown',
          surname: profile?.surname || '',
          totalPaid,
          unpaidAmount,
          contributionCount: memberContribs.length,
          isOverdue,
          deficit,
          target,
        };
      });

      return c.json({ members: result, target });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // AUDIT LOG
  // ────────────────────────────────────────────────────────────

  app.get(`${PREFIX}/groups/:groupId/audit-log`, async (c: any) => {
    try {
      const groupId = c.req.param('groupId');
      const user = await requireAdmin(c, groupId);

      if (!(await groupHasFeature(groupId, 'audit'))) {
        return c.json({ error: 'Audit log requires Pro plan or higher' }, 403);
      }

      // 90-day retention
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabaseAdmin
        .from('audit_log')
        .select('*')
        .eq('group_id', groupId)
        .gte('timestamp', cutoff)
        .order('timestamp', { ascending: false })
        .limit(200);

      if (error) return c.json({ error: error.message }, 500);

      const auditLog = (data || []).map((r: any) => ({
        id: r.id,
        groupId: r.group_id,
        userEmail: r.user_email,
        action: r.action,
        details: r.details,
        timestamp: r.timestamp,
      }));

      return c.json({ auditLog, retentionDays: 90 });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // MEETING RSVP
  // ────────────────────────────────────────────────────────────

  app.post(`${PREFIX}/meetings/:id/rsvp`, async (c: any) => {
    try {
      const user = await requireUser(c);
      const meetingId = c.req.param('id');
      const { response } = await c.req.json();

      if (!['yes', 'no', 'maybe'].includes(response)) {
        return c.json({ error: 'Response must be yes, no, or maybe' }, 400);
      }

      // Get meeting to find groupId
      const { data: meeting } = await supabaseAdmin
        .from('meetings')
        .select('id, group_id')
        .eq('id', meetingId)
        .single();
      if (!meeting) return c.json({ error: 'Meeting not found' }, 404);

      const m = await getMembership(meeting.group_id, user.email);
      if (!m || m.status !== 'approved') return c.json({ error: 'Not a member of this group' }, 403);

      await supabaseAdmin.from('meeting_rsvps').upsert({
        meeting_id: meetingId,
        group_id: meeting.group_id,
        user_email: user.email,
        response,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'meeting_id,user_email' });

      return c.json({ success: true, response });
    } catch (err: any) { return handleError(c, err); }
  });

  app.get(`${PREFIX}/meetings/:id/rsvps`, async (c: any) => {
    try {
      const user = await requireUser(c);
      const meetingId = c.req.param('id');

      const { data: meeting } = await supabaseAdmin
        .from('meetings')
        .select('id, group_id')
        .eq('id', meetingId)
        .single();
      if (!meeting) return c.json({ error: 'Meeting not found' }, 404);

      const m = await getMembership(meeting.group_id, user.email);
      if (!m || m.status !== 'approved') return c.json({ error: 'Not a member of this group' }, 403);

      const { data: rsvps } = await supabaseAdmin
        .from('meeting_rsvps')
        .select('*')
        .eq('meeting_id', meetingId);

      const rows = rsvps || [];
      const summary = {
        yes: rows.filter((r: any) => r.response === 'yes').length,
        no: rows.filter((r: any) => r.response === 'no').length,
        maybe: rows.filter((r: any) => r.response === 'maybe').length,
        myResponse: rows.find((r: any) => r.user_email === user.email)?.response || null,
      };

      const mapped = rows.map((r: any) => ({
        meetingId: r.meeting_id,
        groupId: r.group_id,
        userEmail: r.user_email,
        response: r.response,
        updatedAt: r.updated_at,
      }));

      return c.json({ rsvps: mapped, summary });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // SESSIONS MANAGEMENT
  // ────────────────────────────────────────────────────────────

  app.get(`${PREFIX}/sessions`, async (c: any) => {
    try {
      const user = await requireUser(c);
      const accessToken = c.req.header('Authorization')?.split(' ')[1];

      const { data } = await supabaseAdmin
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_active_at', { ascending: false });

      const currentSessionId = accessToken?.slice(-16);
      const sessions = (data || []).map((s: any) => ({
        sessionId: s.session_id,
        userId: s.user_id,
        ip: s.ip,
        userAgent: s.user_agent,
        createdAt: s.created_at,
        lastActiveAt: s.last_active_at,
        isCurrent: s.session_id === currentSessionId,
      }));

      return c.json({ sessions });
    } catch (err: any) { return handleError(c, err); }
  });

  app.delete(`${PREFIX}/sessions/:sessionId`, async (c: any) => {
    try {
      const user = await requireUser(c);
      const sessionId = c.req.param('sessionId');

      await supabaseAdmin
        .from('sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('session_id', sessionId);

      return c.json({ success: true });
    } catch (err: any) { return handleError(c, err); }
  });

  app.post(`${PREFIX}/sessions/revoke-all`, async (c: any) => {
    try {
      const user = await requireUser(c);
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const currentSessionId = accessToken?.slice(-16);

      const { data } = await supabaseAdmin
        .from('sessions')
        .delete()
        .eq('user_id', user.id)
        .neq('session_id', currentSessionId || '__none__')
        .select('session_id');

      return c.json({ success: true, revoked: data?.length || 0 });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // REFERRAL SYSTEM
  // ────────────────────────────────────────────────────────────

  app.get(`${PREFIX}/referral`, async (c: any) => {
    try {
      const user = await requireUser(c);

      const { data: existing } = await supabaseAdmin
        .from('referrals')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        return c.json({
          userId: existing.user_id,
          email: existing.email,
          code: existing.code,
          invitedCount: existing.invited_count,
          rewardedCount: existing.rewarded_count,
          createdAt: existing.created_at,
        });
      }

      // Create new referral record
      const code = generateReferralCode(user.id, user.email);
      const now = new Date().toISOString();
      const record = {
        user_id: user.id,
        email: user.email,
        code,
        invited_count: 0,
        rewarded_count: 0,
        created_at: now,
      };
      await supabaseAdmin.from('referrals').insert(record);

      return c.json({
        userId: user.id,
        email: user.email,
        code,
        invitedCount: 0,
        rewardedCount: 0,
        createdAt: now,
      });
    } catch (err: any) { return handleError(c, err); }
  });

  app.post(`${PREFIX}/referral/track`, async (c: any) => {
    try {
      const { code, newUserEmail } = await c.req.json();
      if (!code || !newUserEmail) return c.json({ error: 'Missing fields' }, 400);

      const { data: referral } = await supabaseAdmin
        .from('referrals')
        .select('*')
        .eq('code', code.toLowerCase())
        .maybeSingle();
      if (!referral) return c.json({ error: 'Invalid referral code' }, 404);

      // Track the claim
      await supabaseAdmin.from('referral_claims').insert({
        id: crypto.randomUUID(),
        code: code.toLowerCase(),
        referrer_id: referral.user_id,
        new_user_email: newUserEmail,
        claimed_at: new Date().toISOString(),
        rewarded: false,
      });

      // Increment invited count
      await supabaseAdmin
        .from('referrals')
        .update({ invited_count: (referral.invited_count || 0) + 1 })
        .eq('user_id', referral.user_id);

      return c.json({ success: true });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // SUBSCRIPTION
  // ────────────────────────────────────────────────────────────

  app.get(`${PREFIX}/groups/:groupId/subscription`, async (c: any) => {
    try {
      const user = await requireUser(c);
      const groupId = c.req.param('groupId');

      const m = await getMembership(groupId, user.email);
      if (!m) return c.json({ error: 'Not a member' }, 403);

      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('group_id', groupId)
        .maybeSingle();

      if (!sub) {
        // Provision trial
        const now = new Date();
        const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
        const newSub = {
          group_id: groupId,
          tier: 'trial',
          trial_started_at: now.toISOString(),
          trial_ends_at: trialEndsAt.toISOString(),
          updated_at: now.toISOString(),
        };
        await supabaseAdmin.from('subscriptions').insert(newSub);
        return c.json({
          groupId,
          tier: 'trial',
          trialStartedAt: now.toISOString(),
          trialEndsAt: trialEndsAt.toISOString(),
          updatedAt: now.toISOString(),
        });
      }

      // Auto-downgrade expired trials
      let tier = sub.tier;
      if (sub.tier === 'trial' && sub.trial_ends_at && new Date(sub.trial_ends_at) < new Date()) {
        tier = 'free';
        await supabaseAdmin
          .from('subscriptions')
          .update({ tier: 'free', updated_at: new Date().toISOString() })
          .eq('group_id', groupId);
      }

      return c.json({
        groupId: sub.group_id,
        tier,
        trialStartedAt: sub.trial_started_at,
        trialEndsAt: sub.trial_ends_at,
        paystackSubscriptionCode: sub.paystack_subscription_code ?? null,
        paystackCustomerCode: sub.paystack_customer_code ?? null,
        nextBillingDate: sub.next_billing_date ?? null,
        updatedAt: sub.updated_at,
      });
    } catch (err: any) { return handleError(c, err); }
  });

  app.post(`${PREFIX}/groups/:groupId/subscription`, async (c: any) => {
    try {
      const user = await requireUser(c);
      const groupId = c.req.param('groupId');

      const m = await getMembership(groupId, user.email);
      if (!m || m.role !== 'admin') return c.json({ error: 'Admin only' }, 403);

      const { tier } = await c.req.json();
      if (!VALID_TIERS.includes(tier)) return c.json({ error: 'Invalid tier' }, 400);
      if (tier === 'enterprise') return c.json({ error: 'Contact us to upgrade to Enterprise' }, 400);

      const { data: existing } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('group_id', groupId)
        .maybeSingle();

      const now = new Date().toISOString();
      const record = {
        group_id: groupId,
        tier,
        trial_started_at: existing?.trial_started_at ?? null,
        trial_ends_at: existing?.trial_ends_at ?? null,
        updated_at: now,
      };

      await supabaseAdmin.from('subscriptions').upsert(record, { onConflict: 'group_id' });

      return c.json({
        groupId,
        tier,
        trialStartedAt: record.trial_started_at,
        trialEndsAt: record.trial_ends_at,
        updatedAt: now,
      });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // BILLING (Paystack)
  // ────────────────────────────────────────────────────────────

  app.post(`${PREFIX}/billing/initialize`, async (c: any) => {
    try {
      const user = await requireUser(c);
      const { groupId, tier, email, useCredit } = await c.req.json();

      if (!['community', 'pro'].includes(tier)) return c.json({ error: 'Invalid tier for billing' }, 400);

      const m = await getMembership(groupId, user.email);
      if (!m || m.role !== 'admin') return c.json({ error: 'Admin only' }, 403);

      const tierCostZar = tier === 'community' ? 19 : 39;

      // Rewards credit fully covers this month — skip Paystack, upgrade directly
      if (useCredit) {
        const { data: sub } = await supabaseAdmin
          .from('subscriptions').select('credit_balance_zar').eq('group_id', groupId).maybeSingle();
        const credit = Number(sub?.credit_balance_zar || 0);
        if (credit >= tierCostZar) {
          const nextBilling = new Date();
          nextBilling.setMonth(nextBilling.getMonth() + 1);
          await supabaseAdmin.from('subscriptions').upsert({
            group_id: groupId,
            tier,
            credit_balance_zar: credit - tierCostZar,
            next_billing_date: nextBilling.toISOString().slice(0, 10),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'group_id' });
          return c.json({ creditOnly: true, tier, creditUsedZar: tierCostZar, creditRemainingZar: credit - tierCostZar });
        }
      }

      const planCode = PLAN_CODES[tier];
      if (!planCode) return c.json({ error: `Plan code for ${tier} not configured` }, 503);

      const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
      if (!paystackSecretKey) return c.json({ error: 'Payment not configured' }, 503);

      const appUrl = Deno.env.get('APP_URL') || 'https://stokpilev1.vercel.app';
      const reference = `sub-${groupId}-${tier}-${Date.now()}`;

      const res = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: tier === 'community' ? 1900 : 3900,
          currency: 'ZAR',
          plan: planCode,
          reference,
          callback_url: `${appUrl}?billing=success&groupId=${groupId}&tier=${tier}`,
          metadata: { groupId, tier },
        }),
      });

      const data = await res.json();
      if (!data.status) return c.json({ error: data.message || 'Payment init failed' }, 400);

      return c.json({
        authorizationUrl: data.data.authorization_url,
        reference: data.data.reference,
      });
    } catch (err: any) { return handleError(c, err); }
  });

  app.post(`${PREFIX}/billing/webhook/paystack`, async (c: any) => {
    try {
      const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
      if (!paystackSecretKey) return c.json({ error: 'Not configured' }, 503);

      // Verify HMAC signature
      const signature = c.req.header('x-paystack-signature');
      const rawBody = await c.req.text();
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw', encoder.encode(paystackSecretKey),
        { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
      );
      const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
      const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
      if (hex !== signature) return c.json({ error: 'Invalid signature' }, 401);

      const event = JSON.parse(rawBody);

      // Idempotency: skip already-processed webhook events
      const eventId = event.data?.id?.toString() || event.data?.reference || '';
      if (eventId) {
        const { data: existing } = await supabaseAdmin
          .from('processed_webhooks')
          .select('id')
          .eq('provider', 'paystack')
          .eq('event_id', eventId)
          .maybeSingle();
        if (existing) return c.json({ received: true, duplicate: true });

        await supabaseAdmin.from('processed_webhooks').insert({
          provider: 'paystack',
          event_id: eventId,
          event_type: event.event,
        }).catch(() => {}); // ignore duplicate insert race
      }

      const { groupId, tier } = event.data?.metadata || {};

      // charge.success — upgrade subscription + accrue rewards
      if (event.event === 'charge.success' && groupId && tier) {
        await supabaseAdmin.from('subscriptions').upsert({
          group_id: groupId,
          tier,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'group_id' });

        const customerEmail = event.data?.customer?.email;
        const amountKobo = Number(event.data?.amount || 0);
        const amountZar = amountKobo / 100;
        const reference = event.data?.reference || null;

        // Mark first-claim referral as rewarded (legacy counter — kept for backwards compat)
        if (customerEmail) {
          const { data: claim } = await supabaseAdmin
            .from('referral_claims')
            .select('id, referrer_id, rewarded')
            .eq('new_user_email', customerEmail)
            .maybeSingle();
          if (claim && !claim.rewarded) {
            await supabaseAdmin
              .from('referral_claims')
              .update({ rewarded: true, rewarded_at: new Date().toISOString() })
              .eq('id', claim.id);
            const { data: ref } = await supabaseAdmin
              .from('referrals')
              .select('rewarded_count')
              .eq('user_id', claim.referrer_id)
              .maybeSingle();
            if (ref) {
              await supabaseAdmin
                .from('referrals')
                .update({ rewarded_count: (ref.rewarded_count || 0) + 1 })
                .eq('user_id', claim.referrer_id);
            }
          }
        }

        // Rewards: subscription_payment + per-user points + lifetime commission
        if (customerEmail && amountZar > 0) {
          await rewardsAccrueForPayment(supabaseAdmin, {
            provider: 'paystack',
            providerEventId: eventId || reference || `${groupId}-${Date.now()}`,
            providerReference: reference,
            groupId,
            tier,
            payerEmail: customerEmail,
            amountZar,
            currency: event.data?.currency || 'ZAR',
          });
        }
      }

      // subscription.create
      if (event.event === 'subscription.create' && groupId) {
        await supabaseAdmin.from('subscriptions').upsert({
          group_id: groupId,
          paystack_subscription_code: event.data?.subscription_code ?? null,
          paystack_customer_code: event.data?.customer?.customer_code ?? null,
          next_billing_date: event.data?.next_payment_date ?? null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'group_id' });
      }

      // subscription.disable
      if (event.event === 'subscription.disable' && groupId) {
        await supabaseAdmin.from('subscriptions').upsert({
          group_id: groupId,
          tier: 'free',
          paystack_subscription_code: null,
          next_billing_date: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'group_id' });
      }

      // invoice.update
      if (event.event === 'invoice.update' && groupId) {
        const { data: existing } = await supabaseAdmin
          .from('subscriptions')
          .select('next_billing_date')
          .eq('group_id', groupId)
          .maybeSingle();
        await supabaseAdmin.from('subscriptions').upsert({
          group_id: groupId,
          next_billing_date: event.data?.next_payment_date ?? existing?.next_billing_date,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'group_id' });
      }

      return c.json({ received: true });
    } catch (err: any) { return handleError(c, err); }
  });

  app.post(`${PREFIX}/billing/cancel`, async (c: any) => {
    try {
      const user = await requireUser(c);
      const { groupId } = await c.req.json();

      const m = await getMembership(groupId, user.email);
      if (!m || m.role !== 'admin') return c.json({ error: 'Admin only' }, 403);

      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('group_id', groupId)
        .maybeSingle();
      if (!sub?.paystack_subscription_code) return c.json({ error: 'No active subscription' }, 400);

      const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
      const res = await fetch('https://api.paystack.co/subscription/disable', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: sub.paystack_subscription_code,
          token: sub.paystack_customer_code,
        }),
      });

      const data = await res.json();
      if (!data.status) return c.json({ error: data.message }, 400);

      await supabaseAdmin
        .from('subscriptions')
        .update({
          paystack_subscription_code: null,
          next_billing_date: null,
          updated_at: new Date().toISOString(),
        })
        .eq('group_id', groupId);

      return c.json({ message: 'Subscription cancelled' });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // ACCOUNT DELETION
  // ────────────────────────────────────────────────────────────

  app.delete(`${PREFIX}/account`, async (c: any) => {
    try {
      const user = await requireUser(c);
      const deletedCount: Record<string, number> = {};

      // 1. Delete groups owned by this user
      const { data: ownedGroups } = await supabaseAdmin
        .from('groups')
        .select('id')
        .eq('created_by', user.email);

      deletedCount.groups = (ownedGroups || []).length;

      for (const group of (ownedGroups || [])) {
        const gid = group.id;
        // Delete all related data for owned groups
        const tables = [
          'contributions', 'payouts', 'meetings', 'meeting_attendance', 'meeting_rsvps',
          'notes', 'votes', 'vote_responses', 'chat_messages',
          'group_memberships', 'announcements', 'payment_proofs',
          'audit_log', 'notifications', 'constitutions',
        ];
        for (const table of tables) {
          await supabaseAdmin.from(table).delete().eq('group_id', gid).catch(() => {});
        }
        await supabaseAdmin.from('subscriptions').delete().eq('group_id', gid).catch(() => {});
        await supabaseAdmin.from('groups').delete().eq('id', gid);
      }

      // 2. Remove memberships in other groups
      const { data: memberships } = await supabaseAdmin
        .from('group_memberships')
        .delete()
        .eq('user_email', user.email)
        .select('group_id');
      deletedCount.memberships = (memberships || []).length;

      // 3. Delete profile
      await supabaseAdmin.from('profiles').delete().eq('email', user.email);
      deletedCount.profile = 1;

      // 4. Delete notification prefs
      await supabaseAdmin.from('notification_preferences').delete().eq('user_email', user.email).catch(() => {});

      // 5. Delete notifications
      await supabaseAdmin.from('notifications').delete().eq('user_email', user.email).catch(() => {});

      // 6. Delete referral data
      await supabaseAdmin.from('referrals').delete().eq('user_id', user.id).catch(() => {});

      // 7. Delete auth user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error('Failed to delete auth user:', deleteError.message);
        return c.json({ error: 'Data deleted but auth account removal failed. Contact support.' }, 500);
      }

      deletedCount.authAccount = 1;
      return c.json({ message: 'Account and all data permanently deleted', deletedCount });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // GROUP ARCHIVING
  // ────────────────────────────────────────────────────────────

  app.put(`${PREFIX}/groups/:id/archive`, async (c: any) => {
    try {
      const groupId = c.req.param('id');
      const user = await requireAdmin(c, groupId);

      const { error } = await supabaseAdmin
        .from('groups')
        .update({ archived: true, archived_at: new Date().toISOString(), archived_by: user.email })
        .eq('id', groupId);
      if (error) return c.json({ error: error.message }, 500);

      logAudit(groupId, user.email, 'group_archived', {}).catch(console.warn);

      const { data: group } = await supabaseAdmin.from('groups').select('*').eq('id', groupId).single();
      return c.json({ success: true, group });
    } catch (err: any) { return handleError(c, err); }
  });

  app.put(`${PREFIX}/groups/:id/unarchive`, async (c: any) => {
    try {
      const groupId = c.req.param('id');
      const user = await requireAdmin(c, groupId);

      const { error } = await supabaseAdmin
        .from('groups')
        .update({ archived: false, archived_at: null, archived_by: null })
        .eq('id', groupId);
      if (error) return c.json({ error: error.message }, 500);

      logAudit(groupId, user.email, 'group_unarchived', {}).catch(console.warn);

      const { data: group } = await supabaseAdmin.from('groups').select('*').eq('id', groupId).single();
      return c.json({ success: true, group });
    } catch (err: any) { return handleError(c, err); }
  });

  app.get(`${PREFIX}/groups/archived`, async (c: any) => {
    try {
      const user = await requireUser(c);

      const { data: memberships } = await supabaseAdmin
        .from('group_memberships')
        .select('group_id, role')
        .eq('user_email', user.email)
        .eq('status', 'approved');

      if (!memberships || memberships.length === 0) return c.json({ groups: [] });

      const groupIds = memberships.map((m: any) => m.group_id);
      const roleMap: Record<string, string> = {};
      for (const m of memberships) roleMap[m.group_id] = m.role;

      const { data: groups } = await supabaseAdmin
        .from('groups')
        .select('*')
        .in('id', groupIds)
        .eq('archived', true);

      const result = (groups || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        description: g.description ?? '',
        contributionFrequency: g.contribution_frequency,
        isPublic: g.is_public,
        groupCode: g.group_code,
        archived: g.archived,
        archivedAt: g.archived_at,
        createdBy: g.created_by,
        createdAt: g.created_at,
        userRole: roleMap[g.id],
      }));

      return c.json({ groups: result });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // ADMIN TRANSFER
  // ────────────────────────────────────────────────────────────

  app.post(`${PREFIX}/groups/:id/transfer-admin`, async (c: any) => {
    try {
      const groupId = c.req.param('id');
      const user = await requireUser(c);
      const { newOwnerEmail } = await c.req.json();

      const { data: group } = await supabaseAdmin
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();
      if (!group) return c.json({ error: 'Group not found' }, 404);
      if (group.created_by !== user.email) return c.json({ error: 'Only the group creator can transfer ownership' }, 403);

      // Verify new owner is approved member
      const newOwnerM = await getMembership(groupId, newOwnerEmail);
      if (!newOwnerM || newOwnerM.status !== 'approved') {
        return c.json({ error: 'New owner must be an approved group member' }, 400);
      }

      // Promote new owner if needed
      if (newOwnerM.role !== 'admin') {
        await supabaseAdmin.from('group_memberships')
          .update({ role: 'admin', promoted_at: new Date().toISOString(), promoted_by: user.email })
          .eq('group_id', groupId)
          .eq('user_email', newOwnerEmail);
      }

      // Update group ownership
      const updates: Record<string, any> = {
        created_by: newOwnerEmail,
        updated_at: new Date().toISOString(),
      };
      if (group.admin1 !== newOwnerEmail) {
        updates.admin2 = group.admin1;
        updates.admin1 = newOwnerEmail;
      }
      await supabaseAdmin.from('groups').update(updates).eq('id', groupId);

      logAudit(groupId, user.email, 'admin_handover', { from: user.email, to: newOwnerEmail }).catch(console.warn);
      storeNotification(newOwnerEmail, groupId, 'You are now the group owner', `${user.email} has transferred ownership of "${group.name}" to you.`, 'success').catch(console.warn);

      return c.json({ success: true });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // PUSH SUBSCRIPTION
  // ────────────────────────────────────────────────────────────

  app.post(`${PREFIX}/push-subscription`, async (c: any) => {
    try {
      const user = await requireUser(c);
      const subscription = await c.req.json();

      await supabaseAdmin.from('push_subscriptions').upsert({
        user_email: user.email,
        subscription,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_email' });

      return c.json({ success: true });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // ERROR LOGGING
  // ────────────────────────────────────────────────────────────

  app.post(`${PREFIX}/errors/log`, async (c: any) => {
    try {
      const { message, stack, componentStack, url, timestamp } = await c.req.json();
      await supabaseAdmin.from('error_logs').insert({
        id: crypto.randomUUID(),
        message,
        stack,
        component_stack: componentStack,
        url,
        timestamp: timestamp || new Date().toISOString(),
      });
      return c.json({ success: true });
    } catch {
      return c.json({ success: false }, 500);
    }
  });

  // ────────────────────────────────────────────────────────────
  // DATA EXPORT (GDPR / Right to Access)
  // ────────────────────────────────────────────────────────────

  app.get(`${PREFIX}/me/export`, async (c: any) => {
    try {
      const user = await requireUser(c);

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      const { data: memberships } = await supabaseAdmin
        .from('group_memberships')
        .select('group_id')
        .eq('user_email', user.email);

      const groupIds = (memberships || []).map((m: any) => m.group_id);

      let groups: any[] = [];
      let contributions: any[] = [];
      let payouts: any[] = [];
      let meetings: any[] = [];

      if (groupIds.length > 0) {
        const { data: g } = await supabaseAdmin.from('groups').select('*').in('id', groupIds);
        groups = g || [];

        const { data: c } = await supabaseAdmin
          .from('contributions')
          .select('*')
          .in('group_id', groupIds)
          .eq('user_email', user.email);
        contributions = c || [];

        const { data: p } = await supabaseAdmin
          .from('payouts')
          .select('*')
          .in('group_id', groupIds)
          .eq('recipient_email', user.email);
        payouts = p || [];

        const { data: m } = await supabaseAdmin
          .from('meetings')
          .select('*')
          .in('group_id', groupIds);
        meetings = m || [];
      }

      return c.json({
        profile,
        groups,
        contributions,
        payouts,
        meetings,
        exportedAt: new Date().toISOString(),
      });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // WEEKLY DIGEST (manual trigger)
  // ────────────────────────────────────────────────────────────

  app.post(`${PREFIX}/admin/send-weekly-digest`, async (c: any) => {
    try {
      const user = await requireUser(c);
      const { groupId } = await c.req.json();

      const m = await getMembership(groupId, user.email);
      if (!m || m.role !== 'admin') return c.json({ error: 'Not authorized - admin only' }, 403);

      // Gather stats for the group
      const { data: group } = await supabaseAdmin.from('groups').select('name, contribution_target').eq('id', groupId).single();
      if (!group) return c.json({ error: 'Group not found' }, 404);

      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: recentContribs } = await supabaseAdmin
        .from('contributions')
        .select('amount, paid')
        .eq('group_id', groupId)
        .gte('created_at', cutoff);

      const { data: unpaidAll } = await supabaseAdmin
        .from('contributions')
        .select('id')
        .eq('group_id', groupId)
        .eq('paid', false);

      const { data: scheduledPayouts } = await supabaseAdmin
        .from('payouts')
        .select('id')
        .eq('group_id', groupId)
        .eq('status', 'scheduled');

      const paidThisWeek = (recentContribs || []).filter((c: any) => c.paid).reduce((s: number, c: any) => s + Number(c.amount), 0);

      // Store a notification for the admin instead of sending email (email helper not available here)
      storeNotification(
        user.email, groupId,
        `Weekly digest - ${group.name}`,
        `Paid this week: R${paidThisWeek.toFixed(2)} | Unpaid: ${(unpaidAll || []).length} | Scheduled payouts: ${(scheduledPayouts || []).length}`,
        'info'
      ).catch(console.warn);

      return c.json({ success: true });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // BANK DETAILS (for the logged-in user)
  // ────────────────────────────────────────────────────────────

  app.get(`${PREFIX}/me/bank-details`, async (c: any) => {
    try {
      const user = await requireUser(c);

      const { data } = await supabaseAdmin
        .from('bank_details')
        .select('*')
        .eq('user_email', user.email)
        .maybeSingle();

      if (!data) return c.json({ bankDetails: null });

      return c.json({
        bankDetails: {
          bankName: data.bank_name,
          accountNumber: data.account_number,
          accountHolder: data.account_holder,
          branchCode: data.branch_code,
          accountType: data.account_type,
          updatedAt: data.updated_at,
        },
      });
    } catch (err: any) { return handleError(c, err); }
  });

  app.put(`${PREFIX}/me/bank-details`, async (c: any) => {
    try {
      const user = await requireUser(c);
      const { bankName, accountNumber, accountHolder, branchCode, accountType } = await c.req.json();

      await supabaseAdmin.from('bank_details').upsert({
        user_email: user.email,
        bank_name: bankName,
        account_number: accountNumber,
        account_holder: accountHolder,
        branch_code: branchCode || null,
        account_type: accountType || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_email' });

      return c.json({ success: true });
    } catch (err: any) { return handleError(c, err); }
  });

  // ────────────────────────────────────────────────────────────
  // Reconciliation — compare Paystack transactions with contributions
  // ────────────────────────────────────────────────────────────

  app.post(`${PREFIX}/admin/reconcile`, async (c: any) => {
    try {
      const user = await requireUser(c);
      // Admin-only
      if (user.email !== (Deno.env.get('ADMIN_EMAIL') || '')) {
        return c.json({ error: 'Forbidden' }, 403);
      }

      const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
      if (!paystackSecretKey) return c.json({ error: 'Paystack not configured' }, 503);

      // Fetch last 100 Paystack transactions
      const res = await fetch('https://api.paystack.co/transaction?perPage=100&status=success', {
        headers: { Authorization: `Bearer ${paystackSecretKey}` },
      });
      const { data: transactions } = await res.json();

      // Get all paid contributions with Paystack references
      const { data: contributions } = await supabaseAdmin
        .from('contributions')
        .select('id, amount, paystack_ref, user_email, date')
        .eq('paid', true)
        .not('paystack_ref', 'is', null);

      const contribRefs = new Set((contributions || []).map((c: any) => c.paystack_ref));
      const discrepancies: any[] = [];
      let matched = 0;
      let unmatched = 0;

      for (const tx of (transactions || [])) {
        if (contribRefs.has(tx.reference)) {
          matched++;
        } else {
          unmatched++;
          discrepancies.push({
            reference: tx.reference,
            amount: tx.amount / 100,
            email: tx.customer?.email,
            date: tx.paid_at,
            issue: 'In Paystack but not matched to a contribution',
          });
        }
      }

      // Log the reconciliation
      const today = new Date().toISOString().slice(0, 10);
      await supabaseAdmin.from('reconciliation_log').insert({
        run_date: today,
        provider: 'paystack',
        total_provider: (transactions || []).length,
        total_matched: matched,
        total_unmatched: unmatched,
        discrepancies: discrepancies.slice(0, 50),
        status: 'completed',
      });

      return c.json({
        runDate: today,
        totalProvider: (transactions || []).length,
        matched,
        unmatched,
        discrepancies: discrepancies.slice(0, 20),
      });
    } catch (err: any) { return handleError(c, err); }
  });
}
