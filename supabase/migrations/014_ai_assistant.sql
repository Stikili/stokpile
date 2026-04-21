-- AI assistant foundation.
-- Per-user/group AI usage ledger + budget tracking + POPIA opt-in flag.

-- 1. Opt-in flag on profiles (POPIA)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_opt_in boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_opt_in_at timestamptz;

-- 2. Per-call usage ledger (append-only, audit trail for every AI call)
CREATE TABLE IF NOT EXISTS ai_usage (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL,
  user_email      text,
  group_id        uuid REFERENCES groups(id) ON DELETE SET NULL,
  task            text NOT NULL,              -- e.g. 'ask_group', 'announcement', 'penalty_advisor'
  model           text NOT NULL,              -- 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-6'
  input_tokens    integer NOT NULL DEFAULT 0,
  output_tokens   integer NOT NULL DEFAULT 0,
  cached_tokens   integer NOT NULL DEFAULT 0,
  cost_zar        numeric NOT NULL DEFAULT 0,
  latency_ms      integer,
  success         boolean NOT NULL DEFAULT true,
  error           text,
  language        text,
  created_at      timestamptz DEFAULT now()
);
-- Timezone-aware date_trunc is only STABLE, so we can't index by it directly.
-- (user_id, created_at DESC) gives the optimizer everything it needs for the
-- month-filter query in ai_usage_this_month.
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created ON ai_usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_group ON ai_usage(group_id, created_at DESC);

-- 3. Per-month aggregated view for fast budget checks
CREATE OR REPLACE FUNCTION ai_usage_this_month(p_user_id text)
RETURNS TABLE(call_count bigint, total_cost_zar numeric)
LANGUAGE sql STABLE AS $$
  SELECT
    COUNT(*)::bigint              AS call_count,
    COALESCE(SUM(cost_zar), 0)::numeric AS total_cost_zar
  FROM ai_usage
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('month', now())
    AND success = true;
$$;

-- 4. Platform-wide daily cost roll-up (for your founder monitoring)
CREATE OR REPLACE VIEW ai_usage_daily AS
SELECT
  date_trunc('day', created_at)::date AS day,
  task,
  model,
  COUNT(*)                AS calls,
  SUM(input_tokens)       AS input_tokens,
  SUM(output_tokens)      AS output_tokens,
  SUM(cached_tokens)      AS cached_tokens,
  SUM(cost_zar)::numeric  AS cost_zar,
  AVG(latency_ms)::int    AS avg_latency_ms
FROM ai_usage
GROUP BY date_trunc('day', created_at)::date, task, model;

-- 5. RLS: users read own usage
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own AI usage" ON ai_usage
  FOR SELECT USING (auth.uid()::text = user_id);
