-- KV Store table for Stok-pile application data
CREATE TABLE IF NOT EXISTS kv_store_34d0b231 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);

-- Index for prefix-based queries (getByPrefix)
CREATE INDEX IF NOT EXISTS idx_kv_store_34d0b231_key_prefix ON kv_store_34d0b231 (key text_pattern_ops);

-- Disable RLS — access is controlled by the Edge Function using the service role key
ALTER TABLE kv_store_34d0b231 DISABLE ROW LEVEL SECURITY;
