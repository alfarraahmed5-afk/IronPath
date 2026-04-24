CREATE TABLE ai_trainer_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  goal VARCHAR(20) NOT NULL CHECK (goal IN ('strength','hypertrophy','endurance','general')),
  experience_level VARCHAR(20) NOT NULL
    CHECK (experience_level IN ('beginner','intermediate','advanced')),
  days_per_week INTEGER NOT NULL CHECK (days_per_week BETWEEN 2 AND 6),
  equipment VARCHAR(20) NOT NULL
    CHECK (equipment IN ('full_gym','dumbbells','bodyweight','home_mixed')),
  is_active BOOLEAN DEFAULT true,
  is_paused BOOLEAN DEFAULT false,
  program_template_key VARCHAR(100) NOT NULL,
  progression_data JSONB NOT NULL DEFAULT '{"total_program_sessions_completed":0,"increment_multiplier":1.0,"override_bias":0,"exercises":{}}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
