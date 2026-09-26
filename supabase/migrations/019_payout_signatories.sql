-- Two signatories release a payout (maker–checker).
--
-- The admin who schedules a payout signs first; a different admin must sign
-- before it can move from 'scheduled' to 'processing'. A group with one admin
-- needs one signature. Rules are enforced in the edge function
-- (payout_rules.ts); this table records who signed and when.
--
-- Safe to re-run: additive only, backfill uses ON CONFLICT DO NOTHING.

CREATE TABLE IF NOT EXISTS payout_approvals (
  payout_id       uuid        NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
  approver_email  text        NOT NULL,
  approved_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (payout_id, approver_email)
);

-- Only the edge function (service role) reads and writes signatures.
ALTER TABLE payout_approvals ENABLE ROW LEVEL SECURITY;

-- Columns the payout routes rely on; present on most installs already.
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- In-flight payouts: the scheduling admin counts as the first signature, so
-- each needs one more approval before release. Payouts already past
-- 'scheduled' are not affected.
INSERT INTO payout_approvals (payout_id, approver_email, approved_at)
SELECT id, created_by, COALESCE(created_at, now())
  FROM payouts
 WHERE status = 'scheduled' AND created_by IS NOT NULL
ON CONFLICT DO NOTHING;
