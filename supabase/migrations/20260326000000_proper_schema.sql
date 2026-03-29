-- ============================================================
-- Stokpile: Proper Relational Schema
-- Replaces the single KV store table with normalized
-- PostgreSQL tables, proper indexes, and RLS policies.
--
-- Run AFTER 20251012000000_create_kv_store.sql
-- (old KV table is intentionally left in place so that
--  existing data can be migrated if needed before removal)
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES
-- Mirror of Supabase Auth user metadata stored relationally.
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  email               TEXT        PRIMARY KEY,
  full_name           TEXT,
  surname             TEXT,
  country             TEXT,
  profile_picture_url TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- GROUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS groups (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT        UNIQUE NOT NULL,
  description             TEXT        NOT NULL DEFAULT '',
  contribution_frequency  TEXT        NOT NULL DEFAULT 'monthly',
  is_public               BOOLEAN     NOT NULL DEFAULT false,
  group_code              TEXT        NOT NULL,
  payouts_allowed         BOOLEAN     NOT NULL DEFAULT true,
  -- Up to 3 admin slots (matches existing app behaviour)
  admin1                  TEXT,
  admin2                  TEXT,
  admin3                  TEXT,
  -- Invite link
  invite_token            UUID        UNIQUE,
  invite_token_created_at TIMESTAMPTZ,
  -- Audit
  created_by              TEXT        NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ,
  updated_by              TEXT
);

-- ============================================================
-- GROUP MEMBERSHIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS group_memberships (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID        NOT NULL REFERENCES groups(id)   ON DELETE CASCADE,
  user_email      TEXT        NOT NULL REFERENCES profiles(email) ON DELETE CASCADE,
  role            TEXT        NOT NULL DEFAULT 'member'
                              CHECK (role IN ('admin', 'member')),
  status          TEXT        NOT NULL DEFAULT 'approved'
                              CHECK (status IN ('pending', 'approved', 'inactive')),
  -- Timeline fields
  joined_at       TIMESTAMPTZ DEFAULT now(),
  requested_at    TIMESTAMPTZ,
  approved_at     TIMESTAMPTZ,
  approved_by     TEXT,
  deactivated_at  TIMESTAMPTZ,
  deactivated_by  TEXT,
  reactivated_at  TIMESTAMPTZ,
  reactivated_by  TEXT,
  promoted_at     TIMESTAMPTZ,
  promoted_by     TEXT,
  demoted_at      TIMESTAMPTZ,
  demoted_by      TEXT,
  -- Join source
  joined_via      TEXT,
  invited_by      TEXT,
  UNIQUE (group_id, user_email)
);

-- ============================================================
-- CONTRIBUTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS contributions (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID          NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_email  TEXT          NOT NULL,
  amount      NUMERIC(14,2) NOT NULL,
  date        DATE          NOT NULL DEFAULT CURRENT_DATE,
  paid        BOOLEAN       NOT NULL DEFAULT false,
  created_by  TEXT          NOT NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ
);

-- ============================================================
-- PAYOUTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payouts (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id         UUID          NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  recipient_email  TEXT          NOT NULL,
  amount           NUMERIC(14,2) NOT NULL,
  scheduled_date   DATE,
  status           TEXT          NOT NULL DEFAULT 'scheduled'
                                 CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_by       TEXT          NOT NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  completed_at     TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ
);

-- ============================================================
-- MEETINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS meetings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  date        DATE        NOT NULL,
  time        TEXT,
  venue       TEXT,
  agenda      TEXT,
  created_by  TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ,
  updated_by  TEXT
);

-- ============================================================
-- MEETING ATTENDANCE
-- Replaces the JSONB `attendance` object on each meeting row.
-- ============================================================
CREATE TABLE IF NOT EXISTS meeting_attendance (
  meeting_id  UUID     NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_email  TEXT     NOT NULL,
  attended    BOOLEAN  NOT NULL DEFAULT false,
  PRIMARY KEY (meeting_id, user_email)
);

