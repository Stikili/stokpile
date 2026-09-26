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
The edge function reads and writes the relational tables (`groups`,
`group_memberships`, `contributions`, `payouts`, `meetings`, `votes`, …). The
`kv_store_34d0b231` table is legacy and no longer used by the server.
Numbered files (`001_…`) sort before timestamped ones, so `001_create_tables.sql`
defines the live shape of the core tables.

## Migration files (in order)
| File | What it does | Risk |
|------|-------------|------|
| `20251012000000_create_kv_store.sql` | Creates KV store table + index | None — IF NOT EXISTS |
| `20260326000000_proper_schema.sql` | Adds relational tables alongside KV store | None — all IF NOT EXISTS |
| `20260331000000_add_phone_to_profiles.sql` | Adds phone column to profiles | None — ADD COLUMN IF NOT EXISTS |
| `018_receipt_numbers.sql` | Per-group receipt counter; trigger numbers contributions when first paid; backfills existing paid rows | Low — additive; backfill only fills NULL `receipt_no` |
| `019_payout_signatories.sql` | `payout_approvals` table (two-signatory release); backfills the creator's signature on scheduled payouts | Low — additive; ON CONFLICT DO NOTHING |
| `020_meeting_resolutions.sql` | `groups.quorum_percent`; vote kind (poll/resolution) and frozen closing record (tally, attendance, quorum, outcome, next step) | Low — additive; carries closed status over where the old `status` column exists |
| `021_loan_book.sql` | `groups.loan_rate_percent`; `loans`, `loan_approvals`, `loan_repayments` for chama/VSLA (group lends, two signatories release) | Low — new tables only; RLS on, service role only |
