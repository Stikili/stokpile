# Migration Safety Rules

## NEVER run these against production
```bash
supabase db reset     # drops and recreates the entire database — destroys all data
supabase db reset --local  # safe (local only), but easy to forget the flag
```

## Safe commands
```bash
supabase db push      # applies pending migrations only — safe if migrations use IF NOT EXISTS
supabase functions deploy make-server-34d0b231   # deploys function code only, no db changes
```

## Before running `supabase db push` on production
1. Review every new migration file manually.
2. Confirm it uses `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
3. Confirm there are no `DROP TABLE`, `TRUNCATE`, or `DELETE FROM` statements.
4. Take a Supabase dashboard backup (Settings → Database → Backups) first.

## Primary data store
All application data lives in the `kv_store_34d0b231` table (JSONB key-value pairs).
The `profiles` table holds user metadata synced from Supabase Auth.

Losing `kv_store_34d0b231` = losing all groups, contributions, payouts, meetings, and memberships.

## Migration files (in order)
| File | What it does | Risk |
|------|-------------|------|
| `20251012000000_create_kv_store.sql` | Creates KV store table + index | None — IF NOT EXISTS |
| `20260326000000_proper_schema.sql` | Adds relational tables alongside KV store | None — all IF NOT EXISTS |
| `20260331000000_add_phone_to_profiles.sql` | Adds phone column to profiles | None — ADD COLUMN IF NOT EXISTS |
