CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES gyms(id),
  created_by UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT,
  image_url TEXT,
  animation_url TEXT,
  equipment VARCHAR(50)
    CHECK (equipment IN ('barbell','dumbbell','machine','cable',
      'bodyweight','resistance_band','kettlebell','other')),
  primary_muscles TEXT[] NOT NULL DEFAULT '{}',
  secondary_muscles TEXT[] NOT NULL DEFAULT '{}',
  logging_type VARCHAR(20) DEFAULT 'weight_reps'
    CHECK (logging_type IN ('weight_reps','bodyweight_reps','duration','distance')),
  is_custom BOOLEAN DEFAULT false,
  is_gym_template BOOLEAN DEFAULT false,
  wger_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_exercises_unique_name_per_gym
  ON exercises(gym_id, lower(name))
  WHERE gym_id IS NOT NULL;
