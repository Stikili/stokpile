-- ═══════════════════════════════════════════════════════════════════════════
-- Materialized views for expensive computed data
-- Refreshed daily via pg_cron — queries become O(1) instead of O(n)
-- ═══════════════════════════════════════════════════════════════════════════

-- Leaderboard: total paid + streak per member per group
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_leaderboard AS
SELECT
  c.group_id,
  c.user_email,
  SUM(c.amount) FILTER (WHERE c.paid = true) AS total_paid,
  COUNT(*) FILTER (WHERE c.paid = true) AS paid_count,
  MAX(c.date) FILTER (WHERE c.paid = true) AS last_paid_date
FROM contributions c
GROUP BY c.group_id, c.user_email;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_leaderboard
  ON mv_leaderboard (group_id, user_email);

-- Group health: payment rate, total in, total out per group
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_group_health AS
SELECT
  g.id AS group_id,
  COALESCE(contrib.total_in, 0) AS total_in,
  COALESCE(contrib.paid_count, 0) AS paid_contributions,
  COALESCE(contrib.total_count, 0) AS total_contributions,
  COALESCE(payout.total_out, 0) AS total_out,
  COALESCE(payout.completed_count, 0) AS completed_payouts,
  COALESCE(mem.member_count, 0) AS member_count,
  CASE
    WHEN COALESCE(contrib.total_count, 0) = 0 THEN 0
    ELSE ROUND(COALESCE(contrib.paid_count, 0)::numeric / contrib.total_count * 100)
  END AS payment_rate
FROM groups g
LEFT JOIN (
  SELECT group_id,
    SUM(amount) FILTER (WHERE paid = true) AS total_in,
    COUNT(*) FILTER (WHERE paid = true) AS paid_count,
    COUNT(*) AS total_count
  FROM contributions
  GROUP BY group_id
) contrib ON contrib.group_id = g.id
LEFT JOIN (
  SELECT group_id,
    SUM(amount) FILTER (WHERE status = 'completed') AS total_out,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_count
  FROM payouts
  GROUP BY group_id
) payout ON payout.group_id = g.id
LEFT JOIN (
  SELECT group_id, COUNT(*) AS member_count
  FROM group_memberships
  WHERE status = 'approved'
  GROUP BY group_id
) mem ON mem.group_id = g.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_group_health
  ON mv_group_health (group_id);

-- Refresh both views daily at 2am UTC
-- (requires pg_cron extension enabled)
SELECT cron.schedule(
  'refresh-leaderboard',
  '0 2 * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_leaderboard$$
);

SELECT cron.schedule(
  'refresh-group-health',
  '5 2 * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_group_health$$
);
