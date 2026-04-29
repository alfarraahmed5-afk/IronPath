-- Profile features: pinned PRs, 1v1 challenges, achievement badges
-- Apply via Supabase SQL editor.

-- 1) PR Showcase — up to 3 pinned PRs per user, ordered.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS showcase_pr_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pinned_challenge_exercise_id UUID NULL REFERENCES exercises(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS challenge_wins INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS challenge_losses INTEGER NOT NULL DEFAULT 0;

-- 2) 1v1 challenges between two users
CREATE TABLE IF NOT EXISTS user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  challenger_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  metric TEXT NOT NULL CHECK (metric IN ('heaviest_weight', 'most_reps', 'best_volume_set', 'projected_1rm')),
  target_value NUMERIC NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'expired')),
  winner_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  challenger_value NUMERIC NULL,
  opponent_value NUMERIC NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ NULL,
  CONSTRAINT distinct_users CHECK (challenger_id <> opponent_id)
);

CREATE INDEX IF NOT EXISTS idx_user_challenges_challenger ON user_challenges(challenger_id, status);
CREATE INDEX IF NOT EXISTS idx_user_challenges_opponent ON user_challenges(opponent_id, status);
CREATE INDEX IF NOT EXISTS idx_user_challenges_gym_status ON user_challenges(gym_id, status, ends_at);

-- 3) Achievement badges earned by users
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  -- 'top10_lifts', 'top10_volume', 'top10_workouts', 'top10_streak',
  -- 'challenge_winner', 'duel_winner_streak_5'
  badge_type TEXT NOT NULL,
  badge_label TEXT NOT NULL,
  badge_color TEXT NULL,
  -- e.g. exercise_id for top10_lifts, challenge_id for challenge_winner
  ref_id UUID NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NULL,
  CONSTRAINT user_badge_unique UNIQUE (user_id, badge_type, ref_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_gym_type ON user_achievements(gym_id, badge_type);
