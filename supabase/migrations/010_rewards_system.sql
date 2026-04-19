-- Rewards / lifetime loyalty program
-- credit-only payouts, no point expiry, commissions tracked per subscription_payment

-- 1. Per-payment subscription record (new — was missing)
-- Source of truth for lifetime referral commissions.
CREATE TABLE IF NOT EXISTS subscription_payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id            uuid REFERENCES groups(id) ON DELETE SET NULL,
  payer_email         text NOT NULL,
  payer_user_id       text,
  tier                text NOT NULL,
  amount_zar          numeric NOT NULL,
  currency            text DEFAULT 'ZAR',
  provider            text NOT NULL CHECK (provider IN ('paystack', 'flutterwave')),
  provider_event_id   text NOT NULL,
  provider_reference  text,
  paid_at             timestamptz DEFAULT now(),
  UNIQUE(provider, provider_event_id)
);
CREATE INDEX IF NOT EXISTS idx_sub_payments_payer ON subscription_payments(payer_email);
CREATE INDEX IF NOT EXISTS idx_sub_payments_group ON subscription_payments(group_id);

-- 2. Rewards account — one per user
CREATE TABLE IF NOT EXISTS rewards_accounts (
  user_id               text PRIMARY KEY,
  email                 text UNIQUE NOT NULL,
  tier                  text NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  lifetime_points       integer NOT NULL DEFAULT 0,
  available_points      integer NOT NULL DEFAULT 0,
  lifetime_earnings_zar numeric NOT NULL DEFAULT 0,
  pending_earnings_zar  numeric NOT NULL DEFAULT 0,
  credited_zar          numeric NOT NULL DEFAULT 0, -- total redeemed to subscription credit
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- 3. Ledger — append-only event log
CREATE TABLE IF NOT EXISTS rewards_ledger (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text NOT NULL,
  event_type    text NOT NULL CHECK (event_type IN (
    'referral_commission', 'subscription_month', 'streak_bonus',
    'milestone', 'contribution_on_time', 'group_created',
    'treasurer_cycle', 'redemption', 'adjustment'
  )),
  points_delta  integer NOT NULL DEFAULT 0,
  zar_delta     numeric NOT NULL DEFAULT 0,
  source_id     text,
  metadata      jsonb DEFAULT '{}'::jsonb,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rewards_ledger_user ON rewards_ledger(user_id, created_at DESC);

-- 4. Lifetime referral commissions — one row per subscription_payment×referrer
CREATE TABLE IF NOT EXISTS rewards_referral_commissions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id               text NOT NULL,
  referred_user_email       text NOT NULL,
  subscription_payment_id   uuid NOT NULL REFERENCES subscription_payments(id) ON DELETE CASCADE,
  gross_amount_zar          numeric NOT NULL,
  commission_rate           numeric NOT NULL,
  commission_amount_zar     numeric NOT NULL,
  month                     date NOT NULL,
  paid_out                  boolean DEFAULT false,
  paid_out_at               timestamptz,
  created_at                timestamptz DEFAULT now(),
  UNIQUE(subscription_payment_id)
);
CREATE INDEX IF NOT EXISTS idx_commissions_referrer ON rewards_referral_commissions(referrer_id, month DESC);

-- 5. Redemptions — points → subscription credit
CREATE TABLE IF NOT EXISTS rewards_redemptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text NOT NULL,
  points_cost   integer NOT NULL,
  credit_zar    numeric NOT NULL,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'cancelled')),
  applied_to_group_id uuid REFERENCES groups(id) ON DELETE SET NULL,
  applied_at    timestamptz,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_redemptions_user ON rewards_redemptions(user_id, created_at DESC);

-- 6. Tier + commission rate lookup function
CREATE OR REPLACE FUNCTION rewards_tier_for_points(p integer)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p >= 10000 THEN 'platinum'
    WHEN p >= 2000  THEN 'gold'
    WHEN p >= 500   THEN 'silver'
    ELSE 'bronze'
  END;
$$;

CREATE OR REPLACE FUNCTION rewards_commission_rate(tier text)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE tier
    WHEN 'platinum' THEN 0.22
    WHEN 'gold'     THEN 0.20
    WHEN 'silver'   THEN 0.18
    ELSE                 0.15
  END;
$$;

-- 7. Subscription credit balance (applied at next charge)
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS credit_balance_zar numeric NOT NULL DEFAULT 0;

-- 8. RLS
ALTER TABLE rewards_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards_referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own rewards account" ON rewards_accounts
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users read own ledger" ON rewards_ledger
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users read own commissions" ON rewards_referral_commissions
  FOR SELECT USING (auth.uid()::text = referrer_id);

CREATE POLICY "Users read own redemptions" ON rewards_redemptions
  FOR SELECT USING (auth.uid()::text = user_id);

-- subscription_payments: users read payments they made
CREATE POLICY "Users read own subscription payments" ON subscription_payments
  FOR SELECT USING (auth.uid()::text = payer_user_id);
