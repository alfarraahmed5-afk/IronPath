-- Plan §6.4 spec'd a partial unique index on lower(email) WHERE created_at >
-- now()-7d to dedupe spammy resubmits. PostgreSQL rejects NOW() in index
-- predicates (functions there must be IMMUTABLE — discovered when applying
-- against production 2026-05-09). Time-windowed dedup now belongs in app
-- code; the regular index here keeps owner-email lookups fast.
-- Phase B.5 follow-up: implement dedup at POST /leads (check for existing
-- row in last 7d before insert; return 200 idempotent if matched).

CREATE TABLE IF NOT EXISTS leads (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT         NOT NULL,
  name         TEXT,
  gym_name     TEXT,
  phone        TEXT,
  message      TEXT,
  source       TEXT,
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  ip           TEXT,
  user_agent   TEXT,
  status       TEXT         NOT NULL DEFAULT 'new'
                            CHECK (status IN ('new','contacted','demo_booked','trialing','negotiating','won','lost','dropped')),
  assigned_to  UUID         REFERENCES users(id) ON DELETE SET NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leads_status_created ON leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email          ON leads (LOWER(email), created_at DESC);
