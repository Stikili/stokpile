-- Enable pg_cron extension first (Supabase Dashboard → Database → Extensions → pg_cron)
-- Then run this:

-- Delete audit log entries older than 90 days, daily at 3am UTC
SELECT cron.schedule(
  'cleanup-audit-log',
  '0 3 * * *',
  $$DELETE FROM audit_log WHERE timestamp < now() - interval '90 days'$$
);

-- Delete expired sessions older than 30 days, daily at 4am UTC
SELECT cron.schedule(
  'cleanup-sessions',
  '0 4 * * *',
  $$DELETE FROM sessions WHERE last_active_at < now() - interval '30 days'$$
);
