CREATE TABLE challenge_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES leaderboard_challenges(id) ON DELETE CASCADE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  final_rankings JSONB NOT NULL DEFAULT '[]',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id)
);
