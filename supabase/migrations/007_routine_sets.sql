CREATE TABLE routine_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_exercise_id UUID REFERENCES routine_exercises(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL,
  set_type VARCHAR(20) DEFAULT 'normal'
    CHECK (set_type IN ('normal','warmup','dropset','failure')),
  target_weight_kg DECIMAL(7,2) CHECK (target_weight_kg >= 0),
  target_reps INTEGER CHECK (target_reps > 0),
  target_reps_min INTEGER CHECK (target_reps_min > 0),
  target_reps_max INTEGER CHECK (target_reps_max > 0),
  target_duration_seconds INTEGER CHECK (target_duration_seconds > 0),
  target_distance_meters DECIMAL(8,2) CHECK (target_distance_meters > 0),
  UNIQUE(routine_exercise_id, position)
);
