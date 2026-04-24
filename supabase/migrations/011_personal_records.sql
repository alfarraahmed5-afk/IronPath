CREATE TABLE personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  exercise_id UUID REFERENCES exercises(id) NOT NULL,
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  workout_set_id UUID REFERENCES workout_sets(id) ON DELETE SET NULL,
  record_type VARCHAR(30) NOT NULL
    CHECK (record_type IN (
      'heaviest_weight', 'projected_1rm', 'best_volume_set',
      'best_volume_session', 'most_reps', '3rm', '5rm', '10rm',
      'longest_duration', 'longest_distance'
    )),
  value DECIMAL(12,2) NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
