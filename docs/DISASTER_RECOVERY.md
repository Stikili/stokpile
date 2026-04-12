# Disaster Recovery Plan

## Recovery Objectives

| Metric | Target |
|---|---|
| **RTO** (Recovery Time Objective) | 4 hours |
| **RPO** (Recovery Point Objective) | 1 hour (Supabase point-in-time recovery) |

## Supabase Backups

Supabase Pro plan includes:
- **Daily backups** retained for 7 days
- **Point-in-time recovery** (PITR) to any second in the last 7 days
- **Logical backups** via `pg_dump`

### How to restore

1. **Dashboard**: Supabase → Project → Database → Backups → Pick a date → Restore
2. **CLI**: `supabase db restore --project-ref nehlggwkrizljansmwlu --time "2026-04-12T10:00:00Z"`

### Monthly restore drill

**Do this once a month** to verify backups actually work:

1. Create a temporary Supabase project (free tier)
2. Export from production: Dashboard → Database → Backups → Download
3. Import into temp project: SQL Editor → paste the dump
4. Run a few SELECT queries to verify data integrity:
   ```sql
   SELECT count(*) FROM groups;
   SELECT count(*) FROM contributions;
   SELECT count(*) FROM payouts WHERE status = 'completed';
   ```
5. Delete the temp project
6. Record the date and result in this file

### Drill log

| Date | Result | Notes |
|---|---|---|
| _Run your first drill and record here_ | | |

## Edge Function recovery

Edge Functions are stateless — recovery = redeploy from git:

```bash
npx supabase functions deploy make-server-34d0b231 --no-verify-jwt
```

Source of truth: `supabase/functions/make-server-34d0b231/` in the git repo.

## Frontend recovery

Frontend is deployed on Vercel. Recovery = push to main (auto-deploys).
Previous deployments are available in Vercel → Deployments → roll back to any prior build.

## Data loss scenarios

| Scenario | Recovery |
|---|---|
| Accidental table drop | PITR to the second before the drop |
| Corrupted data (bad migration) | PITR + rerun corrected migration |
| Supabase outage | Wait for Supabase status (status.supabase.com). App shows "offline" banner. |
| Vercel outage | App is down but data is safe. Wait for Vercel status. |
| Edge Function crash | Redeploy from git. Auto-recovers on next request. |
| Deleted all user data via admin | PITR. User data is in the `profiles` + `group_memberships` tables. |

## Contacts

| Role | Contact |
|---|---|
| Supabase support | support@supabase.io |
| Vercel support | support@vercel.com |
| App admin | admin@siti-group-ltd.com |
