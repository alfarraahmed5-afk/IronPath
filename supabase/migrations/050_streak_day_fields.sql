-- BE-D (mobile cinematic overhaul) -- streak unit migration.
--
-- The mobile redesign moves the streak idiom from weeks (Iron-month /
-- Iron-quarter cadence) to days (Strava / Duolingo cadence) per the
-- founder Q2 lock. Backend keeps the existing weekly fields for one
-- transition release so older clients continue to read a sane value;
-- new clients read days.
--
-- Founder Q2 verbatim: "Streak unit weeks (kept; backend stays on
-- current_streak_weeks -- BE-D adds current_streak_days +
-- longest_streak + last_workout_at AS ADDITIONAL FIELDS, not
-- replacements)".
--
-- Fields land on the existing `streaks` table (same row-per-user
-- shape; one upsert from /workouts already maintains it). The cron in
-- BE-N (separate ticket, Team B) will eventually read
-- current_streak_days to award the new tier ladder badges
-- (iron_streak_2w / 1m / 3m / 6m / 1y / 2y / 5y).
--
-- Idempotent: every column add is `IF NOT EXISTS`. Backfill is a
-- single UPDATE that derives the day-streak from the workouts table
-- so existing users keep their numbers.

ALTER TABLE streaks
  ADD COLUMN IF NOT EXISTS current_streak_days INTEGER NOT NULL DEFAULT 0
    CHECK (current_streak_days >= 0),
  ADD COLUMN IF NOT EXISTS longest_streak_days INTEGER NOT NULL DEFAULT 0
    CHECK (longest_streak_days >= 0),
  ADD COLUMN IF NOT EXISTS last_workout_at TIMESTAMPTZ;

-- Backfill last_workout_at from the most recent completed workout per
-- user. Cheap one-shot; the streaks row count is bounded by user count,
-- and DISTINCT ON over (user_id, started_at DESC) is a single index
-- scan on workouts(user_id, started_at).
WITH latest AS (
  SELECT DISTINCT ON (user_id) user_id, started_at
  FROM workouts
  WHERE is_completed = true
  ORDER BY user_id, started_at DESC
)
UPDATE streaks s
SET last_workout_at = latest.started_at
FROM latest
WHERE s.user_id = latest.user_id
  AND s.last_workout_at IS NULL;

-- Backfill current_streak_days. Definition: count of consecutive
-- calendar days (UTC) ending today (or yesterday, if no workout today)
-- on which the user logged a completed workout.
--
-- Strategy: per user, take distinct workout-days from the workouts
-- table, then walk backward from the latest day, counting consecutive
-- days. Implemented with a window function that flags gaps; the run
-- containing the latest day is the current streak.
WITH workout_days AS (
  SELECT DISTINCT
    user_id,
    (started_at AT TIME ZONE 'UTC')::date AS workout_date
  FROM workouts
  WHERE is_completed = true
),
ranked AS (
  SELECT
    user_id,
    workout_date,
    workout_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY workout_date))::int AS run_anchor
  FROM workout_days
),
runs AS (
  SELECT
    user_id,
    run_anchor,
    COUNT(*)::int AS run_length,
    MAX(workout_date) AS run_last_day
  FROM ranked
  GROUP BY user_id, run_anchor
),
current_runs AS (
  -- The "current" run is the one whose last day is today or yesterday
  -- (UTC). If the latest workout is older than yesterday, the streak
  -- is broken => 0.
  SELECT user_id, run_length
  FROM runs
  WHERE run_last_day >= (CURRENT_DATE - INTERVAL '1 day')::date
),
longest_runs AS (
  SELECT user_id, MAX(run_length) AS longest
  FROM runs
  GROUP BY user_id
)
UPDATE streaks s
SET
  current_streak_days = COALESCE(cr.run_length, 0),
  longest_streak_days = GREATEST(COALESCE(lr.longest, 0), s.longest_streak_days)
FROM longest_runs lr
LEFT JOIN current_runs cr ON cr.user_id = lr.user_id
WHERE s.user_id = lr.user_id;

-- Index for the badge-tier cron (BE-N) which will scan high-streak
-- users to award the new tier ladder. Partial index keeps it tiny;
-- only users with active streaks (>= 14 days, the smallest tier) are
-- eligible.
CREATE INDEX IF NOT EXISTS idx_streaks_high_current_days
  ON streaks (current_streak_days DESC)
  WHERE current_streak_days >= 14;

-- Index for the in-danger query path (mobile reads
-- last_workout_at to compute "streak at risk if no workout in 24h").
CREATE INDEX IF NOT EXISTS idx_streaks_last_workout_at
  ON streaks (last_workout_at DESC)
  WHERE last_workout_at IS NOT NULL;
