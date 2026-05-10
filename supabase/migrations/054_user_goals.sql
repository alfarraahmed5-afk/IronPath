-- BE-F (mobile cinematic overhaul) -- user_goals table.
--
-- Per lens 7 P1-2 (founder Q3 lock: ship in v1, NOT behind a flag).
-- Three goal kinds:
--   target_weight  -- N kg on exercise E by date D (kg|reps)
--   consistency    -- N sessions/week for K weeks
--   bodyweight     -- N kg bodyweight by date D
--
-- Auto-completion runs nightly via backend/src/jobs/goalsAutoComplete.ts.
-- When a goal hits the criterion, the cron sets status='completed' +
-- completed_at = NOW(), inserts a `notifications` row on the
-- pr-and-streak channel, and (when the mobile app next focuses)
-- /goals/celebrate/:id renders the celebration takeover.
--
-- The shape is intentionally permissive (numeric target_value, free
-- target_unit text) so adding a 4th goal kind later is a code-only
-- change. The CHECK constraint enforces the v1 set.
--
-- Idempotent. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.user_goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gym_id          UUID REFERENCES gyms(id) ON DELETE SET NULL,
  goal_type       VARCHAR(32) NOT NULL,
  exercise_id     UUID REFERENCES exercises(id) ON DELETE SET NULL,
  target_value    NUMERIC NOT NULL,
  target_unit     VARCHAR(32) NOT NULL,
  target_date     DATE,
  starting_value  NUMERIC,
  starting_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  current_value   NUMERIC,
  status          VARCHAR(16) NOT NULL DEFAULT 'active',
  completed_at    TIMESTAMPTZ,
  abandoned_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_goals_goal_type_check
    CHECK (goal_type IN ('target_weight','consistency','bodyweight')),
  CONSTRAINT user_goals_status_check
    CHECK (status IN ('active','completed','abandoned')),
  -- target_weight requires exercise_id; the other two must not have it.
  CONSTRAINT user_goals_exercise_consistency CHECK (
    (goal_type = 'target_weight' AND exercise_id IS NOT NULL) OR
    (goal_type <> 'target_weight' AND exercise_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS user_goals_user_status_idx
  ON public.user_goals (user_id, status);

CREATE INDEX IF NOT EXISTS user_goals_user_type_idx
  ON public.user_goals (user_id, goal_type);

-- Touch updated_at on every row mutation.
DROP TRIGGER IF EXISTS user_goals_set_updated_at ON public.user_goals;
CREATE OR REPLACE FUNCTION public.user_goals_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_goals_set_updated_at
  BEFORE UPDATE ON public.user_goals
  FOR EACH ROW EXECUTE FUNCTION public.user_goals_touch_updated_at();

-- RLS: users only see + mutate their own goals.
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_user_goals_all" ON public.user_goals;
CREATE POLICY "own_user_goals_all"
  ON public.user_goals
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
