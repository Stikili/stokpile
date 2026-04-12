-- ═══════════════════════════════════════════════════════════════════════════
-- Payment idempotency + terms version tracking
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Webhook event deduplication table
-- Stores processed Paystack/Flutterwave webhook event IDs
CREATE TABLE IF NOT EXISTS processed_webhooks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        text NOT NULL,         -- 'paystack' or 'flutterwave'
  event_id        text NOT NULL,         -- provider's unique event identifier
  event_type      text NOT NULL,         -- 'charge.success', 'transfer.success', etc.
  processed_at    timestamptz DEFAULT now(),
  UNIQUE(provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_processed_webhooks_lookup
  ON processed_webhooks (provider, event_id);

-- 2. Payment idempotency keys
-- Prevents duplicate payment link creation on double-clicks
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key             text UNIQUE NOT NULL,
  response        jsonb,
  created_at      timestamptz DEFAULT now(),
  expires_at      timestamptz DEFAULT now() + interval '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key
  ON idempotency_keys (key);

-- Auto-cleanup expired idempotency keys daily
-- SELECT cron.schedule(
--   'cleanup-idempotency-keys',
--   '0 5 * * *',
--   $$DELETE FROM idempotency_keys WHERE expires_at < now()$$
-- );

-- 3. Terms version tracking
-- Records which version of Terms each user accepted and when
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_version text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

-- Also add to app_users if that table is used
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS terms_version text;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

-- 4. Reconciliation log
-- Stores results of daily Paystack ↔ contributions comparison
CREATE TABLE IF NOT EXISTS reconciliation_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date        date NOT NULL,
  provider        text NOT NULL DEFAULT 'paystack',
  total_provider  integer DEFAULT 0,   -- transactions from provider
  total_matched   integer DEFAULT 0,   -- matched to contributions
  total_unmatched integer DEFAULT 0,   -- in provider but not in DB
  total_missing   integer DEFAULT 0,   -- in DB but not in provider
  discrepancies   jsonb DEFAULT '[]',  -- detailed mismatch list
  status          text DEFAULT 'completed',
  created_at      timestamptz DEFAULT now()
);
