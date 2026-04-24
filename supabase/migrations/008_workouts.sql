CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  routine_id UUID REFERENCES routines(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  total_volume_kg DECIMAL(12,2) DEFAULT 0 CHECK (total_volume_kg >= 0),
  total_sets INTEGER DEFAULT 0 CHECK (total_sets >= 0),
  visibility VARCHAR(20) DEFAULT 'public'
    CHECK (visibility IN ('public','followers','private')),
  is_completed BOOLEAN DEFAULT false,
  ordinal_number INTEGER,
  idempotency_key UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, idempotency_key)
);
