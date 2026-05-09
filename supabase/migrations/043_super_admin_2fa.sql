-- Phase B.5 prod-ship blocker #1: TOTP 2FA for super_admin login (plan §8.1 #1,
-- §8.2, §12.4 #4). One compromised super_admin credential exposes every gym;
-- this migration adds the storage layer for TOTP secrets, recovery codes, and
-- the short-lived login challenges that bridge password-success → TOTP-success.
--
-- Sequencing: 043 mutates public.users (adds totp_secret + totp_enabled_at) so
-- it lives after 034_auth_hook.sql per plan §12.1 #15. The auth hook only
-- reads gym_id and role, so adding two unrelated columns to public.users is a
-- pure ALTER that does not affect token claim generation.
--
-- Threat-model notes:
--   - totp_secret is stored as plaintext base32 for v1. The DB is service-role
--     gated; encryption-at-rest of the secret column is a Phase B.5 follow-up
--     tracked in DEV_LOG and bundled with the JWT-secret rotation work.
--   - super_admin_2fa_challenges holds the Supabase access/refresh tokens
--     between password-success and TOTP-success (≤5 min window) so we can vend
--     them without re-authenticating with the password. Hashed challenge_token
--     is the bearer the client holds; raw token never lands on disk.
--   - Recovery codes are sha256-hashed before storage; the raw codes are shown
--     to the operator exactly once at enrollment time.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.super_admin_recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, code_hash)
);

CREATE INDEX IF NOT EXISTS idx_super_admin_recovery_codes_user
  ON public.super_admin_recovery_codes (user_id);

CREATE TABLE IF NOT EXISTS public.super_admin_2fa_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  challenge_token_hash TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_super_admin_2fa_challenges_expires
  ON public.super_admin_2fa_challenges (expires_at)
  WHERE consumed_at IS NULL;
