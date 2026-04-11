-- ═══════════════════════════════════════════════════════════════════════════
-- Stokpile — KV → Postgres migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Users
CREATE TABLE IF NOT EXISTS app_users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text UNIQUE NOT NULL,
  full_name       text,
  surname         text,
  country         text,
  phone           text,
  email_verified  boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

-- 2. Bank details
CREATE TABLE IF NOT EXISTS bank_details (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES app_users(id) ON DELETE CASCADE,
  bank_name       text NOT NULL,
  account_number  text NOT NULL,
  branch_code     text NOT NULL,
  account_type    text DEFAULT 'savings',
  account_holder  text,
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. Groups
CREATE TABLE IF NOT EXISTS groups (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                        text NOT NULL,
  description                 text DEFAULT '',
  group_code                  text UNIQUE NOT NULL,
  is_public                   boolean DEFAULT false,
  payouts_allowed             boolean DEFAULT true,
  group_type                  text DEFAULT 'rotating',
  contribution_frequency      text DEFAULT 'monthly',
  contribution_target         numeric,
  contribution_target_annual  numeric,
  archived                    boolean DEFAULT false,
  archived_at                 timestamptz,
  archived_by                 text,
  is_demo                     boolean DEFAULT false,
  admin1                      text,
  admin2                      text,
  admin3                      text,
  created_by                  text NOT NULL,
  created_at                  timestamptz DEFAULT now()
);

-- 4. Memberships
CREATE TABLE IF NOT EXISTS memberships (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_email      text NOT NULL,
  full_name       text,
  surname         text,
  role            text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status          text DEFAULT 'pending' CHECK (status IN ('approved', 'pending', 'inactive')),
  joined_at       timestamptz DEFAULT now(),
  joined_via      text,
  approved_at     timestamptz,
  approved_by     text,
  deactivated_at  timestamptz,
  UNIQUE(group_id, user_email)
);

-- 5. Contributions
CREATE TABLE IF NOT EXISTS contributions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_email      text NOT NULL,
  amount          numeric NOT NULL CHECK (amount > 0),
  date            date NOT NULL,
  paid            boolean DEFAULT false,
  payment_method  text,
  paystack_ref    text,
  refunded_amount numeric DEFAULT 0,
  refund_status   text,
  note            text,
  source          text,
  sms_from        text,
  created_at      timestamptz DEFAULT now()
);

-- 6. Payouts
CREATE TABLE IF NOT EXISTS payouts (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id                uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  recipient_email         text NOT NULL,
  amount                  numeric NOT NULL CHECK (amount > 0),
  status                  text DEFAULT 'scheduled'
                          CHECK (status IN ('scheduled','processing','awaiting_confirmation','completed','disputed','cancelled')),
  scheduled_date          date NOT NULL,
  completed_at            timestamptz,
  reference_number        text,
  proof_url               text,
  proof_uploaded_at       timestamptz,
  confirmed_by_recipient  boolean,
  confirmed_at            timestamptz,
  dispute_reason          text,
  payment_method          text,
  created_at              timestamptz DEFAULT now()
);

-- 7. Meetings
CREATE TABLE IF NOT EXISTS meetings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  title       text,
  date        date NOT NULL,
  time        text,
  venue       text,
  agenda      text,
  attendance  jsonb DEFAULT '{}',
  created_by  text,
  created_at  timestamptz DEFAULT now()
);

-- 8. Votes
CREATE TABLE IF NOT EXISTS votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  meeting_id  uuid REFERENCES meetings(id) ON DELETE CASCADE,
  question    text NOT NULL,
  options     jsonb DEFAULT '[]',
  results     jsonb DEFAULT '{}',
  status      text DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_by  text,
  created_at  timestamptz DEFAULT now()
);

-- 9. Notes
CREATE TABLE IF NOT EXISTS notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  meeting_id  uuid REFERENCES meetings(id) ON DELETE CASCADE,
  content     text NOT NULL,
  created_by  text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- 10. Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  meeting_id  uuid REFERENCES meetings(id) ON DELETE CASCADE,
  message     text NOT NULL,
  sender      text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- 11. Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  title       text NOT NULL,
  content     text NOT NULL,
  urgent      boolean DEFAULT false,
  pinned      boolean DEFAULT false,
  created_by  text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz
);

