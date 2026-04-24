CREATE TABLE workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) NOT NULL,
  position INTEGER NOT NULL,
  superset_group INTEGER CHECK (superset_group > 0),
  rest_seconds INTEGER DEFAULT 90,
  notes TEXT
);
