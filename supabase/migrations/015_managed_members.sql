-- Treasurer-solo mode — allow admins to add "managed" members by name + phone
-- without the member ever signing up. Contributions can be logged on their
-- behalf; they count toward the group's tier member cap; if they later sign
-- up with a matching email the record is promoted to 'approved'.

-- Extend the status whitelist with 'managed'
ALTER TABLE group_memberships
  DROP CONSTRAINT IF EXISTS group_memberships_status_check;
ALTER TABLE group_memberships
  ADD CONSTRAINT group_memberships_status_check
  CHECK (status IN ('approved', 'pending', 'inactive', 'managed'));

-- Some installs used the plain `memberships` table
ALTER TABLE IF EXISTS memberships
  DROP CONSTRAINT IF EXISTS memberships_status_check;
ALTER TABLE IF EXISTS memberships
  ADD CONSTRAINT memberships_status_check
  CHECK (status IN ('approved', 'pending', 'inactive', 'managed'));

-- Store the member's display info for managed rows (they won't have a profile)
ALTER TABLE group_memberships ADD COLUMN IF NOT EXISTS managed_name  text;
ALTER TABLE group_memberships ADD COLUMN IF NOT EXISTS managed_phone text;