-- 12. Invites
CREATE TABLE IF NOT EXISTS invites (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  invited_email   text NOT NULL,
  invited_by      text NOT NULL,
  status          text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at      timestamptz DEFAULT now(),
  UNIQUE(group_id, invited_email)
);

-- 13. Join requests
CREATE TABLE IF NOT EXISTS join_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_email  text NOT NULL,
  status      text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at  timestamptz DEFAULT now(),
  UNIQUE(group_id, user_email)
);

-- 14. Constitutions
CREATE TABLE IF NOT EXISTS constitutions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL UNIQUE,
  file_name       text NOT NULL,
  file_size       integer,
  file_type       text,
  download_url    text,
  uploaded_by     text,
  uploaded_at     timestamptz DEFAULT now()
);

-- 15. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id                    uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tier                        text DEFAULT 'trial',
  trial_started_at            timestamptz,
  trial_ends_at               timestamptz,
  paystack_subscription_code  text,
  paystack_customer_code      text,
  next_billing_date           date,
  updated_at                  timestamptz DEFAULT now()
);

-- 16. Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_email  text NOT NULL,
  action      text NOT NULL,
  details     jsonb,
  timestamp   timestamptz DEFAULT now()
);

-- 17. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email  text NOT NULL,
  group_id    uuid,
  title       text NOT NULL,
  message     text,
  type        text DEFAULT 'info',
  read        boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- 18. Notification preferences
CREATE TABLE IF NOT EXISTS notification_prefs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text UNIQUE NOT NULL,
  email_enabled   boolean DEFAULT true,
  sms_enabled     boolean DEFAULT true,
  push_enabled    boolean DEFAULT true,
  updated_at      timestamptz DEFAULT now()
);

-- 19. Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      text NOT NULL,
  user_id         text NOT NULL,
  ip              text,
  user_agent      text,
  created_at      timestamptz DEFAULT now(),
  last_active_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, session_id)
);

-- 20. Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text UNIQUE NOT NULL,
  email           text,
  code            text UNIQUE NOT NULL,
  invited_count   integer DEFAULT 0,
  rewarded_count  integer DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

-- 21. Referral claims
CREATE TABLE IF NOT EXISTS referral_claims (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL,
  referrer_id     text NOT NULL,
  new_user_email  text NOT NULL,
  rewarded        boolean DEFAULT false,
  rewarded_at     timestamptz,
  claimed_at      timestamptz DEFAULT now(),
  UNIQUE(code, new_user_email)
);

-- 22. Penalty rules
CREATE TABLE IF NOT EXISTS penalty_rules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  name        text NOT NULL,
  amount      numeric NOT NULL,
  description text,
  created_by  text,
  created_at  timestamptz DEFAULT now()
);

-- 23. Penalty charges
CREATE TABLE IF NOT EXISTS penalty_charges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  rule_id         uuid REFERENCES penalty_rules(id) ON DELETE SET NULL,
  member_email    text NOT NULL,
  amount          numeric NOT NULL,
  reason          text,
  status          text DEFAULT 'outstanding' CHECK (status IN ('outstanding', 'paid', 'waived')),
  created_by      text,
  created_at      timestamptz DEFAULT now()
);

-- 24. Rotation orders
CREATE TABLE IF NOT EXISTS rotation_orders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id            uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL UNIQUE,
  slots               jsonb DEFAULT '[]',
  current_position    integer DEFAULT 0,
  current_cycle       integer DEFAULT 1,
  updated_at          timestamptz DEFAULT now()
);

-- 25. Grocery items
CREATE TABLE IF NOT EXISTS grocery_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  name            text NOT NULL,
  quantity        integer DEFAULT 1,
  unit            text DEFAULT 'items',
  estimated_cost  numeric DEFAULT 0,
  assigned_to     text,
  status          text DEFAULT 'needed' CHECK (status IN ('needed', 'sourced', 'purchased')),
  notes           text,
  added_by        text,
  created_at      timestamptz DEFAULT now()
);

-- 26. Burial beneficiaries
CREATE TABLE IF NOT EXISTS burial_beneficiaries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  member_email    text NOT NULL,
  full_name       text NOT NULL,
  relationship    text NOT NULL,
  id_number       text,
  created_at      timestamptz DEFAULT now()
);

