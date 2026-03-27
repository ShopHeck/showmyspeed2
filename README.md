# ShowMySpeed — Supabase Migration

Blink SDK has been fully replaced with Supabase. Here's what changed and how to set it up.

## What Changed

| Was (Blink) | Now (Supabase) |
|---|---|
| `blink.auth.me()` | `supabase.auth.getUser()` |
| `blink.auth.signInWithEmail()` | `supabase.auth.signInWithPassword()` |
| `blink.auth.signUp()` | `supabase.auth.signUp()` |
| `blink.auth.signInWithGoogle()` | `supabase.auth.signInWithOAuth({ provider: 'google' })` |
| `blink.auth.onAuthStateChanged()` | `supabase.auth.onAuthStateChange()` |
| `blink.db.speedResults.create()` | `supabase.from('speed_results').insert()` |
| `blink.db.userSpeedHistory.list()` | `supabase.from('user_speed_history').select()` |
| `blink.db.savedProviders.*` | `supabase.from('saved_providers').*` |
| `blink.db.userSubscriptions.list()` | `supabase.from('user_subscriptions').select()` |
| Blink Functions URLs | Netlify Functions (unchanged) |

Column names changed from camelCase to snake_case (Postgres convention):
- `downloadMbps` → `download_mbps`
- `uploadMbps` → `upload_mbps`
- `pingMs` → `ping_ms`
- `userId` → `user_id`
- etc.

---

## Setup Steps

### 1. Create a Supabase project
Go to [supabase.com](https://supabase.com) → New Project → pick a region close to your users.

### 2. Run the schema
In your Supabase dashboard → SQL Editor → paste the contents of `supabase-schema.sql` → Run.

This creates 4 tables with Row Level Security already configured:
- `speed_results` — anonymous public test data
- `user_speed_history` — per-user test history
- `saved_providers` — bookmarked ISPs
- `user_subscriptions` — Stripe subscription state

### 3. Enable Google Auth (optional)
Supabase Dashboard → Authentication → Providers → Google → enable and add your Google OAuth credentials.

### 4. Copy environment variables
```bash
cp .env.example .env
```

Fill in:
- `VITE_SUPABASE_URL` — from Supabase Dashboard → Settings → API → Project URL
- `VITE_SUPABASE_ANON_KEY` — from Supabase Dashboard → Settings → API → anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Dashboard → Settings → API → service_role key (server-side only)

### 5. Copy changed files into your project
Copy these files from this folder into your existing project, replacing the Blink versions:

```
src/lib/supabase.ts          (new — replaces src/lib/blink.ts)
src/hooks/useAuth.ts         (updated)
src/hooks/useSubscription.ts (updated)
src/lib/stripe.ts            (updated)
src/components/AuthModal.tsx (updated)
src/pages/HomePage.tsx       (updated)
src/pages/DashboardPage.tsx  (updated)
src/pages/ComparePage.tsx    (updated)
functions/stripe-webhook/index.ts (updated)
package.json                 (updated — remove @blinkdotnew/sdk, add @supabase/supabase-js)
```

### 6. Install dependencies
```bash
bun install
# or
npm install
```

### 7. Update Netlify environment variables
In Netlify Dashboard → Site → Environment Variables, add:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_SINGLE`
- `STRIPE_PRICE_UNLIMITED`

### 8. Deploy
```bash
bun run build
# push to your repo — Netlify auto-deploys
```

---

## Files NOT changed
These files had no Blink dependencies and are unchanged:
- `src/lib/speedTest.ts`
- `src/lib/ispData.ts`
- `src/components/SpeedGauge.tsx`
- `src/components/MetricCard.tsx`
- `src/components/PremiumReport.tsx`
- `src/pages/ResultsPage.tsx`
- `src/pages/ComparePage.tsx` (SavedProviders logic updated)
- `src/pages/PremiumPage.tsx`
- `src/pages/TipsPage.tsx`
- `src/pages/SideBySidePage.tsx`
- `src/App.tsx`
- All `src/components/ui/*`
- `functions/create-checkout/index.ts`
- `functions/customer-portal.ts`