-- ============================================================
-- NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID        NOT NULL REFERENCES groups(id)    ON DELETE CASCADE,
  meeting_id  UUID        REFERENCES meetings(id) ON DELETE SET NULL,
  title       TEXT        NOT NULL,
  content     TEXT,
  created_by  TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- VOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS votes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID        NOT NULL REFERENCES groups(id)    ON DELETE CASCADE,
  meeting_id  UUID        REFERENCES meetings(id) ON DELETE SET NULL,
  question    TEXT        NOT NULL,
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_by  TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- VOTE RESPONSES
-- Replaces yesVotes[] / noVotes[] arrays stored in JSONB.
-- ============================================================
CREATE TABLE IF NOT EXISTS vote_responses (
  vote_id     UUID        NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
  user_email  TEXT        NOT NULL,
  response    TEXT        NOT NULL CHECK (response IN ('yes', 'no')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (vote_id, user_email)
);

-- ============================================================
-- CHAT MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID        NOT NULL REFERENCES groups(id)    ON DELETE CASCADE,
  meeting_id  UUID        REFERENCES meetings(id) ON DELETE SET NULL,
  user_email  TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INVITATIONS  (admin → specific user)
-- ============================================================
CREATE TABLE IF NOT EXISTS invitations (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id       UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  invited_email  TEXT        NOT NULL,
  invited_by     TEXT        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at    TIMESTAMPTZ,
  declined_at    TIMESTAMPTZ,
  UNIQUE (group_id, invited_email)
);

-- ============================================================
-- CONSTITUTIONS  (one document per group)
-- ============================================================
CREATE TABLE IF NOT EXISTS constitutions (
  group_id     UUID        PRIMARY KEY REFERENCES groups(id) ON DELETE CASCADE,
  file_name    TEXT        NOT NULL,
  file_path    TEXT        NOT NULL,
  file_type    TEXT,
  file_size    INTEGER,
  uploaded_by  TEXT        NOT NULL,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CONTRIBUTION ADJUSTMENTS  (admin override per group)
-- ============================================================
CREATE TABLE IF NOT EXISTS contribution_adjustments (
  group_id    UUID          PRIMARY KEY REFERENCES groups(id) ON DELETE CASCADE,
  amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  updated_by  TEXT          NOT NULL,
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ============================================================
-- SELECTED GROUPS  (UI preference — last group a user viewed)
-- ============================================================
CREATE TABLE IF NOT EXISTS selected_groups (
  user_email  TEXT  PRIMARY KEY REFERENCES profiles(email) ON DELETE CASCADE,
  group_id    UUID  REFERENCES groups(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PASSWORD RESET CODES
-- ============================================================
CREATE TABLE IF NOT EXISTS password_reset_codes (
  email       TEXT        PRIMARY KEY,
  code        TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- FOREIGN KEYS FOR SUPABASE NESTED QUERIES
-- PostgREST uses FK metadata to resolve nested selects like
-- .select('*, profiles(...)').  Without these constraints the
-- implicit joins in the edge function will not work.
-- ============================================================

-- contributions.user_email → profiles.email
ALTER TABLE contributions
  ADD CONSTRAINT contributions_user_email_fkey
  FOREIGN KEY (user_email) REFERENCES profiles(email) ON DELETE RESTRICT;

-- payouts.recipient_email → profiles.email
-- Name matches the hint used in the edge function:
--   profiles!payouts_recipient_email_fkey(...)
ALTER TABLE payouts
  ADD CONSTRAINT payouts_recipient_email_fkey
  FOREIGN KEY (recipient_email) REFERENCES profiles(email) ON DELETE RESTRICT;

-- notes.created_by → profiles.email
ALTER TABLE notes
  ADD CONSTRAINT notes_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(email) ON DELETE RESTRICT;

-- chat_messages.user_email → profiles.email
ALTER TABLE chat_messages
  ADD CONSTRAINT chat_messages_user_email_fkey
  FOREIGN KEY (user_email) REFERENCES profiles(email) ON DELETE RESTRICT;

-- invitations.invited_by → profiles.email
-- Name matches the hint used in the edge function:
--   profiles!invitations_invited_by_fkey(...)
ALTER TABLE invitations
  ADD CONSTRAINT invitations_invited_by_fkey
  FOREIGN KEY (invited_by) REFERENCES profiles(email) ON DELETE RESTRICT;

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- group_memberships
CREATE INDEX IF NOT EXISTS idx_gm_user_email
  ON group_memberships(user_email);
CREATE INDEX IF NOT EXISTS idx_gm_group_id
  ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_gm_group_status
  ON group_memberships(group_id, status);

-- contributions
CREATE INDEX IF NOT EXISTS idx_contributions_group
  ON contributions(group_id);
CREATE INDEX IF NOT EXISTS idx_contributions_user
  ON contributions(group_id, user_email);
CREATE INDEX IF NOT EXISTS idx_contributions_date
  ON contributions(group_id, date DESC);

-- payouts
CREATE INDEX IF NOT EXISTS idx_payouts_group
  ON payouts(group_id);
CREATE INDEX IF NOT EXISTS idx_payouts_recipient
  ON payouts(group_id, recipient_email);

-- meetings
CREATE INDEX IF NOT EXISTS idx_meetings_group
  ON meetings(group_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date
  ON meetings(group_id, date, time);

-- meeting_attendance
CREATE INDEX IF NOT EXISTS idx_attendance_meeting
  ON meeting_attendance(meeting_id);

-- notes
CREATE INDEX IF NOT EXISTS idx_notes_group
  ON notes(group_id);
CREATE INDEX IF NOT EXISTS idx_notes_meeting
  ON notes(meeting_id);

-- votes
CREATE INDEX IF NOT EXISTS idx_votes_group
  ON votes(group_id);
CREATE INDEX IF NOT EXISTS idx_votes_meeting
  ON votes(meeting_id);

-- vote_responses
CREATE INDEX IF NOT EXISTS idx_vote_responses_vote
  ON vote_responses(vote_id);

-- chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_group
  ON chat_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_created
  ON chat_messages(group_id, created_at ASC);

-- invitations
CREATE INDEX IF NOT EXISTS idx_invitations_invited
  ON invitations(invited_email, status);
CREATE INDEX IF NOT EXISTS idx_invitations_group
  ON invitations(group_id);

-- groups
CREATE INDEX IF NOT EXISTS idx_groups_invite_token
  ON groups(invite_token);
CREATE INDEX IF NOT EXISTS idx_groups_is_public
  ON groups(is_public) WHERE is_public = true;

-- password_reset_codes
CREATE INDEX IF NOT EXISTS idx_prc_expires
  ON password_reset_codes(expires_at);

-- ============================================================
-- HELPER: extract calling user's email from JWT
-- The edge function sets request.jwt.claims before every query
-- when using the anon / authenticated role.
-- ============================================================
CREATE OR REPLACE FUNCTION auth_user_email()
  RETURNS TEXT
  LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json ->> 'email',
    ''
  );
$$;

-- ============================================================
-- ROW LEVEL SECURITY
--
-- The edge function runs with the SERVICE ROLE key, which
-- bypasses RLS entirely — all authorisation is enforced in
-- application code.
--
-- These policies are a second line of defence: they prevent
-- leaking data if someone obtains the anon key and queries
-- the database directly.
-- ============================================================

ALTER TABLE profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships         ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendance        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_responses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations               ENABLE ROW LEVEL SECURITY;
ALTER TABLE constitutions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribution_adjustments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE selected_groups           ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_codes      ENABLE ROW LEVEL SECURITY;

-- ----- profiles -----
CREATE POLICY "profiles: own row only"
  ON profiles FOR ALL
  USING (email = auth_user_email());

-- ----- groups -----
-- Members (approved) can read groups they belong to; public groups are readable by anyone authenticated
CREATE POLICY "groups: member or public read"
  ON groups FOR SELECT
  USING (
    is_public = true
    OR id IN (
      SELECT group_id FROM group_memberships
      WHERE user_email = auth_user_email() AND status = 'approved'
    )
  );

-- Only admins can modify (edge function enforces this in code; policy is belt-and-suspenders)
CREATE POLICY "groups: admin write"
  ON groups FOR ALL
  USING (
    id IN (
      SELECT group_id FROM group_memberships
      WHERE user_email = auth_user_email() AND role = 'admin' AND status = 'approved'
    )
  );

-- ----- group_memberships -----
CREATE POLICY "memberships: approved members can read group memberships"
  ON group_memberships FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_memberships
      WHERE user_email = auth_user_email() AND status = 'approved'
    )
  );

-- ----- contributions -----
CREATE POLICY "contributions: approved members read"
  ON contributions FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_memberships
      WHERE user_email = auth_user_email() AND status = 'approved'
    )
  );

-- ----- payouts -----
CREATE POLICY "payouts: approved members read"
  ON payouts FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_memberships
      WHERE user_email = auth_user_email() AND status = 'approved'
    )
  );

