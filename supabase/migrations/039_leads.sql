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
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email_recent
  ON leads (LOWER(email))
  WHERE created_at > NOW() - INTERVAL '7 days';
