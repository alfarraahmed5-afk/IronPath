// recategorize-exercises.js
// One-shot script: re-tag every row in `exercises` with the correct
// logging_type so the UI shows the right input fields (weight+reps vs reps
// only vs duration vs distance).
//
// Run: node scripts/recategorize-exercises.js
// Dry run: DRY_RUN=1 node scripts/recategorize-exercises.js
//
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = !!process.env.DRY_RUN;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Patterns ordered by precedence: first match wins.
const PATTERNS = [
  // Static holds always count as duration regardless of equipment
  { type: 'duration', re: /\b(plank|l[-\s]?sit|hollow hold|wall sit|dead hang|farmer.?s walk|hanging hold|side plank|reverse plank|bird dog hold)\b/i },
  // Cardio machines = duration
  { type: 'duration', re: /\b(treadmill|elliptical|stair ?climber|stationary bike|exercise bike|spin bike|rowing machine|jumping rope|jump rope|battle rope|ski erg|assault bike|airdyne)\b/i },
  // Distance-based standalone activities (not machine versions)
  { type: 'distance', re: /^(running|walking|sprint|cycling|swim(ming)?|hiking|jogging|rowing(?! machine))\b/i },
  // Bodyweight reps — comprehensive list of common bodyweight movements
  { type: 'bodyweight_reps', re: /\b(push.?up|pull.?up|chin.?up|dip(?!s? lateral)|burpee|mountain climber|sit.?up|crunch|lunge( \(bodyweight\))?|air squat|jump squat|jumping jack|high knees|skater|inchworm|bear crawl|crab walk|donkey kick|fire hydrant|clamshell|dead bug|glute bridge( \(bodyweight\))?|hip thrust \(bodyweight\)|step.?up \(bodyweight\)|inverted row|tricep extension \(bodyweight\)|bench dip|chest dip|hanging leg raise|hanging knee raise|toe touch|flutter kick|scissor kick|reverse crunch|v.?up|tuck up|bicycle crunch|russian twist( \(bodyweight\))?|shoulder tap|pike push.?up|handstand push.?up|muscle.?up|kipping|ring row|frog jump)\b/i },
];

function inferLoggingType(name, equipment) {
  if (typeof name !== 'string') return 'weight_reps';
  for (const { type, re } of PATTERNS) {
    if (re.test(name)) return type;
  }
  // Equipment-driven hints if no name match
  if (equipment === 'bodyweight') return 'bodyweight_reps';
  return 'weight_reps';
}

async function fetchAll() {
  // Fetch all exercises in pages of 1000
  const PAGE = 1000;
  const all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('exercises')
      .select('id, name, equipment, logging_type')
      .order('name')
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

async function run() {
  console.log(`[recategorize] Starting${DRY_RUN ? ' (DRY RUN)' : ''}…`);
  const rows = await fetchAll();
  console.log(`[recategorize] Loaded ${rows.length} exercises`);

  const summary = { weight_reps: 0, bodyweight_reps: 0, duration: 0, distance: 0 };
  const updates = [];

  for (const r of rows) {
    const inferred = inferLoggingType(r.name, r.equipment);
    summary[inferred] = (summary[inferred] || 0) + 1;
    if (r.logging_type !== inferred) {
      updates.push({ id: r.id, name: r.name, from: r.logging_type, to: inferred });
    }
  }

  console.log(`[recategorize] Distribution after categorization:`);
  for (const [k, v] of Object.entries(summary)) console.log(`  ${k}: ${v}`);

  console.log(`[recategorize] ${updates.length} rows need updating`);
  if (DRY_RUN) {
    console.log('[recategorize] First 30 changes:');
    for (const u of updates.slice(0, 30)) {
      console.log(`  ${u.name} → ${u.from} -> ${u.to}`);
    }
    return;
  }

  // Apply updates in batches of 50
  const BATCH = 50;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    await Promise.all(batch.map(u =>
      supabase.from('exercises').update({ logging_type: u.to }).eq('id', u.id)
    ));
    if (i % (BATCH * 4) === 0) console.log(`  ...${i + batch.length}/${updates.length}`);
  }
  console.log(`[recategorize] Done. Applied ${updates.length} updates.`);
}

run().catch(err => {
  console.error('[recategorize] Failed:', err);
  process.exit(1);
});
