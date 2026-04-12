# Staging Environment

## Setup

Vercel automatically creates **preview deployments** for every branch/PR.
This serves as your staging environment with zero extra configuration.

### How to use it

1. Create a branch: `git checkout -b feature/my-change`
2. Push it: `git push origin feature/my-change`
3. Vercel creates a preview at: `https://stokpile-<branch>-stikili.vercel.app`
4. Test there before merging to `main`

### Environment variables for preview

In Vercel Dashboard → Settings → Environment Variables:
- Set `VITE_SUPABASE_PROJECT_ID` and `VITE_SUPABASE_ANON_KEY` for **Preview** environment
- Option A: Use the same Supabase project (shared data)
- Option B: Create a second Supabase project for staging (separate data, recommended)

### Staging Supabase project (recommended)

1. Create a new Supabase project (e.g., "stokpile-staging")
2. Run `001_create_tables.sql` on it
3. Set its URL + anon key as Preview-only env vars in Vercel
4. Now preview deployments use separate data from production

### Edge Function staging

For the Edge Function, create a separate function:
```bash
supabase functions deploy make-server-staging --no-verify-jwt --project-ref <staging-project-ref>
```

Point the staging frontend's `VITE_SUPABASE_PROJECT_ID` to the staging project.

## Branch protection

In GitHub → Settings → Branches → Add rule:
- Branch name pattern: `main`
- Require status checks: `build-and-test`, `e2e`
- Require PR reviews: 1 (optional for solo dev, good for team)

This prevents direct pushes to main — all changes go through PR → preview → merge.
