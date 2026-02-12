-- Migration: Add Stripe Billing Support (F006)
-- Date: 2026-02-10

-- 1. Add stripe_customer_id to subscriptions
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- 2. Drop the old status constraint and add the corrected one
--    Replaces: 'active' | 'cancelled' | 'expired'
--    With:     'active' | 'canceled' | 'past_due' | 'trialing'
ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'canceled', 'past_due', 'trialing'));

-- Migrate any existing 'cancelled' rows to 'canceled' (Stripe canonical spelling)
UPDATE subscriptions
  SET status = 'canceled'
  WHERE status = 'cancelled';

-- Remove any rows with invalid status 'expired' (revert to 'active' as safe default)
UPDATE subscriptions
  SET status = 'active'
  WHERE status = 'expired';

-- 3. Create stripe_webhook_events table for idempotency
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id          TEXT PRIMARY KEY,           -- Stripe event ID (evt_...)
  type        TEXT NOT NULL,              -- e.g. 'checkout.session.completed'
  processed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Index on processed_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at
  ON stripe_webhook_events (processed_at);
