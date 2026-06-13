-- Pilo cohort-cache nightly populator.
-- Computes anonymised per-group metrics, buckets by (type, member-count band),
-- writes percentiles to pilo_cohort_cache so the get_cohort_benchmark tool
-- can answer "is our group typical?" without per-call aggregation.
--
-- K-anonymity: cells with fewer than 5 groups are skipped so Pilo never
-- quotes near-identifiable numbers. Threshold is configurable via the
-- function's parameter.

-- ────────────────────────────────────────────────────────────
-- Helper: member-count band for a group of N approved+managed members
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION pilo_member_count_band(n bigint)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN n < 10  THEN 'lt_10'
    WHEN n < 30  THEN '10_29'
    WHEN n < 100 THEN '30_99'
    ELSE              'gte_100'
  END;
$$;

-- ────────────────────────────────────────────────────────────
-- Main refresh function. Truncate + insert pattern so the table always
-- reflects the latest cohort math, not a stale layer.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION pilo_refresh_cohort_cache(min_sample_size integer DEFAULT 5)
RETURNS TABLE(group_type text, member_count_band text, metric text, sample_size integer, median numeric)
LANGUAGE plpgsql
AS $$
DECLARE
  six_months_ago    date := (now() - interval '6 months')::date;
  twelve_months_ago timestamptz := now() - interval '12 months';
BEGIN
  -- Per-group metrics computed once, reused for three aggregations
  CREATE TEMP TABLE per_group ON COMMIT DROP AS
  WITH base AS (
    SELECT
      g.id AS group_id,
      COALESCE(g.group_type, 'rotating') AS group_type,
      (SELECT COUNT(*) FROM group_memberships m
        WHERE m.group_id = g.id
          AND m.status IN ('approved', 'managed')) AS member_count
    FROM groups g
  ),
  on_time AS (
    SELECT
      b.group_id,
      CASE WHEN b.member_count > 0 THEN
        LEAST(100,
          (SELECT COUNT(*)::numeric FROM contributions c
            WHERE c.group_id = b.group_id
              AND c.date >= six_months_ago
              AND c.paid = true)
          / (b.member_count * 6) * 100
        )
      END AS on_time_rate_pct
    FROM base b
  ),
  avg_contrib AS (
    SELECT
      b.group_id,
      AVG(c.amount)::numeric AS avg_contribution_zar
    FROM base b
    JOIN contributions c ON c.group_id = b.group_id
    WHERE c.paid = true
      AND c.date >= six_months_ago
    GROUP BY b.group_id
  ),
  retention AS (
    SELECT
      b.group_id,
      CASE
        WHEN (SELECT COUNT(*) FROM group_memberships m
               WHERE m.group_id = b.group_id
                 AND m.joined_at <= twelve_months_ago) > 0
        THEN
          (SELECT COUNT(*) FROM group_memberships m
            WHERE m.group_id = b.group_id
              AND m.status IN ('approved', 'managed')
              AND m.joined_at <= twelve_months_ago)::numeric
          / (SELECT COUNT(*) FROM group_memberships m
              WHERE m.group_id = b.group_id
                AND m.joined_at <= twelve_months_ago)
          * 100
        ELSE NULL  -- exclude groups with no 12-mo members from retention stats
      END AS retention_pct
    FROM base b
  )
  SELECT
    b.group_type,
    pilo_member_count_band(b.member_count) AS band,
    ot.on_time_rate_pct,
    ac.avg_contribution_zar,
    r.retention_pct
  FROM base b
  LEFT JOIN on_time     ot ON ot.group_id = b.group_id
  LEFT JOIN avg_contrib ac ON ac.group_id = b.group_id
  LEFT JOIN retention   r  ON r.group_id  = b.group_id
  WHERE b.member_count > 0;

  -- Wipe previous cache (idempotent; we always rebuild from scratch)
  DELETE FROM pilo_cohort_cache;

  -- on_time_rate
  INSERT INTO pilo_cohort_cache (group_type, member_count_band, metric, median, p25, p75, p90, sample_size, computed_at)
  SELECT pg.group_type, pg.band, 'on_time_rate',
         percentile_cont(0.5)  WITHIN GROUP (ORDER BY pg.on_time_rate_pct),
         percentile_cont(0.25) WITHIN GROUP (ORDER BY pg.on_time_rate_pct),
         percentile_cont(0.75) WITHIN GROUP (ORDER BY pg.on_time_rate_pct),
         percentile_cont(0.9)  WITHIN GROUP (ORDER BY pg.on_time_rate_pct),
         COUNT(*)::int,
         now()
  FROM per_group pg
  WHERE pg.on_time_rate_pct IS NOT NULL
  GROUP BY pg.group_type, pg.band
  HAVING COUNT(*) >= min_sample_size;

  -- avg_contribution_zar
  INSERT INTO pilo_cohort_cache (group_type, member_count_band, metric, median, p25, p75, p90, sample_size, computed_at)
  SELECT pg.group_type, pg.band, 'avg_contribution_zar',
         percentile_cont(0.5)  WITHIN GROUP (ORDER BY pg.avg_contribution_zar),
         percentile_cont(0.25) WITHIN GROUP (ORDER BY pg.avg_contribution_zar),
         percentile_cont(0.75) WITHIN GROUP (ORDER BY pg.avg_contribution_zar),
         percentile_cont(0.9)  WITHIN GROUP (ORDER BY pg.avg_contribution_zar),
         COUNT(*)::int,
         now()
  FROM per_group pg
  WHERE pg.avg_contribution_zar IS NOT NULL
  GROUP BY pg.group_type, pg.band
  HAVING COUNT(*) >= min_sample_size;

  -- retention_pct
  INSERT INTO pilo_cohort_cache (group_type, member_count_band, metric, median, p25, p75, p90, sample_size, computed_at)
  SELECT pg.group_type, pg.band, 'retention_pct',
         percentile_cont(0.5)  WITHIN GROUP (ORDER BY pg.retention_pct),
         percentile_cont(0.25) WITHIN GROUP (ORDER BY pg.retention_pct),
         percentile_cont(0.75) WITHIN GROUP (ORDER BY pg.retention_pct),
         percentile_cont(0.9)  WITHIN GROUP (ORDER BY pg.retention_pct),
         COUNT(*)::int,
         now()
  FROM per_group pg
  WHERE pg.retention_pct IS NOT NULL
  GROUP BY pg.group_type, pg.band
  HAVING COUNT(*) >= min_sample_size;

  -- Return a summary the caller can show in the SQL editor
  RETURN QUERY
  SELECT pcc.group_type, pcc.member_count_band, pcc.metric, pcc.sample_size, pcc.median
  FROM pilo_cohort_cache pcc
  ORDER BY pcc.group_type, pcc.member_count_band, pcc.metric;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- Schedule the nightly run at 02:00 UTC (idempotent — won't double-schedule)
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pilo-cohort-refresh') THEN
    PERFORM cron.schedule(
      'pilo-cohort-refresh',
      '0 2 * * *',
      $job$SELECT pilo_refresh_cohort_cache();$job$
    );
  END IF;
END $$;
