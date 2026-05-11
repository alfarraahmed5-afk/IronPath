// One-shot diagnostic for the "AI Trainer says No prescribed exercises" bug.
//
// Checks three things against the configured Supabase env (backend/.env):
//   1. Each critical wger_id used by trainer-templates.js exists in the
//      exercises table with a non-null wger_id column.
//   2. The current super_admin / member account has an active program row
//      in ai_trainer_programs, and that row's progression_data.exercises
//      map is non-empty.
//   3. The TEMPLATES map resolves the program's template_key cleanly.
//
// Usage: node scripts/diagnose-trainer.js [user_email]
//   email defaults to alfarraahmed5@gmail.com (founder).

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const FOUNDER_EMAIL = process.argv[2] || 'alfarraahmed5@gmail.com';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required in backend/.env');
  process.exit(2);
}

const supabase = createClient(url, key);

// wger IDs used by trainer-templates.js (W.* constants).
const CRITICAL = {
  SQUAT: 110, BENCH: 192, DEADLIFT: 241, OHP: 74, ROW: 63,
  RDLIFT: 89, PULLUP: 31, LAT_PD: 122, CURL: 99, PUSHUP: 91,
  LUNGE: 78, PLANK: 95, BURPEE: 156, RUNNING: 215,
  GOBLET_SQ: 118, SPLIT_SQ: 170, DB_BENCH: 21, DB_SHOULDER: 68,
  DB_ROW: 72, DB_CURL: 5,
};

(async () => {
  console.log(`Supabase: ${url}`);
  console.log(`Target user: ${FOUNDER_EMAIL}\n`);

  // --- 1. wger_id coverage ---
  console.log('--- 1. Critical wger_ids in exercises table ---');
  const ids = Object.values(CRITICAL);
  const { data: exRows, error: exErr } = await supabase
    .from('exercises').select('id, name, wger_id').in('wger_id', ids);
  if (exErr) {
    console.error('exercises lookup failed:', exErr);
    process.exit(1);
  }
  const found = new Map(exRows.map(e => [e.wger_id, e]));
  let missingCount = 0;
  for (const [label, id] of Object.entries(CRITICAL)) {
    const row = found.get(id);
    if (row) {
      console.log(`  OK     wger_id ${id} (${label}) -> "${row.name}" [${row.id}]`);
    } else {
      console.log(`  MISS   wger_id ${id} (${label}) NOT IN exercises table`);
      missingCount++;
    }
  }
  console.log(`  Total: ${ids.length - missingCount}/${ids.length} present\n`);

  // --- 2. Founder's program row ---
  console.log(`--- 2. AI trainer program for ${FOUNDER_EMAIL} ---`);
  const { data: userRow } = await supabase
    .from('users').select('id, email, role')
    .eq('email', FOUNDER_EMAIL).maybeSingle();
  if (!userRow) {
    console.log(`  No user row for ${FOUNDER_EMAIL} (try another email).`);
    process.exit(0);
  }
  console.log(`  user: ${userRow.id} (${userRow.role})`);

  const { data: program } = await supabase
    .from('ai_trainer_programs')
    .select('*')
    .eq('user_id', userRow.id)
    .eq('is_active', true)
    .maybeSingle();
  if (!program) {
    console.log('  No active program row. The trainer onboarding never POSTed /trainer/program OR it errored.');
    process.exit(0);
  }
  console.log(`  template_key: ${program.program_template_key}`);
  console.log(`  goal: ${program.goal}, exp: ${program.experience_level}, days: ${program.days_per_week}, equip: ${program.equipment}`);
  const exMap = program.progression_data?.exercises || {};
  const exMapKeys = Object.keys(exMap);
  console.log(`  progression_data.exercises has ${exMapKeys.length} entries`);
  if (exMapKeys.length === 0) {
    console.log('  ROOT CAUSE: program was created BEFORE the wger import landed.');
    console.log('  The initial_weights POST sent wger_ids but the exercises table had no matching rows,');
    console.log('  so exercisesMap came back empty and progression_data.exercises was saved as {}.');
    console.log('  Fix: delete this program row and rerun trainer onboarding from the app.');
    console.log(`    DELETE FROM ai_trainer_programs WHERE id = '${program.id}';`);
  } else {
    console.log('  Sample exercises in progression_data:');
    for (const [exUuid, state] of Object.entries(exMap).slice(0, 5)) {
      const { data: ex } = await supabase
        .from('exercises').select('name, wger_id').eq('id', exUuid).maybeSingle();
      console.log(`    ${exUuid} (wger ${ex?.wger_id ?? '?'}) "${ex?.name ?? '?'}" weight=${state.current_weight_kg}kg`);
    }
  }

  // --- 3. Template ---
  console.log(`\n--- 3. Template resolution ---`);
  try {
    const { TEMPLATES } = require('../data/trainer-templates');
    const t = TEMPLATES[program.program_template_key];
    if (!t) {
      console.log(`  MISS template_key "${program.program_template_key}" not in TEMPLATES map`);
    } else {
      console.log(`  OK template "${t.name}" (${t.sessions.length} sessions)`);
      const session = t.sessions[0];
      const wgerIds = session.exercises.map(e => e.wger_id);
      console.log(`  Session 1 expects wger_ids: ${wgerIds.join(', ')}`);
      const sessionMissing = wgerIds.filter(id => !found.has(id));
      if (sessionMissing.length > 0) {
        console.log(`  Session 1 missing wger_ids: ${sessionMissing.join(', ')}`);
      } else {
        console.log(`  Session 1: all wger_ids present in DB`);
      }
    }
  } catch (e) {
    console.log(`  TEMPLATES load failed: ${e.message}`);
  }
})();
