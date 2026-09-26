-- Meeting quorum and formal resolutions.
--
-- groups.quorum_percent: share of current members that must be present for a
-- formal resolution to bind the group (default 50%).
-- votes gain a kind ('poll' or 'resolution') and a closing record. When a
-- vote closes, the edge function freezes the tally, attendance, quorum and
-- outcome on the row, plus the agreed next step, so the minute never changes.
--
-- Safe to re-run: additive only (ADD COLUMN IF NOT EXISTS); constraints are
-- added only when missing.

ALTER TABLE groups ADD COLUMN IF NOT EXISTS quorum_percent integer NOT NULL DEFAULT 50;

-- Open/closed flag the vote routes use (older installs may lack it).
ALTER TABLE votes ADD COLUMN IF NOT EXISTS active          boolean NOT NULL DEFAULT true;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS kind            text    NOT NULL DEFAULT 'poll';
ALTER TABLE votes ADD COLUMN IF NOT EXISTS outcome         text;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS closed_at       timestamptz;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS closed_by       text;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS yes_count       integer;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS no_count        integer;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS present_count   integer;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS eligible_count  integer;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS quorum_required integer;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS next_step       text;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS next_step_owner text;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS next_step_due   date;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'groups_quorum_percent_range') THEN
    ALTER TABLE groups ADD CONSTRAINT groups_quorum_percent_range CHECK (quorum_percent BETWEEN 1 AND 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'votes_kind_values') THEN
    ALTER TABLE votes ADD CONSTRAINT votes_kind_values CHECK (kind IN ('poll', 'resolution'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'votes_outcome_values') THEN
    ALTER TABLE votes ADD CONSTRAINT votes_outcome_values
      CHECK (outcome IS NULL OR outcome IN ('passed', 'rejected', 'no_quorum'));
  END IF;
END $$;

-- Installs that tracked open/closed in a `status` column: carry closed votes
-- over to `active`. Skipped where that column doesn't exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'votes' AND column_name = 'status'
  ) THEN
    EXECUTE 'UPDATE votes SET active = false WHERE status = ''closed'' AND active IS TRUE';
  END IF;
END $$;
