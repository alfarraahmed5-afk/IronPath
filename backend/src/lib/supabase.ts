import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Main client for ALL database operations. We explicitly pin the
// Authorization header to the service role key in global.headers so that
// every PostgREST request is sent as the service role, bypassing RLS — even
// if supabase-js's internal session state ever gets touched by auth calls.
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    },
  },
});

// Dedicated client for validating user JWTs via auth.getUser(token).
// Kept separate so any internal session mutation from auth calls can't leak
// into the main DB client's headers.
export const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
