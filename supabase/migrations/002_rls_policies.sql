-- ═══════════════════════════════════════════════════════════════════════════
-- Row Level Security policies
-- Run AFTER 001_create_tables.sql and AFTER data backfill
-- These protect data even if the anon key is compromised
-- ═══════════════════════════════════════════════════════════════════════════

-- NOTE: Since all queries go through the Edge Function using the
-- service_role key (which bypasses RLS), these policies protect against
-- direct Supabase client access only. They're a defense-in-depth layer.

-- Helper: extract email from JWT
-- auth.jwt() ->> 'email' returns the authenticated user's email

-- ─── app_users ───────────────────────────────────────────────────────────
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
  ON app_users FOR SELECT
  USING (email = auth.jwt() ->> 'email');

CREATE POLICY "Users update own profile"
  ON app_users FOR UPDATE
  USING (email = auth.jwt() ->> 'email');

-- ─── bank_details ────────────────────────────────────────────────────────
ALTER TABLE bank_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bank details"
  ON bank_details FOR ALL
  USING (user_id = auth.uid());

-- ─── groups ──────────────────────────────────────────────────────────────
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read their groups"
  ON groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.group_id = groups.id
        AND memberships.user_email = auth.jwt() ->> 'email'
        AND memberships.status = 'approved'
    )
    OR is_public = true
  );

-- ─── memberships ─────────────────────────────────────────────────────────
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read group memberships"
  ON memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m2
      WHERE m2.group_id = memberships.group_id
        AND m2.user_email = auth.jwt() ->> 'email'
        AND m2.status = 'approved'
    )
  );

-- ─── contributions ───────────────────────────────────────────────────────
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read group contributions"
  ON contributions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.group_id = contributions.group_id
        AND memberships.user_email = auth.jwt() ->> 'email'
        AND memberships.status = 'approved'
    )
  );

-- ─── payouts ─────────────────────────────────────────────────────────────
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read group payouts"
  ON payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.group_id = payouts.group_id
        AND memberships.user_email = auth.jwt() ->> 'email'
        AND memberships.status = 'approved'
    )
  );

-- ─── meetings ────────────────────────────────────────────────────────────
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read group meetings"
  ON meetings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.group_id = meetings.group_id
        AND memberships.user_email = auth.jwt() ->> 'email'
        AND memberships.status = 'approved'
    )
  );

-- ─── announcements ───────────────────────────────────────────────────────
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read group announcements"
  ON announcements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.group_id = announcements.group_id
        AND memberships.user_email = auth.jwt() ->> 'email'
        AND memberships.status = 'approved'
    )
  );

-- ─── notifications ───────────────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON notifications FOR SELECT
  USING (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (user_email = auth.jwt() ->> 'email');

-- ─── sessions ────────────────────────────────────────────────────────────
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sessions"
  ON sessions FOR ALL
  USING (user_id = auth.uid()::text);

-- ─── audit_log ───────────────────────────────────────────────────────────
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read group audit log"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.group_id = audit_log.group_id
        AND memberships.user_email = auth.jwt() ->> 'email'
        AND memberships.role = 'admin'
    )
  );

-- ─── subscriptions ───────────────────────────────────────────────────────
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read group subscription"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.group_id = subscriptions.group_id
        AND memberships.user_email = auth.jwt() ->> 'email'
        AND memberships.status = 'approved'
    )
  );

-- ─── All remaining tables follow the same member-of-group pattern ────────
-- votes, notes, chat_messages, invites, join_requests, constitutions,
-- penalty_rules, penalty_charges, rotation_orders, grocery_items,
-- burial_beneficiaries, burial_claims, dependents, voice_notes,
-- payment_proofs, meeting_rsvps

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'votes', 'notes', 'chat_messages', 'invites', 'join_requests',
      'constitutions', 'penalty_rules', 'penalty_charges',
      'rotation_orders', 'grocery_items', 'burial_beneficiaries',
      'burial_claims', 'dependents', 'payment_proofs'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY "Members read group %1$s" ON %1$I FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM memberships
          WHERE memberships.group_id = %1$I.group_id
            AND memberships.user_email = auth.jwt() ->> ''email''
            AND memberships.status = ''approved''
        )
      )', tbl
    );
  END LOOP;
END $$;

-- voice_notes and meeting_rsvps use meeting_id, handle separately
ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_rsvps ENABLE ROW LEVEL SECURITY;

-- referrals — user reads own
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own referral" ON referrals FOR SELECT
  USING (user_id = auth.uid()::text);

ALTER TABLE referral_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Referrers read own claims" ON referral_claims FOR SELECT
  USING (referrer_id = auth.uid()::text);

ALTER TABLE notification_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own prefs" ON notification_prefs FOR ALL
  USING (user_id = auth.uid()::text);
