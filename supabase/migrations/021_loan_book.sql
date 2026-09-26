-- Chama / VSLA loan book. The group lends to its own members; Stokpile only
-- keeps the record. It never sets the rate, scores a borrower or funds a loan.
--
--   requested ──(enough admin signatures)──▶ active ──(paid in full)──▶ repaid
--       └──(an admin declines)──▶ rejected
--
-- Two signatories release a loan (one when the group has a single admin),
-- and a borrower can never sign their own loan. Rules are enforced in the
-- edge function (loan_rules.ts, mirrors src/domain/loans.ts).
--
-- Safe to re-run: additive only (IF NOT EXISTS; constraints added if missing).

-- Flat interest on the amount borrowed, set by the group; NULL = not set.
ALTER TABLE groups ADD COLUMN IF NOT EXISTS loan_rate_percent numeric(5,2);

CREATE TABLE IF NOT EXISTS loans (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id       uuid          NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  borrower_email text          NOT NULL,
  principal      numeric(14,2) NOT NULL CHECK (principal > 0),
  -- The group's rate when the loan was requested; later rate changes don't touch it.
  rate_percent   numeric(5,2)  NOT NULL DEFAULT 0 CHECK (rate_percent >= 0 AND rate_percent <= 100),
  term_months    integer       NOT NULL CHECK (term_months BETWEEN 1 AND 36),
  purpose        text,
  status         text          NOT NULL DEFAULT 'requested'
                 CHECK (status IN ('requested', 'active', 'repaid', 'rejected')),
  requested_by   text          NOT NULL,
  created_at     timestamptz   NOT NULL DEFAULT now(),
  released_at    timestamptz,
  due_date       date,
  closed_at      timestamptz,
  decline_reason text
);
CREATE INDEX IF NOT EXISTS loans_group_idx ON loans (group_id, created_at DESC);

CREATE TABLE IF NOT EXISTS loan_approvals (
  loan_id        uuid        NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  approver_email text        NOT NULL,
  approved_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (loan_id, approver_email)
);

CREATE TABLE IF NOT EXISTS loan_repayments (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id     uuid          NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  amount      numeric(14,2) NOT NULL CHECK (amount > 0),
  paid_on     date          NOT NULL DEFAULT CURRENT_DATE,
  method      text,
  recorded_by text          NOT NULL,
  created_at  timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS loan_repayments_loan_idx ON loan_repayments (loan_id);

-- Only the edge function (service role) reads and writes the loan book.
ALTER TABLE loans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_approvals  ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_repayments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'groups_loan_rate_range') THEN
    ALTER TABLE groups ADD CONSTRAINT groups_loan_rate_range
      CHECK (loan_rate_percent IS NULL OR (loan_rate_percent >= 0 AND loan_rate_percent <= 100));
  END IF;
END $$;
