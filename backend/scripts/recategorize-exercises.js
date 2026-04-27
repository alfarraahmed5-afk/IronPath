// recategorize-exercises.js
// Re-tag every row in `exercises` so the UI groups by MUSCLE GROUP correctly:
//   1) Coalesce granular wger muscle names (latissimus_dorsi, biceps_femoris…)
//      into the canonical muscle-group tags the UI filters on (back, hamstrings…).
//   2) Add name-based fallbacks when primary_muscles is empty.
//   3) Recompute logging_type so cardio doesn't ask for weight+reps.
//
// Run: npm run recategorize         (apply)
// Dry: DRY_RUN=1 npm run recategorize
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

// ─── Muscle-group canonicalization ──────────────────────────────────────────
// Each wger / fine-grained muscle name maps to ONE OR MORE canonical groups
// so the UI's muscle filter (chest / back / shoulders / arms / etc.) actually
// matches.
const MUSCLE_GROUP = {
  // Chest
  pectoralis_major: ['chest'],
  pectoralis_minor: ['chest'],
  chest: ['chest'],
  pecs: ['chest'],
  // Back / Lats / Traps
  latissimus_dorsi: ['back', 'lats'],
  lats: ['back', 'lats'],
  back: ['back'],
  rhomboids: ['back'],
  trapezius: ['back', 'traps'],
  traps: ['back', 'traps'],
  paravertebrals: ['back'],
  erector_spinae: ['back'],
  lower_back: ['back'],
  // Shoulders
  anterior_deltoid: ['shoulders'],
  posterior_deltoid: ['shoulders'],
  lateral_deltoid: ['shoulders'],
  deltoids: ['shoulders'],
  shoulders: ['shoulders'],
  rear_delts: ['shoulders'],
  // Arms
  biceps: ['biceps'],
  brachialis: ['biceps'],
  brachioradialis: ['forearms'],
  triceps: ['triceps'],
  forearms: ['forearms'],
  // Legs
  quadriceps: ['quads'],
  quads: ['quads'],
  biceps_femoris: ['hamstrings'],
  hamstrings: ['hamstrings'],
  gluteus_maximus: ['glutes'],
  gluteus_medius: ['glutes'],
  glutes: ['glutes'],
  adductors: ['legs'],
  abductors: ['legs'],
  gastrocnemius: ['calves'],
  soleus: ['calves'],
  calves: ['calves'],
  // Core
  rectus_abdominis: ['core'],
  obliques: ['core'],
  serratus_anterior: ['core'],
  abs: ['core'],
  core: ['core'],
  // Cardio (rare in DB but useful)
  cardio: ['cardio'],
};

// Name-based hints when primary_muscles is empty/missing.
// Order matters — most specific first.
const NAME_HINTS = [
  { groups: ['chest'],            re: /\b(bench press|chest press|incline press|decline press|push.?up|pec deck|dumbbell fly|cable fly|chest fly|dip\b)/i },
  { groups: ['back', 'lats'],     re: /\b(pull.?up|chin.?up|lat pull|lat row|seated row|barbell row|t.?bar row|cable row|pulldown|inverted row|face pull|reverse fly)/i },
  { groups: ['shoulders'],        re: /\b(overhead press|ohp|military press|shoulder press|arnold press|lateral raise|front raise|upright row|shrug)/i },
  { groups: ['biceps'],           re: /\b(curl|chin.?up|hammer)/i },
  { groups: ['triceps'],          re: /\b(triceps|tricep|skull.?crusher|french press|kickback|push.?down|close.?grip bench)/i },
  { groups: ['quads'],             re: /\b(squat|leg press|hack squat|lunge|step.?up|leg extension|sissy squat)/i },
  { groups: ['hamstrings'],       re: /\b(deadlift|romanian dl|rdl|leg curl|good morning|hamstring|nordic)/i },
  { groups: ['glutes'],           re: /\b(hip thrust|glute bridge|glute kickback|cable kickback)/i },
  { groups: ['calves'],           re: /\b(calf raise|calf press|tibialis)/i },
  { groups: ['core'],             re: /\b(plank|crunch|sit.?up|leg raise|knee raise|ab wheel|cable woodchop|russian twist|hollow|toe touch|dead bug|bird dog|side plank|reverse crunch|v.?up|woodchopper|mountain climber)/i },
  { groups: ['cardio'],           re: /\b(run|sprint|cycl|jog|treadmill|elliptical|rowing(?! machine)|swim|hike|stair ?climb|jumping rope|jump rope|burpee|jumping jack|high knees)/i },
  { groups: ['forearms'],         re: /\b(forearm|wrist curl|farmer.?s walk)/i },
];

