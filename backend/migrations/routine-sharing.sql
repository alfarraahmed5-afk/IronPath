-- Routine sharing: public routines, copy tracking
-- Apply via Supabase SQL editor.

ALTER TABLE routines
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS copy_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_routine_id UUID NULL REFERENCES routines(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_routines_public_gym
  ON routines(is_public, gym_id, copy_count DESC, created_at DESC)
  WHERE is_public = true;
