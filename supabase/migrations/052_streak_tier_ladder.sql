-- BE-N (mobile cinematic overhaul) -- streak tier ladder.
--
-- Founder Q6 lock: replace `iron_month` (4-week streak) and
-- `iron_quarter` (12-week streak) with a denser ladder anchored on
-- DAYS, not weeks:
--
--   iron_streak_2w    14 days
--   iron_streak_1m    30 days
--   iron_streak_3m    90 days
--   iron_streak_6m   180 days
--   iron_streak_1y   365 days
--   iron_streak_2y   730 days
--   iron_streak_5y  1825 days
--
-- Existing badges (iron_month / iron_quarter) stay in the CHECK
-- constraint so users who earned them historically keep them. The
-- BE-N cron (backend/src/jobs/streakTierCheck.ts) reads from the
-- `streaks.current_streak_days` column added by migration 050 and
-- inserts user_badges + gym_milestones rows + push notifications.
--
-- The thresholds live in a side table so the cron + the celebrate
-- screen can read them from one place. The table is intentionally
-- small (7 rows) and never grows; partial seed is idempotent.
--
-- Idempotent. Safe to re-run.

-- 1. Extend the user_badges CHECK constraint to allow the new keys.
--    Postgres doesn't expose `ALTER TABLE ... DROP CONSTRAINT IF
--    EXISTS` cleanly across versions when the constraint is anonymous,
--    so we recreate the named one. The original constraint shipped
--    in migration 023 was anonymous (auto-named user_badges_badge_key_check).

DO $$
DECLARE
  con_name TEXT;
BEGIN
  -- Find the existing CHECK constraint on badge_key by introspection.
  SELECT conname INTO con_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  WHERE t.relname = 'user_badges'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%badge_key%';
  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE user_badges DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE user_badges
  ADD CONSTRAINT user_badges_badge_key_check CHECK (badge_key IN (
    -- Legacy keys preserved so historical user rows stay valid.
    'first_rep','ten_strong','half_century','century',
    'iron_month','iron_quarter','pr_machine','heavy_lifter',
    'consistent','early_bird','night_owl','gym_legend',
    -- BE-N new tier ladder.
    'iron_streak_2w','iron_streak_1m','iron_streak_3m',
    'iron_streak_6m','iron_streak_1y','iron_streak_2y','iron_streak_5y'
  ));

-- 2. Streak-tier definitions. One row per tier; cron walks this.
--    Idempotent: CREATE TABLE IF NOT EXISTS + ON CONFLICT DO UPDATE
--    so re-running the migration converges the seeded state.
CREATE TABLE IF NOT EXISTS public.streak_tier_thresholds (
  badge_key VARCHAR(50) PRIMARY KEY,
  threshold_days INTEGER NOT NULL CHECK (threshold_days > 0),
  label TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  -- Set true when the tier replaces an older one; the cron skips
  -- inserting when a deprecated tier would be the only hit (the new
  -- tier always wins).
  is_deprecated BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO public.streak_tier_thresholds (badge_key, threshold_days, label, ordinal, is_deprecated) VALUES
  ('iron_streak_2w',   14, '2 Week Streak',  1, FALSE),
  ('iron_streak_1m',   30, '1 Month Streak', 2, FALSE),
  ('iron_streak_3m',   90, '3 Month Streak', 3, FALSE),
  ('iron_streak_6m',  180, '6 Month Streak', 4, FALSE),
  ('iron_streak_1y',  365, '1 Year Streak',  5, FALSE),
  ('iron_streak_2y',  730, '2 Year Streak',  6, FALSE),
  ('iron_streak_5y', 1825, '5 Year Streak',  7, FALSE),
  -- Mark the old keys as deprecated so the cron won't re-issue them
  -- but historical user rows are still recognized.
  ('iron_month',       28, 'Iron Month',     0, TRUE),
  ('iron_quarter',     84, 'Iron Quarter',   0, TRUE)
ON CONFLICT (badge_key) DO UPDATE SET
  threshold_days = EXCLUDED.threshold_days,
  label = EXCLUDED.label,
  ordinal = EXCLUDED.ordinal,
  is_deprecated = EXCLUDED.is_deprecated;

-- 3. Index the milestone table by milestone_key prefix so the cron's
--    "have we already inserted this for this gym" lookup is O(1).
--    (gym_milestones already has a UNIQUE on (gym_id, milestone_key);
--    no change needed here -- the unique itself is the index.)