// ─── Logging type heuristics (carried forward from prior version) ────────────
const LOGGING_PATTERNS = [
  { type: 'duration',        re: /\b(plank|l[-\s]?sit|hollow hold|wall sit|dead hang|farmer.?s walk|hanging hold|side plank|reverse plank|bird dog hold|treadmill|elliptical|stair ?climber|stationary bike|exercise bike|spin bike|rowing machine|jumping rope|jump rope|battle rope|ski erg|assault bike|airdyne)\b/i },
  { type: 'distance',        re: /^(running|walking|sprint|cycling|swim(ming)?|hiking|jogging|rowing(?! machine))\b/i },
  { type: 'bodyweight_reps', re: /\b(push.?up|pull.?up|chin.?up|dip(?!s? lateral)|burpee|mountain climber|sit.?up|crunch|lunge( \(bodyweight\))?|air squat|jump squat|jumping jack|high knees|skater|inchworm|bear crawl|crab walk|donkey kick|fire hydrant|clamshell|dead bug|glute bridge( \(bodyweight\))?|hip thrust \(bodyweight\)|step.?up \(bodyweight\)|inverted row|tricep extension \(bodyweight\)|bench dip|chest dip|hanging leg raise|hanging knee raise|toe touch|flutter kick|scissor kick|reverse crunch|v.?up|tuck up|bicycle crunch|russian twist( \(bodyweight\))?|shoulder tap|pike push.?up|handstand push.?up|muscle.?up|kipping|ring row|frog jump)\b/i },
];

function inferLoggingType(name, equipment) {
  if (typeof name !== 'string') return 'weight_reps';
  for (const { type, re } of LOGGING_PATTERNS) if (re.test(name)) return type;
  if (equipment === 'bodyweight') return 'bodyweight_reps';
  return 'weight_reps';
}

// Convert raw wger-style muscle list → deduped canonical groups.
function canonicalize(muscles) {
  if (!Array.isArray(muscles)) return [];
  const out = new Set();
  for (const raw of muscles) {
    if (!raw) continue;
    const key = String(raw).toLowerCase().replace(/\s+/g, '_');
    const groups = MUSCLE_GROUP[key];
    if (groups) groups.forEach(g => out.add(g));
    else if (Object.values(MUSCLE_GROUP).flat().includes(key)) out.add(key); // already canonical
  }
  return [...out];
}

function inferGroupsFromName(name) {
  if (typeof name !== 'string') return [];
  const all = new Set();
  for (const { groups, re } of NAME_HINTS) {
    if (re.test(name)) groups.forEach(g => all.add(g));
  }
  return [...all];
}

async function fetchAll() {
  const PAGE = 1000;
  const all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('exercises')
      .select('id, name, equipment, primary_muscles, secondary_muscles, logging_type')
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

  const muscleSummary = {};
  const updates = [];

  for (const r of rows) {
    // Combine wger-mapped + name-inferred muscle groups
    const fromMuscles = canonicalize(r.primary_muscles);
    const fromName = inferGroupsFromName(r.name);
    let combined = [...new Set([...fromMuscles, ...fromName])];
    if (combined.length === 0) {
      // Last resort fallback so the exercise shows up under SOMETHING
      combined = ['other'];
    }

    const newLoggingType = inferLoggingType(r.name, r.equipment);
    const oldMuscles = (r.primary_muscles || []).map(m => String(m).toLowerCase());
    const oldLT = r.logging_type;

    const musclesDiffer = combined.length !== oldMuscles.length ||
      !combined.every(g => oldMuscles.includes(g));
    const ltDiffers = newLoggingType !== oldLT;

    for (const g of combined) muscleSummary[g] = (muscleSummary[g] || 0) + 1;

    if (musclesDiffer || ltDiffers) {
      updates.push({
        id: r.id,
        name: r.name,
        old_muscles: oldMuscles,
        new_muscles: combined,
        old_lt: oldLT,
        new_lt: newLoggingType,
      });
    }
  }

  console.log(`[recategorize] Distribution by muscle group:`);
  for (const [k, v] of Object.entries(muscleSummary).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(14)} ${v}`);
  }

  console.log(`[recategorize] ${updates.length} of ${rows.length} rows need updating`);
  if (DRY_RUN) {
    console.log('[recategorize] First 30 changes:');
    for (const u of updates.slice(0, 30)) {
      console.log(`  ${u.name}`);
      console.log(`    muscles: [${u.old_muscles.join(', ')}] → [${u.new_muscles.join(', ')}]`);
      if (u.old_lt !== u.new_lt) console.log(`    logging:  ${u.old_lt} → ${u.new_lt}`);
    }
    return;
  }

  const BATCH = 50;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    await Promise.all(batch.map(u =>
      supabase.from('exercises')
        .update({ primary_muscles: u.new_muscles, logging_type: u.new_lt })
        .eq('id', u.id)
    ));
    if (i % (BATCH * 4) === 0) console.log(`  ...${i + batch.length}/${updates.length}`);
  }
  console.log(`[recategorize] Done. Applied ${updates.length} updates.`);
}

run().catch(err => {
  console.error('[recategorize] Failed:', err);
  process.exit(1);
});
