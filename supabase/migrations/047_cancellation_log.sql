-- Phase C.6 — record every cancellation attempt + which save offer was
-- presented + the outcome. Lets us iterate on offer strategy with
-- real data.

CREATE TABLE IF NOT EXISTS public.cancellation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  initiated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,                    -- 'too_expensive' | 'not_using' | 'missing_feature' | 'bug_reliability' | 'closing_gym' | 'other'
  reason_text TEXT,                         -- required when reason = 'other', else null
  offer_presented TEXT,                     -- 'pause' | 'free_month' | 'downgrade' | 'none'
  offer_accepted BOOLEAN,                   -- true if accepted, false if declined, null if not yet decided
  cancelled_at TIMESTAMPTZ,                 -- non-null if final cancellation went through
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cancellation_log_gym ON public.cancellation_log (gym_id, created_at DESC);

-- Phase C.6 also introduces the 'paused' subscription status (used by the
-- "pause" save offer in /admin/cancellation/accept-offer). The original
-- migration 001_gyms.sql constrained subscription_status to
-- ('trial','active','expired','cancelled'), so without relaxing the CHECK
-- here the route would fail at runtime. Drop + re-add with the expanded
-- allowlist; idempotent via IF EXISTS.
ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_subscription_status_check;
ALTER TABLE public.gyms
  ADD CONSTRAINT gyms_subscription_status_check
  CHECK (subscription_status IN ('trial','active','expired','cancelled','paused'));
