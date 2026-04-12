# Rate Limiting

## Current state

The Edge Function has an in-memory rate limiter that resets on every cold start
(~every 5 minutes). This is effectively no rate limiting.

## Recommended: Upstash Redis

Upstash provides a serverless Redis that works with Edge Functions.
Free tier: 10,000 commands/day.

### Setup

1. Sign up at https://upstash.com
2. Create a Redis database (region: EU West or closest to your users)
3. Get the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
4. Add them as Supabase Edge Function secrets:
   - Dashboard → Edge Functions → make-server-34d0b231 → Secrets
5. Install in the Edge Function:

```ts
// In index.ts
import { Ratelimit } from "npm:@upstash/ratelimit";
import { Redis } from "npm:@upstash/redis";

const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
});

const loginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15m"), // 5 attempts per 15 min
  prefix: "ratelimit:login",
});

const signupLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1h"), // 3 signups per hour per IP
  prefix: "ratelimit:signup",
});

// In the signin route:
const ip = c.req.header('x-forwarded-for')?.split(',')[0] || 'unknown';
const { success } = await loginLimiter.limit(ip);
if (!success) return c.json({ error: 'Too many attempts. Try again later.' }, 429);
```

### Why not in-memory?

Supabase Edge Functions run on Deno Deploy. Each request may hit a different
isolate. In-memory state (Maps, variables) is not shared between isolates and
resets on cold starts. Redis persists across all requests.

### Cost

Free tier: 10,000 commands/day = ~5,000 rate-limited requests/day.
Paid: $0.20 per 100K commands. At 10K users, ~$2/month.
