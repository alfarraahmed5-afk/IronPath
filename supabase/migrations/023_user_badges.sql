CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  badge_key VARCHAR(50) NOT NULL CHECK (badge_key IN (
    'first_rep','ten_strong','half_century','century',
    'iron_month','iron_quarter','pr_machine','heavy_lifter',
    'consistent','early_bird','night_owl','gym_legend'
  )),
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_key)
);
