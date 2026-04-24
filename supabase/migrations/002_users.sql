CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(30) UNIQUE NOT NULL
    CHECK (username ~ '^[a-zA-Z0-9_]+$' AND char_length(username) >= 3),
  full_name VARCHAR(255),
  avatar_url TEXT,
  bio TEXT,
  role VARCHAR(20) DEFAULT 'member'
    CHECK (role IN ('member','gym_owner','super_admin')),
  sex VARCHAR(10) CHECK (sex IN ('male','female')),
  date_of_birth DATE,
  bodyweight_kg DECIMAL(5,2) CHECK (bodyweight_kg > 0 AND bodyweight_kg < 700),
  is_profile_private BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