-- ----- meetings -----
CREATE POLICY "meetings: approved members read"
  ON meetings FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_memberships
      WHERE user_email = auth_user_email() AND status = 'approved'
    )
  );

-- ----- meeting_attendance -----
CREATE POLICY "attendance: approved members read"
  ON meeting_attendance FOR SELECT
  USING (
    meeting_id IN (
      SELECT m.id FROM meetings m
      JOIN group_memberships gm ON gm.group_id = m.group_id
      WHERE gm.user_email = auth_user_email() AND gm.status = 'approved'
    )
  );

-- ----- notes -----
CREATE POLICY "notes: approved members read"
  ON notes FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_memberships
      WHERE user_email = auth_user_email() AND status = 'approved'
    )
  );

-- ----- votes -----
CREATE POLICY "votes: approved members read"
  ON votes FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_memberships
      WHERE user_email = auth_user_email() AND status = 'approved'
    )
  );

-- ----- vote_responses -----
CREATE POLICY "vote_responses: approved members read"
  ON vote_responses FOR SELECT
  USING (
    vote_id IN (
      SELECT v.id FROM votes v
      JOIN group_memberships gm ON gm.group_id = v.group_id
      WHERE gm.user_email = auth_user_email() AND gm.status = 'approved'
    )
  );

-- ----- chat_messages -----
CREATE POLICY "chat: approved members read"
  ON chat_messages FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_memberships
      WHERE user_email = auth_user_email() AND status = 'approved'
    )
  );

-- ----- invitations -----
CREATE POLICY "invitations: invited user reads own"
  ON invitations FOR SELECT
  USING (invited_email = auth_user_email());

-- ----- constitutions -----
CREATE POLICY "constitutions: approved members read"
  ON constitutions FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_memberships
      WHERE user_email = auth_user_email() AND status = 'approved'
    )
  );

-- ----- contribution_adjustments -----
CREATE POLICY "adjustments: approved members read"
  ON contribution_adjustments FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_memberships
      WHERE user_email = auth_user_email() AND status = 'approved'
    )
  );

-- ----- selected_groups -----
CREATE POLICY "selected_groups: own row only"
  ON selected_groups FOR ALL
  USING (user_email = auth_user_email());

-- ----- password_reset_codes -----
-- Never directly accessible via API; edge function uses service role
CREATE POLICY "password_reset: no direct access"
  ON password_reset_codes FOR ALL
  USING (false);
