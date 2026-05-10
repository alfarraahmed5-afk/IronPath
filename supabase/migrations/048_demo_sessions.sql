-- Phase C / γ4 — Marketing-site no-auth demo deep-link.
--
-- A "demo session" is an ephemeral token issued by POST /api/v1/demo/spawn
-- (public, rate-limited 5/min/IP) that lets a marketing-site visitor land
-- in the operator console as if logged in to a "Demo Gym" — without
-- creating an account. The token is recorded for forensics (IP, UA,
-- referrer) and expires in 24h. A daily cron deletes expired rows.
--
-- v1 caveat: the console UI shows the demo banner when ?demo_token=<…> is
-- present in the URL but the backend does NOT yet accept demo_token as a
-- JWT — full demo-session auth is a follow-up. Today the row exists for
-- analytics + the future auth shim.

CREATE TABLE IF NOT EXISTS public.demo_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token       VARCHAR(64) UNIQUE NOT NULL,
  gym_id      UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  ip          INET,
  user_agent  TEXT,
  referrer    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_demo_sessions_expires ON public.demo_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_token ON public.demo_sessions(token);
