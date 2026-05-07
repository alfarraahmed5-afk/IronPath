// migrate-challenge-enrollment.js
// Adds the enrolled_user_ids column to leaderboard_challenges if it doesn't exist.
// Run: npm run migrate:challenge-enrollment
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function run() {
  const sql = `
    ALTER TABLE leaderboard_challenges
    ADD COLUMN IF NOT EXISTS enrolled_user_ids UUID[] NOT NULL DEFAULT '{}';
  `;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    // Supabase doesn't expose a generic SQL exec RPC by default.
    // Fall back to the management API approach.
    console.log('[migrate] RPC not available, using SQL editor approach...');
    console.log('\nPlease run this SQL in your Supabase dashboard → SQL Editor:\n');
    console.log('─'.repeat(60));
    console.log(sql.trim());
    console.log('─'.repeat(60));
    console.log('\nhttps://supabase.com/dashboard/project/oeehjqwzafturnkcrfua/sql/new');
    return;
  }

  console.log('[migrate] enrolled_user_ids column added successfully.');
}

run().catch(err => {
  console.error('[migrate] Failed:', err.message);
  // Always print the SQL as fallback
  console.log('\nRun this SQL manually in Supabase dashboard:\n');
  console.log('ALTER TABLE leaderboard_challenges ADD COLUMN IF NOT EXISTS enrolled_user_ids UUID[] NOT NULL DEFAULT \'{}\';');
  console.log('\nhttps://supabase.com/dashboard/project/oeehjqwzafturnkcrfua/sql/new');
});
