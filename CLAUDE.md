# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install          # Install dependencies
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run preview      # Preview production build locally
npm run lint:js      # ESLint on TS/TSX files
npm run lint:types   # TypeScript type check (no emit)
```

Deployment is automatic via Netlify on git push. Netlify Functions are deployed alongside the frontend from the `/functions` directory.

## Architecture

Full-stack internet speed testing app with a freemium subscription model.

**Frontend:** React 18 + TypeScript + Vite, TanStack Router (client routing), TanStack React Query (server state/caching), Tailwind CSS, Framer Motion, Recharts.

**Backend:** Supabase (PostgreSQL + auth) + Netlify Functions (serverless, handles Stripe webhooks).

**Payments:** Stripe with two plans — Single Report (one-time) and Unlimited (monthly). Price IDs are set via env vars (`STRIPE_PRICE_SINGLE`, `STRIPE_PRICE_UNLIMITED`).

### Key Data Flow

1. Speed tests run client-side → results saved to `speed_results` (anonymous) or `user_speed_history` (authenticated)
2. Auth is Supabase email/password + Google OAuth, managed via `useAuth` hook
3. Subscription state comes from `user_subscriptions` table, updated by the Stripe webhook function using `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)
4. `useSubscription` hook reads plan tier and enforces `reports_used` / `reports_limit`

### Pages

- `HomePage.tsx` — Speed test runner, saves results
- `DashboardPage.tsx` — User history, billing management, customer portal
- `ComparePage.tsx` — ISP browsing, filtering, bookmarking

### Database Tables (all with RLS)

- `speed_results` — public, anonymous test data
- `user_speed_history` — per-user test history
- `saved_providers` — bookmarked ISPs (auth required)
- `user_subscriptions` — Stripe subscription state (updated server-side only)

Full schema in `supabase-schema.sql`.

## Environment Variables

Client-side (prefix `VITE_`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`

Server-side (Netlify Functions only): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_SINGLE`, `STRIPE_PRICE_UNLIMITED`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

See `.env.example` for the full list.
