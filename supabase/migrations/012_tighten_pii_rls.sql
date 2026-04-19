-- Tighten RLS on PII-bearing tables.
--
-- Posture review:
--   • profiles.phone          — already RLS "own row only" (20260326)
--   • bank_details.*          — already RLS self-only by user_id (002)
--   • dependents.id_number    — over-broadly readable by every group
--                               member via the blanket loop in 002. Narrows
--                               access to the registrant and group admins.
--
-- Runs go through supabaseAdmin (service_role bypasses RLS) so app behaviour
-- is unchanged. This is defense-in-depth against anon-key exfiltration.

-- 1. Drop the generic member-read policy on dependents (from 002's DO block)
DROP POLICY IF EXISTS "Members read group dependents" ON dependents;

-- 2. Admins of the group can read all dependents
CREATE POLICY "Admins read group dependents"
  ON dependents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.group_id = dependents.group_id
        AND m.user_email = auth.jwt() ->> 'email'
        AND m.role = 'admin'
        AND m.status = 'approved'
    )
  );

-- 3. Members can read their own dependents (the member_email they're attached to)
CREATE POLICY "Members read own dependents"
  ON dependents FOR SELECT
  USING (
    member_email = auth.jwt() ->> 'email'
  );

-- 4. Ensure profiles RLS covers INSERT/UPDATE explicitly (20260326 used FOR ALL,
--    but make it explicit so future migrations don't accidentally loosen it).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles: own row only'
  ) THEN
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "profiles: own row only"
      ON profiles FOR ALL
      USING (email = auth.jwt() ->> 'email');
  END IF;
END $$;
