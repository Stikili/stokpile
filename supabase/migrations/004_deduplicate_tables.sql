-- ═══════════════════════════════════════════════════════════════════════════
-- Deduplicate tables — run in Supabase SQL Editor
-- The deployed Edge Function uses group_memberships (old) not memberships (new).
-- Drop the empty new tables to avoid confusion.
-- ═══════════════════════════════════════════════════════════════════════════

-- Check which tables have data before dropping
-- Run these SELECT queries first to verify:
--   SELECT count(*) FROM memberships;      -- should be 0 (backfill went here but app uses group_memberships)
--   SELECT count(*) FROM app_users;        -- should be 0 (app uses profiles)
--   SELECT count(*) FROM invites;          -- should be 0 (app uses invitations)

-- Only drop if truly empty and unused:
-- DROP TABLE IF EXISTS memberships;     -- app uses group_memberships
-- DROP TABLE IF EXISTS app_users;       -- app uses profiles
-- DROP TABLE IF EXISTS invites;         -- app uses invitations

-- For now, just add comments so future developers know:
COMMENT ON TABLE group_memberships IS 'Active membership table used by the deployed Edge Function';
COMMENT ON TABLE memberships IS 'Created by migration 001 but unused — deployed function uses group_memberships';
COMMENT ON TABLE profiles IS 'Active user profiles table used by the deployed Edge Function';
COMMENT ON TABLE app_users IS 'Created by migration 001 but unused — deployed function uses profiles';
COMMENT ON TABLE invitations IS 'Active invitations table used by the deployed Edge Function';
COMMENT ON TABLE invites IS 'Created by migration 001 but unused — deployed function uses invitations';