-- 27. Burial claims
CREATE TABLE IF NOT EXISTS burial_claims (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  claimant_email  text NOT NULL,
  beneficiary_name text NOT NULL,
  description     text,
  amount          numeric,
  status          text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  created_at      timestamptz DEFAULT now()
);

-- 28. Dependents (for burial societies)
CREATE TABLE IF NOT EXISTS dependents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  member_email    text NOT NULL,
  full_name       text NOT NULL,
  relationship    text NOT NULL,
  date_of_birth   date,
  id_number       text,
  created_at      timestamptz DEFAULT now()
);

-- 29. Voice notes
CREATE TABLE IF NOT EXISTS voice_notes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id      text NOT NULL,
  group_id        uuid,
  uploaded_by     text NOT NULL,
  audio           text NOT NULL,  -- base64 data URL
  uploaded_at     timestamptz DEFAULT now()
);

-- 30. Payment proofs
CREATE TABLE IF NOT EXISTS payment_proofs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  linked_type     text NOT NULL,  -- 'contribution' or 'payout'
  linked_id       text NOT NULL,
  file_url        text,
  reference       text,
  notes           text,
  uploaded_by     text,
  uploaded_at     timestamptz DEFAULT now(),
  UNIQUE(group_id, linked_type, linked_id)
);

-- 31. RSVP
CREATE TABLE IF NOT EXISTS meeting_rsvps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  meeting_id  uuid REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,
  user_email  text NOT NULL,
  response    text CHECK (response IN ('yes', 'no', 'maybe')),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(meeting_id, user_email)
);


-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_memberships_group ON memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_memberships_email ON memberships(user_email);
CREATE INDEX IF NOT EXISTS idx_memberships_group_status ON memberships(group_id, status);

CREATE INDEX IF NOT EXISTS idx_contributions_group ON contributions(group_id);
CREATE INDEX IF NOT EXISTS idx_contributions_email ON contributions(user_email);
CREATE INDEX IF NOT EXISTS idx_contributions_group_date ON contributions(group_id, date);
CREATE INDEX IF NOT EXISTS idx_contributions_group_paid ON contributions(group_id, paid);

CREATE INDEX IF NOT EXISTS idx_payouts_group ON payouts(group_id);
CREATE INDEX IF NOT EXISTS idx_payouts_group_status ON payouts(group_id, status);
CREATE INDEX IF NOT EXISTS idx_payouts_recipient ON payouts(recipient_email);

CREATE INDEX IF NOT EXISTS idx_meetings_group ON meetings(group_id);
CREATE INDEX IF NOT EXISTS idx_meetings_group_date ON meetings(group_id, date);

CREATE INDEX IF NOT EXISTS idx_announcements_group ON announcements(group_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_group ON audit_log(group_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_ttl ON audit_log(timestamp);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_email, read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_votes_meeting ON votes(meeting_id);
CREATE INDEX IF NOT EXISTS idx_notes_meeting ON notes(meeting_id);
CREATE INDEX IF NOT EXISTS idx_chat_meeting ON chat_messages(meeting_id, created_at);

CREATE INDEX IF NOT EXISTS idx_penalty_charges_group ON penalty_charges(group_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_group ON grocery_items(group_id);
CREATE INDEX IF NOT EXISTS idx_burial_beneficiaries_group ON burial_beneficiaries(group_id);
CREATE INDEX IF NOT EXISTS idx_burial_claims_group ON burial_claims(group_id);
CREATE INDEX IF NOT EXISTS idx_dependents_group ON dependents(group_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_invites_group ON invites(group_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_group ON join_requests(group_id, status);
CREATE INDEX IF NOT EXISTS idx_rsvps_meeting ON meeting_rsvps(meeting_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- AUTO-DELETE audit log older than 90 days (run daily via pg_cron)
-- Enable pg_cron in Supabase: Dashboard → Database → Extensions → pg_cron
-- Then run this once:
-- ═══════════════════════════════════════════════════════════════════════════
-- SELECT cron.schedule(
--   'cleanup-audit-log',
--   '0 3 * * *',  -- daily at 3am UTC
--   $$DELETE FROM audit_log WHERE timestamp < now() - interval '90 days'$$
-- );
