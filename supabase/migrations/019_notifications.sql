CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'like', 'comment', 'mention', 'follow', 'follow_request',
    'follow_request_approved', 'pr', 'announcement',
    'leaderboard', 'streak_milestone', 'badge_unlocked',
    'weekly_nudge', 'monthly_report_ready'
  )),
  title VARCHAR(255) NOT NULL,
  body TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
