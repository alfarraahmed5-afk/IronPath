CREATE TABLE leaderboard_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  metric VARCHAR(50) NOT NULL CHECK (metric IN (
    'total_volume','workout_count','exercise_volume','exercise_1rm'
  )),
  exercise_id UUID REFERENCES exercises(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'upcoming'
    CHECK (status IN ('upcoming','active','completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
