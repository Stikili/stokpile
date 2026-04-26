-- Pilo intelligence boosts: persistent memory + benchmark cache.

-- 1. pilo_memories — facts Pilo learns about a user that persist across
-- conversations. Pilo writes via the save_memory tool. We load the top
-- N most-recent on every Pilo call so it has continuity without bloating
-- the prompt.
CREATE TABLE IF NOT EXISTS pilo_memories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text NOT NULL,
  key         text NOT NULL,        -- short slug e.g. 'preferred_language', 'savings_goal'
  value       text NOT NULL,        -- free-form, bounded by tool input length
  category    text NOT NULL DEFAULT 'general' CHECK (category IN (
    'preference', 'goal', 'context', 'general', 'group_fact'
  )),
  group_id    uuid REFERENCES groups(id) ON DELETE CASCADE,  -- null = user-level
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, key, group_id)
);
CREATE INDEX IF NOT EXISTS idx_pilo_memories_user ON pilo_memories(user_id, updated_at DESC);

-- 2. pilo_cohort_cache — daily-refreshed anonymised aggregates so the
-- get_cohort_benchmark tool can answer "your group is in the top X%"
-- without re-aggregating on every query.
CREATE TABLE IF NOT EXISTS pilo_cohort_cache (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_type              text NOT NULL,
  member_count_band       text NOT NULL,        -- 'lt_10' | '10_29' | '30_99' | 'gte_100'
  metric                  text NOT NULL,        -- 'on_time_rate' | 'avg_contribution_zar' | 'retention_pct'
  median                  numeric NOT NULL,
  p25                     numeric NOT NULL,
  p75                     numeric NOT NULL,
  p90                     numeric NOT NULL,
  sample_size             integer NOT NULL,
  computed_at             timestamptz DEFAULT now(),
  UNIQUE(group_type, member_count_band, metric)
);
CREATE INDEX IF NOT EXISTS idx_pilo_cohort_cache_lookup
  ON pilo_cohort_cache(group_type, member_count_band, metric);

-- RLS
ALTER TABLE pilo_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own memories" ON pilo_memories
  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users write own memories" ON pilo_memories
  FOR ALL USING (auth.uid()::text = user_id);

ALTER TABLE pilo_cohort_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read cohort cache" ON pilo_cohort_cache
  FOR SELECT USING (auth.role() = 'authenticated');
