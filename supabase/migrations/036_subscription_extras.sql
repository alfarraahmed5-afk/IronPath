-- Add subscription/billing/profile extras to gyms.
-- mrr_cents       — normalized monthly revenue in cents (annual / 12)
-- phone/website/address — public-facing gym profile fields
-- timezone        — IANA tz string for analytics & scheduled jobs
-- units_default   — default unit system for new members
-- logo_url        — already exists from migration 001 (kept idempotent via IF NOT EXISTS)

ALTER TABLE gyms
  ADD COLUMN IF NOT EXISTS mrr_cents      INTEGER  NOT NULL DEFAULT 0 CHECK (mrr_cents >= 0),
  ADD COLUMN IF NOT EXISTS phone          TEXT,
  ADD COLUMN IF NOT EXISTS website        TEXT,
  ADD COLUMN IF NOT EXISTS address        TEXT,
  ADD COLUMN IF NOT EXISTS timezone       TEXT     NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS units_default  TEXT     NOT NULL DEFAULT 'metric' CHECK (units_default IN ('metric','imperial')),
  ADD COLUMN IF NOT EXISTS logo_url       TEXT;

COMMENT ON COLUMN gyms.mrr_cents IS 'Normalized monthly revenue in cents; annual plans = annual / 12.';
