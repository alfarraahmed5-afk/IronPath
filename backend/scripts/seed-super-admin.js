require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function seedSuperAdmin() {
  const { data: existing } = await supabase
    .from('users').select('id').eq('email', process.env.SUPER_ADMIN_EMAIL).maybeSingle();
  if (existing) {
    console.log('Super admin already exists:', process.env.SUPER_ADMIN_EMAIL);
    return;
  }
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
    email_confirm: true,
  });
  if (authError) throw authError;
  const { data: gym, error: gymError } = await supabase.from('gyms').insert({
    name: 'IronPath System',
    invite_code: 'SYSTEM',
    subscription_status: 'active',
    subscription_tier: 'unlimited',
  }).select().single();
  if (gymError) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    throw gymError;
  }
  const { error: userError } = await supabase.from('users').insert({
    id: authUser.user.id,
    gym_id: gym.id,
    email: process.env.SUPER_ADMIN_EMAIL,
    username: 'ironpath_admin',
    full_name: 'IronPath Admin',
    role: 'super_admin',
  });
  if (userError) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    throw userError;
  }
  await supabase.from('user_settings').insert({ user_id: authUser.user.id });
  await supabase.from('streaks').insert({ user_id: authUser.user.id, gym_id: gym.id });
  console.log('Super admin created:', process.env.SUPER_ADMIN_EMAIL);
}

seedSuperAdmin().catch(err => { console.error(err); process.exit(1); });
