# Database Migration Guide

## Convention

All migration files live in `supabase/migrations/` and are numbered sequentially:

```
001_create_tables.sql
002_rls_policies.sql
003_backfill_from_kv.ts    (one-time, completed)
004_deduplicate_tables.sql
005_enable_pg_cron.sql
006_materialized_views.sql
```

## How to create a new migration

1. Create a new file: `supabase/migrations/007_your_change.sql`
2. Write idempotent SQL (use `IF NOT EXISTS`, `IF EXISTS`, etc.)
3. Test it on the staging Supabase project first
4. Run it on production via SQL Editor
5. Commit the file so it's tracked in git

## Rules

- **Never** modify a migration that's already been run in production
- **Always** use `IF NOT EXISTS` / `IF EXISTS` so migrations are re-runnable
- **Always** include a comment at the top explaining what the migration does
- **Never** put destructive operations (`DROP TABLE`, `DELETE`) without `IF EXISTS`
- **Test** on staging first (or a local Supabase instance)

## Running migrations

Currently manual via Supabase SQL Editor:
1. Dashboard → SQL Editor → New Query
2. Paste the migration SQL
3. Click Run
4. Verify with a SELECT query

## Future: automated migrations

When ready, use the Supabase CLI:
```bash
supabase db push          # push local migrations to remote
supabase db pull          # pull remote schema to local
supabase migration new    # create a new migration file
```

This requires `supabase link` (already done) and local Docker for diffing.
