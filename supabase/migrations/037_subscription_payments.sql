-- Manual payment ledger for gym subscriptions.
-- Each row represents a recorded payment covering [period_start, period_end].
-- recorded_by is the super_admin user that entered the payment (nullable in case
-- the user is later deleted — we keep the audit row).

CREATE TABLE IF NOT EXISTS subscription_payments (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id        UUID         NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  amount_cents  INTEGER      NOT NULL CHECK (amount_cents >= 0),
  period_start  DATE         NOT NULL,
  period_end    DATE         NOT NULL,
  note          TEXT,
  recorded_by   UUID         REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT subscription_payments_period_valid CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_gym_created
  ON subscription_payments (gym_id, created_at DESC);
