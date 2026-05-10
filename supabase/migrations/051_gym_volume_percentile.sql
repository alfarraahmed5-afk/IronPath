-- BE-H (mobile cinematic overhaul) -- gym volume percentile.
--
-- Lens 7 spec: /analytics/stats add gym_volume_percentile so the
-- progress UI can render a "top X% in your gym" social-proof line on
-- the workout-finish + Profile screens. The number must be derivable
-- from data that already exists (per-user all-time total volume vs
-- everyone in the same gym), and cheap enough to call on every
-- /analytics/stats hit (which is cache-controlled at 60 s).
--
-- Implementation choice: SQL function `gym_volume_percentile(uuid)`
-- that returns the caller's percentile rank as INTEGER 0-100. SQL
-- function (not materialized view) because the gym member count is
-- bounded (median gym <= 200 members) so the percent_rank() window
-- runs in single-digit ms and we avoid the cron + staleness story
-- entirely.
--
-- The function is SECURITY DEFINER so it can read across users
-- within the gym scope without each caller needing to widen RLS.
-- Caller-passed user_id is validated against the function's own
-- table-scoped query so privilege escalation is bounded to "see your
-- own gym's percentile rank" -- which is exactly what we ship anyway.
--
-- Idempotent. Safe to re-run.

CREATE OR REPLACE FUNCTION public.gym_volume_percentile(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gym_id UUID;
  v_user_volume NUMERIC;
  v_rank NUMERIC;
  v_member_count INTEGER;
BEGIN
  -- Resolve the user's gym. NULL gym (deleted user / orphan) => NULL.
  SELECT gym_id INTO v_gym_id FROM users WHERE id = p_user_id;
  IF v_gym_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- All-time total volume for the target user. Coalesce the empty case
  -- so a brand-new user with zero workouts gets a deterministic 0
  -- volume (and therefore lands at the 0th percentile, not NULL).
  SELECT COALESCE(SUM(total_volume_kg), 0) INTO v_user_volume
  FROM workouts
  WHERE user_id = p_user_id AND is_completed = true;

  -- Member count for the gym (active, non-deleted users only).
  SELECT COUNT(*) INTO v_member_count
  FROM users
  WHERE gym_id = v_gym_id
    AND deleted_at IS NULL
    AND is_active = true;

  -- Lone-member edge case: percentile is undefined for n=1. Return
  -- 100 (they're trivially top 100% of the gym).
  IF v_member_count <= 1 THEN
    RETURN 100;
  END IF;

  -- Compute percent_rank() over the per-user gym totals. Users with
  -- zero completed workouts are still counted (LEFT JOIN); they pull
  -- the median down which is what the brand promise requires (a
  -- low-engagement gym shouldn't quietly inflate everyone to top 10%).
  WITH gym_totals AS (
    SELECT
      u.id AS user_id,
      COALESCE(SUM(w.total_volume_kg), 0) AS total_volume
    FROM users u
    LEFT JOIN workouts w
      ON w.user_id = u.id AND w.is_completed = true
    WHERE u.gym_id = v_gym_id
      AND u.deleted_at IS NULL
      AND u.is_active = true
    GROUP BY u.id
  ),
  ranked AS (
    SELECT
      user_id,
      -- percent_rank ranges 0..1; 1.0 means highest. We invert below
      -- so the returned percentile means "you're in the top N percent".
      percent_rank() OVER (ORDER BY total_volume) AS pr
    FROM gym_totals
  )
  SELECT pr INTO v_rank FROM ranked WHERE user_id = p_user_id;

  IF v_rank IS NULL THEN
    RETURN NULL;
  END IF;

  -- Convert to "top N percent" idiom: pr=1.0 (highest) => 100,
  -- pr=0.0 (lowest) => 0. Round half-up to integer.
  RETURN GREATEST(0, LEAST(100, ROUND(v_rank * 100)::INTEGER));
END;
$$;

-- Allow the API role(s) to execute it. Supabase exposes anon + auth
-- roles by default; the backend service role already has GRANT
-- privileges via SECURITY DEFINER + the function search_path lock.
GRANT EXECUTE ON FUNCTION public.gym_volume_percentile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gym_volume_percentile(UUID) TO service_role;
