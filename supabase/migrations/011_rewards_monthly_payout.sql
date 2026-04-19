-- Monthly commission payout cron.
-- On the 1st of each month at 02:00 UTC, close out the previous month:
--   • sum each referrer's unpaid commissions
--   • convert ZAR → points (1 ZAR = 100 points)
--   • update available_points, lifetime_points, tier
--   • decrement pending_earnings_zar by the converted amount
--   • mark commissions as paid_out
--   • write a ledger entry

-- Extend event_type whitelist for the close-out record
ALTER TABLE rewards_ledger DROP CONSTRAINT IF EXISTS rewards_ledger_event_type_check;
ALTER TABLE rewards_ledger ADD CONSTRAINT rewards_ledger_event_type_check
  CHECK (event_type IN (
    'referral_commission', 'subscription_month', 'streak_bonus',
    'milestone', 'contribution_on_time', 'group_created',
    'treasurer_cycle', 'redemption', 'adjustment', 'monthly_payout'
  ));

CREATE OR REPLACE FUNCTION rewards_close_month()
RETURNS TABLE(out_referrers_paid int, out_points_awarded bigint, out_zar_closed numeric)
LANGUAGE plpgsql
AS $$
DECLARE
  month_start date := date_trunc('month', now() - interval '1 month')::date;
  month_end   date := date_trunc('month', now())::date;
BEGIN
  -- Aggregate unpaid commissions per referrer for the closing month
  CREATE TEMP TABLE closing_summary ON COMMIT DROP AS
  SELECT
    referrer_id,
    SUM(commission_amount_zar) AS total_zar,
    COUNT(*)                   AS commission_count
  FROM rewards_referral_commissions
  WHERE paid_out = false
    AND month >= month_start
    AND month < month_end
  GROUP BY referrer_id;

  -- Convert ZAR → points and update each referrer's account
  UPDATE rewards_accounts a
  SET
    pending_earnings_zar = GREATEST(0, a.pending_earnings_zar - c.total_zar),
    available_points     = a.available_points + (c.total_zar * 100)::int,
    lifetime_points      = a.lifetime_points  + (c.total_zar * 100)::int,
    tier                 = rewards_tier_for_points(a.lifetime_points + (c.total_zar * 100)::int),
    updated_at           = now()
  FROM closing_summary c
  WHERE a.user_id = c.referrer_id;

  -- Ledger entries for each referrer
  INSERT INTO rewards_ledger (user_id, event_type, points_delta, zar_delta, source_id, metadata)
  SELECT
    c.referrer_id,
    'monthly_payout',
    (c.total_zar * 100)::int,
    0,
    month_start::text,
    jsonb_build_object(
      'month',       month_start,
      'commissions', c.commission_count,
      'zar',         c.total_zar
    )
  FROM closing_summary c;

  -- Mark commissions as paid out
  UPDATE rewards_referral_commissions
  SET paid_out = true, paid_out_at = now()
  WHERE paid_out = false
    AND month >= month_start
    AND month < month_end;

  RETURN QUERY
  SELECT
    COUNT(*)::int                                         AS out_referrers_paid,
    COALESCE(SUM((c.total_zar * 100)::bigint), 0)::bigint AS out_points_awarded,
    COALESCE(SUM(c.total_zar), 0)::numeric                AS out_zar_closed
  FROM closing_summary c;
END;
$$;

-- Schedule for 02:00 UTC on the 1st of every month
SELECT cron.schedule(
  'rewards-close-month',
  '0 2 1 * *',
  $$SELECT rewards_close_month()$$
);
