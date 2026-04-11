# Stokpile — KV to Postgres Migration Guide

## Prerequisites

- Supabase project with SQL Editor access
- Current KV data you want to preserve

## Steps

### Step 1: Create tables

1. Go to **Supabase Dashboard → SQL Editor → New Query**
2. Paste the entire contents of `001_create_tables.sql`
3. Click **Run** — creates 31 tables + indexes

### Step 2: Deploy the updated Edge Function

1. Ensure `db.ts` is in `src/supabase/functions/server/`
2. Deploy the Edge Function (it now imports `db.ts`)
3. The function dual-writes to both KV and Postgres during migration

### Step 3: Backfill existing data

**Option A — Via Edge Function endpoint (recommended)**

Add this temporary route to `index.tsx`:

```ts
import { backfillAll } from './003_backfill_from_kv.ts';
import * as kv from './kv_store.tsx';

app.post('/make-server-34d0b231/admin/backfill', async (c) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  // Only allow the app creator
  if (user.email !== 'YOUR_ADMIN_EMAIL') return c.json({ error: 'Forbidden' }, 403);
  const result = await backfillAll(kv);
  return c.json(result);
});
```

Then call it once:
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/make-server-34d0b231/admin/backfill \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Option B — Via Deno CLI**

```bash
SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your_key \
deno run --allow-env --allow-net supabase/migrations/003_backfill_from_kv.ts
```

### Step 4: Verify data

Run these in SQL Editor to confirm counts match:

```sql
SELECT 'groups' as table_name, count(*) FROM groups
UNION ALL SELECT 'memberships', count(*) FROM memberships
UNION ALL SELECT 'contributions', count(*) FROM contributions
UNION ALL SELECT 'payouts', count(*) FROM payouts
UNION ALL SELECT 'meetings', count(*) FROM meetings
UNION ALL SELECT 'announcements', count(*) FROM announcements
UNION ALL SELECT 'app_users', count(*) FROM app_users
ORDER BY table_name;
```

Compare with KV counts (check in Edge Function logs or add a count endpoint).

### Step 5: Switch reads to Postgres

Replace `kv.get()` / `kv.getByPrefix()` calls in route handlers with `db.*` calls.
This is done incrementally — one entity at a time.

### Step 6: Apply RLS policies (optional but recommended)

1. Go to **SQL Editor → New Query**
2. Paste contents of `002_rls_policies.sql`
3. Click **Run**

These policies are defense-in-depth. The Edge Function uses `service_role` which bypasses RLS, but they protect against direct client access.

### Step 7: Stop writing to KV

Once all reads come from Postgres and you've verified correctness,
remove `kv.set()` calls from route handlers. Keep the KV module
around for non-critical data (rate limiter buckets, etc).

### Step 8: Cleanup

- Remove the temporary `/admin/backfill` endpoint
- Remove unused `kv.getByPrefix()` imports
- Optionally delete KV data (it won't be read anymore)

## Rollback

At any point before Step 7, you can roll back by reverting to KV reads.
KV data is never deleted during migration — only Postgres is added.
