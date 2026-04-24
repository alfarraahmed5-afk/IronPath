CREATE TABLE pre_built_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'gym','home','dumbbells','bodyweight',
    'cardio_hiit','resistance_band','travel','suspension'
  )),
  level VARCHAR(20) NOT NULL CHECK (level IN ('beginner','intermediate','advanced')),
  goal VARCHAR(20) CHECK (goal IN ('strength','hypertrophy','endurance','weight_loss','general')),
  equipment_required TEXT[] NOT NULL DEFAULT '{}',
  days_per_week INTEGER,
  program_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
