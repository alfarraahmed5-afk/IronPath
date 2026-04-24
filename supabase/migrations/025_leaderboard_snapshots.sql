CREATE TABLE leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'heaviest_lift','most_volume_week','most_volume_month',
    'most_volume_alltime','most_workouts_week','most_workouts_month',
    'most_workouts_alltime','longest_streak'
  )),
  period VARCHAR(20) NOT NULL CHECK (period IN ('weekly','monthly','all_time')),
  period_start DATE,
  period_end DATE,
  rankings JSONB NOT NULL DEFAULT '[]',
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_lb_snapshot_unique_nolift
  ON leaderboard_snapshots(gym_id, category, period, COALESCE(period_start, '1900-01-01'))
  WHERE exercise_id IS NULL;

CREATE UNIQUE INDEX idx_lb_snapshot_unique_lift
  ON leaderboard_snapshots(gym_id, category, period, COALESCE(period_start, '1900-01-01'), exercise_id)
  WHERE exercise_id IS NOT NULL;
