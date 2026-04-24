export interface Gym {
  id: string;
  name: string;
  logo_url: string | null;
  location: string | null;
  description: string | null;
  invite_code: string;
  accent_color: string;
  is_active: boolean;
  subscription_status: 'trial' | 'active' | 'expired' | 'cancelled';
  subscription_tier: 'starter' | 'growth' | 'unlimited' | null;
  subscription_expires_at: string | null;
  trial_started_at: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  gym_id: string;
  email: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: 'member' | 'gym_owner' | 'super_admin';
  sex: 'male' | 'female' | null;
  date_of_birth: string | null;
  bodyweight_kg: number | null;
  is_profile_private: boolean;
  is_active: boolean;
  deleted_at: string | null;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

