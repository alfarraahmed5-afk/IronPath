-- BE-E (mobile cinematic overhaul) -- monthly recap table + indexes.
--
-- Per lens 7 P1-1 (Spotify-Wrapped pattern). A nightly job generates
-- one row per active user on the 1st of each month at 06:00 UTC. The
-- mobile app reads via GET /recaps/<YYYY-MM> and GET /recaps/latest.
--
-- The payload mirrors the panel shape consumed by
-- mobile/src/features/progress/MonthlyRecap.tsx. We keep it loose JSON
-- so panel composition can evolve without a migration churn -- the
-- only enforced shape is (user_id, period_start, period_end) being
-- unique so re-running the cron is idempotent.
--
-- Distinct from the legacy `monthly_reports` table which an earlier
-- phase wired against `/analytics/reports`. The recap is a different
-- product surface (the cinematic 6-panel takeover) and stores a
-- different payload shape. Both can coexist; the recap is the
-- "marketing" view, the report is the "spreadsheet" view.
--
-- Idempotent. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.monthly_recaps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gym_id        UUID REFERENCES gyms(id) ON DELETE SET NULL,
  -- 'YYYY-MM' label, e.g. '2026-04'. Cheaper to filter on than a date.
  period_key    VARCHAR(7) NOT NULL,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  -- Full panel payload. See backend/src/jobs/monthlyRecapJob.ts for shape.
  payload       JSONB NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One row per user per period. Re-running the job upserts.
  CONSTRAINT monthly_recaps_user_period_unique UNIQUE (user_id, period_key)
);

CREATE INDEX IF NOT EXISTS monthly_recaps_user_idx
  ON public.monthly_recaps (user_id, period_start DESC);

CREATE INDEX IF NOT EXISTS monthly_recaps_gym_period_idx
  ON public.monthly_recaps (gym_id, period_key);

-- RLS: users can read their own recaps. The cron writes via service-role
-- and bypasses RLS, so we only need the SELECT policy here.
ALTER TABLE public.monthly_recaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_monthly_recaps_select" ON public.monthly_recaps;
CREATE POLICY "own_monthly_recaps_select"
  ON public.monthly_recaps
  FOR SELECT
  USING (user_id = auth.uid());
