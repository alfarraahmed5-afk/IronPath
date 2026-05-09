-- Challenge enrollment + peer-created challenges
-- Apply via Supabase SQL editor.

ALTER TABLE leaderboard_challenges
  ADD COLUMN IF NOT EXISTS enrolled_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS exercise_id UUID NULL REFERENCES exercises(id) ON DELETE SET NULL;

-- Quick lookup of "challenges I'm enrolled in"
CREATE INDEX IF NOT EXISTS idx_challenges_enrolled
  ON leaderboard_challenges USING GIN (enrolled_user_ids);
