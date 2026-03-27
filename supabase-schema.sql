-- ============================================================
-- ShowMySpeed — Supabase Schema
-- Run this in your Supabase SQL editor (supabase.com/dashboard)
-- ============================================================

-- Enable UUID extension (already enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- 1. PUBLIC SPEED RESULTS (anonymous, aggregated data)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS speed_results (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  download_mbps NUMERIC(10,2) NOT NULL,
  upload_mbps   NUMERIC(10,2) NOT NULL,
  ping_ms       NUMERIC(8,2)  NOT NULL,
  jitter_ms     NUMERIC(8,2)  NOT NULL DEFAULT 0,
  isp_name      TEXT,
  isp_location  TEXT,
  ip_country    TEXT,
  ip_region     TEXT,
  ip_city       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Allow anyone to insert (anonymous test results)
ALTER TABLE speed_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert speed results"
  ON speed_results FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read speed results"
  ON speed_results FOR SELECT
  USING (true);

-- ─────────────────────────────────────────────────────────────
-- 2. USER SPEED HISTORY (per-user, authenticated)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_speed_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  download_mbps NUMERIC(10,2) NOT NULL,
  upload_mbps   NUMERIC(10,2) NOT NULL,
  ping_ms       NUMERIC(8,2)  NOT NULL,
  jitter_ms     NUMERIC(8,2)  NOT NULL DEFAULT 0,
  isp_name      TEXT,
  isp_location  TEXT,
  ip_city       TEXT,
  ip_country    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_speed_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own history"
  ON user_speed_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own history"
  ON user_speed_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own history"
  ON user_speed_history FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_speed_history_user_id
  ON user_speed_history(user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 3. SAVED PROVIDERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_providers (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  isp_name   TEXT NOT NULL,
  isp_type   TEXT,
  isp_url    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, isp_name)
);

ALTER TABLE saved_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their saved providers"
  ON saved_providers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_providers_user_id
  ON saved_providers(user_id);

-- ─────────────────────────────────────────────────────────────
-- 4. USER SUBSCRIPTIONS (updated by Stripe webhook)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id      TEXT UNIQUE,
  stripe_subscription_id  TEXT UNIQUE,
  stripe_price_id         TEXT,
  plan_id                 TEXT NOT NULL DEFAULT 'free' CHECK (plan_id IN ('free', 'single', 'unlimited')),
  plan_name               TEXT NOT NULL DEFAULT 'Free',
  status                  TEXT NOT NULL DEFAULT 'active',
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN NOT NULL DEFAULT FALSE,
  reports_used            INTEGER NOT NULL DEFAULT 0,
  reports_limit           INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role (Stripe webhook) can insert/update subscriptions
-- The webhook Netlify function uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_user_id
  ON user_subscriptions(user_id);

-- ─────────────────────────────────────────────────────────────
-- 5. AUTO-UPDATE updated_at TRIGGER
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
