CREATE TABLE gyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  location TEXT,
  description TEXT,
  invite_code VARCHAR(10) UNIQUE NOT NULL,
  accent_color VARCHAR(7) DEFAULT '#FF6B35',
  is_active BOOLEAN DEFAULT true,
  subscription_status VARCHAR(20) DEFAULT 'trial'
    CHECK (subscription_status IN ('trial','active','expired','cancelled')),
  subscription_tier VARCHAR(20)
    CHECK (subscription_tier IN ('starter','growth','unlimited')),
  subscription_expires_at TIMESTAMPTZ,
  trial_started_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
