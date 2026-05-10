-- Phase C.2 — wizard-level completion flag on gyms. The per-step table
-- (gym_onboarding_steps from migration 038) tracks individual step
-- progress; this flag answers "should I show the wizard at login?"
-- which the per-step table can't answer cleanly when the wizard's
-- step list changes over time.

ALTER TABLE public.gyms
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Backfill: every gym that exists today is treated as wizard-complete
-- so the existing operator doesn't get pushed through the wizard on
-- next login. New gyms (created after this migration) start with NULL
-- and will see the wizard.
UPDATE public.gyms
SET onboarding_completed_at = COALESCE(onboarding_completed_at, NOW())
WHERE onboarding_completed_at IS NULL;
