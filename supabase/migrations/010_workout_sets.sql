CREATE TABLE workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID REFERENCES workout_exercises(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL,
  set_type VARCHAR(20) DEFAULT 'normal'
    CHECK (set_type IN ('normal','warmup','dropset','failure')),
  weight_kg DECIMAL(7,2) CHECK (weight_kg >= 0),
  reps INTEGER CHECK (reps >= 0 AND reps <= 10000),
  duration_seconds INTEGER CHECK (duration_seconds >= 0),
  distance_meters DECIMAL(8,2) CHECK (distance_meters >= 0),
  rpe DECIMAL(3,1) CHECK (rpe >= 6.0 AND rpe <= 10.0),
  is_completed BOOLEAN DEFAULT false,
  is_warmup_counted BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(workout_exercise_id, position)
);
