CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  current_streak_weeks INTEGER DEFAULT 0,
  longest_streak_weeks INTEGER DEFAULT 0,
  last_workout_week DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
