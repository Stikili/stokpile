-- Rewards backfill — grant existing paying subscribers an early-adopter bonus.
--
-- Every admin of a group currently on a paid tier (community/pro/enterprise)
-- gets a one-time 500-point "Founding Member" bonus, bumping them from
-- Bronze to Silver and unlocking the 18% commission rate.
--
-- Idempotent: re-running this script does NOT grant the bonus twice, because
-- it checks rewards_ledger for an existing 'milestone' entry with
-- metadata.kind = 'founding_member'.

DO $$
DECLARE
  r                     record;
  points_to_grant       int := 500;
  user_rec              record;
  existing_bonus        uuid;
  new_lifetime_points   int;
BEGIN
  FOR r IN
    SELECT DISTINCT m.user_email, au.id AS user_id
    FROM subscriptions s
    JOIN memberships m
      ON m.group_id = s.group_id
     AND m.role = 'admin'
     AND m.status = 'approved'
    JOIN profiles p
      ON p.email = m.user_email
    LEFT JOIN auth.users au
      ON au.email = m.user_email
    WHERE s.tier IN ('community', 'pro', 'enterprise')
      AND au.id IS NOT NULL
  LOOP
    -- Skip if this user already got the founding-member bonus
    SELECT id INTO existing_bonus
    FROM rewards_ledger
    WHERE user_id = r.user_id::text
      AND event_type = 'milestone'
      AND metadata ->> 'kind' = 'founding_member'
    LIMIT 1;

    IF existing_bonus IS NOT NULL THEN
      CONTINUE;
    END IF;

    -- Ensure account exists
    INSERT INTO rewards_accounts (user_id, email)
    VALUES (r.user_id::text, r.user_email)
    ON CONFLICT (user_id) DO NOTHING;

    -- Apply points + recalculate tier
    UPDATE rewards_accounts
    SET
      available_points = available_points + points_to_grant,
      lifetime_points  = lifetime_points  + points_to_grant,
      tier             = rewards_tier_for_points(lifetime_points + points_to_grant),
      updated_at       = now()
    WHERE user_id = r.user_id::text;

    -- Ledger record
    INSERT INTO rewards_ledger (user_id, event_type, points_delta, zar_delta, metadata)
    VALUES (
      r.user_id::text,
      'milestone',
      points_to_grant,
      0,
      jsonb_build_object(
        'kind',   'founding_member',
        'reason', 'Early adopter bonus — thank you for being one of the first paying Stokpile groups'
      )
    );
  END LOOP;
END $$;

-- Quick audit query — run to see what was granted:
-- SELECT ra.email, ra.tier, ra.lifetime_points
-- FROM rewards_accounts ra
-- JOIN rewards_ledger rl ON rl.user_id = ra.user_id
-- WHERE rl.event_type = 'milestone'
--   AND rl.metadata ->> 'kind' = 'founding_member';
