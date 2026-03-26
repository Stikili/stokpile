# Stok-pile — Deployment Guide

## Prerequisites
- Supabase account + project (free tier is fine for dev)
- Supabase CLI: `npm i -g supabase`
- Node ≥ 18 (for the frontend build)
- Deno ≥ 1.40 (for edge function local dev)

---

## 1 — Link your Supabase project

```bash
supabase login
supabase link --project-ref gccqctjwnrhxxccfawbu
```

---

## 2 — Apply the database migrations

**The schema has been rewritten from a KV store to proper relational tables.**
Two migrations must run in order:

| # | File | What it does |
|---|------|--------------|
| 1 | `20251012000000_create_kv_store.sql` | Original KV table (kept for backward compat) |
| 2 | `20260326000000_proper_schema.sql` | Full relational schema with RLS |

```bash
# Push all pending migrations to your remote project
supabase db push
```

If you want to start completely fresh (drop everything and reapply):
```bash
supabase db reset --linked
```

---

## 3 — Create Storage buckets

The buckets are auto-created by the edge function on first use, but you can
pre-create them in the Supabase dashboard:

| Bucket name | Public? | Max file size |
|---|---|---|
| `make-34d0b231-profile-pictures` | ✅ Yes | 5 MB |
| `make-34d0b231-constitutions` | ❌ No  | 10 MB |

---

## 4 — Deploy the Edge Function

```bash
supabase functions deploy make-server-34d0b231 --no-verify-jwt
```

> `--no-verify-jwt` is set because the function verifies the Supabase JWT
> internally for flexibility (anon key allowed for public routes).

### Required Edge Function secrets

Set these once per project (not committed to git):

```bash
supabase secrets set \
  SUPABASE_URL=https://gccqctjwnrhxxccfawbu.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically injected by
Supabase into every edge function — you only need to set them explicitly when
running locally.

---

## 5 — Configure the frontend

Copy `.env.example` to `.env` and fill in your project credentials:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_PROJECT_ID=gccqctjwnrhxxccfawbu
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Both values are in **Supabase Dashboard → Project Settings → API**.

---

## 6 — Build and serve the frontend

```bash
npm install
npm run build
# Serve dist/ with any static host (Vercel, Netlify, Supabase Hosting, etc.)
```

### Local dev server
```bash
npm run dev        # http://localhost:3000
```

---

## 7 — Production checklist

- [ ] **Rotate the Supabase anon key** — the old key was committed to git history.
      Go to Supabase Dashboard → Settings → API → "Reset anon key".
- [ ] **Enable email confirmation** — set `enable_confirmations = true` in
      `supabase/config.toml` and configure an SMTP provider (Resend, Postmark, etc.)
- [ ] **Remove the `resetCode` from the password-reset response** in
      `supabase/functions/make-server-34d0b231/index.ts` (search for
      `resetCode, // Remove this in production`).
- [ ] **Enable auth rate limiting** in Supabase Dashboard → Auth → Rate Limits.
- [ ] **Add CORS origin restriction** — change `app.use('*', cors())` to
      `app.use('*', cors({ origin: 'https://yourdomain.com' }))`.
- [ ] **Verify RLS policies** are active — run
      `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
      in the SQL editor; every table should show `rowsecurity = true`.
- [ ] **Set up automated backups** — Supabase Pro includes daily backups.
      For free tier, schedule a weekly `supabase db dump` via CI.
- [ ] **Add an index on `password_reset_codes.expires_at`** and set up a
      scheduled job (`pg_cron`) to delete expired rows:
      ```sql
      SELECT cron.schedule('cleanup-reset-codes', '*/15 * * * *',
        $$DELETE FROM password_reset_codes WHERE expires_at < now()$$);
      ```
- [ ] **Monitor edge function logs** — Supabase Dashboard → Edge Functions →
      Logs. Set up alerts for 5xx error rate spikes.

---

## Database schema overview

```
profiles              ← user profile data (mirrors Supabase Auth metadata)
groups                ← stokvel groups
group_memberships     ← who belongs to which group (admin/member, status)
contributions         ← member contribution records
payouts               ← payout records
meetings              ← scheduled meetings
meeting_attendance    ← per-member attendance per meeting
notes                 ← meeting/group notes
votes                 ← yes/no votes
vote_responses        ← individual vote responses (replaces yesVotes[] array)
chat_messages         ← group/meeting chat
invitations           ← admin-sent invites to specific users
constitutions         ← constitution file metadata (file in Storage)
contribution_adjustments ← admin override of expected contribution amount
selected_groups       ← user UI preference (last viewed group)
password_reset_codes  ← 6-digit codes, 15 min expiry
```

All tables have **Row Level Security enabled**.  The edge function uses the
service-role key (bypasses RLS); policies protect against direct API access
with the anon key.
