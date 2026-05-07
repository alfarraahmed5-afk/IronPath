// clean-exercises.js
// 1. Renames complex/awkward wger exercise names to clean, simple names
// 2. Deduplicates: same logical exercise under different name formats
// 3. Merges FK references from duplicate losers → canonical winner
// 4. Re-runs muscle group canonicalization
//
// Run:      node scripts/clean-exercises.js
// Dry run:  DRY_RUN=1 node scripts/clean-exercises.js
// Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in backend/.env

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const DRY_RUN = !!process.env.DRY_RUN;

// ─── Direct rename map ────────────────────────────────────────────────────────
// Exact wger name → clean display name. Takes priority over pattern rules.
const DIRECT_RENAMES = {
  // Chest
  'Bench Press':                            'Barbell Bench Press',
  'Bench Press (Dumbbell)':                 'Dumbbell Bench Press',
  'Bench Press (Barbell)':                  'Barbell Bench Press',
  'Incline Bench Press (Dumbbell)':         'Incline Dumbbell Press',
  'Incline Bench Press (Barbell)':          'Incline Barbell Press',
  'Decline Bench Press (Barbell)':          'Decline Barbell Press',
  'Decline Bench Press (Dumbbell)':         'Decline Dumbbell Press',
  'Pec Deck':                               'Pec Deck Machine',
  'Cable crossover':                        'Cable Fly',
  'Cable Crossover':                        'Cable Fly',
  'Dumbbell Flyes':                         'Dumbbell Fly',
  'Incline Dumbbell Flyes':                 'Incline Dumbbell Fly',
  'Decline Dumbbell Flyes':                 'Decline Dumbbell Fly',
  'Butterfly':                              'Pec Deck Machine',
  'Chest Dips':                             'Chest Dip',
  'Push-Up (on knees)':                     'Knee Push-Up',
  'Wide-Grip Push-Up':                      'Wide Grip Push-Up',
  'Close-Grip Push-Up':                     'Diamond Push-Up',
  'Chest Press (Machine)':                  'Chest Press Machine',

  // Back
  'Bent Over Barbell Row':                  'Barbell Row',
  'Bent Over Row (Barbell)':                'Barbell Row',
  'Bent Over Row (Dumbbell)':               'Dumbbell Row',
  'One-Arm Dumbbell Row':                   'Single Arm Dumbbell Row',
  'Dumbbell Row (One Arm)':                 'Single Arm Dumbbell Row',
  'T-Bar Row':                              'T-Bar Row',
  'Cable Row (Seated, Close Grip)':         'Seated Cable Row',
  'Seated Cable Row':                       'Seated Cable Row',
  'Lat Pulldown':                           'Lat Pulldown',
  'Lat Pull-Down':                          'Lat Pulldown',
  'Lat Pulldown (Wide Grip)':               'Wide Grip Lat Pulldown',
  'Lat Pulldown (Close Grip)':              'Close Grip Lat Pulldown',
  'Lat Pulldown (Reverse Grip)':            'Reverse Grip Lat Pulldown',
  'Chin-Up':                                'Chin-Up',
  'Pull-Up':                                'Pull-Up',
  'Wide-Grip Pull-Up':                      'Wide Grip Pull-Up',
  'Hyperextension':                         'Back Extension',
  'Good Morning (Barbell)':                 'Good Morning',
  'Reverse Fly (Cable)':                    'Cable Rear Delt Fly',
  'Reverse Fly (Dumbbell)':                 'Rear Delt Fly',
  'Reverse Fly':                            'Rear Delt Fly',
  'Face Pull':                              'Cable Face Pull',
  'Deadlift (Barbell)':                     'Barbell Deadlift',
  'Sumo Deadlift (Barbell)':                'Sumo Deadlift',
  'Romanian Deadlift (Barbell)':            'Romanian Deadlift',
  'Romanian Deadlift (Dumbbell)':           'Dumbbell Romanian Deadlift',
  'Stiff-Legged Deadlift (Barbell)':        'Stiff Leg Deadlift',
  'Shrug (Barbell)':                        'Barbell Shrug',
  'Shrug (Dumbbell)':                       'Dumbbell Shrug',

  // Shoulders
  'Military Press (Barbell)':               'Overhead Press',
  'Overhead Press (Barbell)':               'Overhead Press',
  'Overhead Press (Dumbbell)':              'Dumbbell Shoulder Press',
  'Shoulder Press (Dumbbell)':              'Dumbbell Shoulder Press',
  'Shoulder Press (Machine)':               'Machine Shoulder Press',
  'Arnold Press':                           'Arnold Press',
  'Arnold Press (Dumbbell)':                'Arnold Press',
  'Lateral Raise (Dumbbell)':               'Lateral Raise',
  'Lateral Raise (Cable)':                  'Cable Lateral Raise',
  'Front Raise (Dumbbell)':                 'Front Raise',
  'Front Raise (Barbell)':                  'Barbell Front Raise',
  'Front Raise (Cable)':                    'Cable Front Raise',
  'Upright Row (Barbell)':                  'Barbell Upright Row',
  'Upright Row (Dumbbell)':                 'Dumbbell Upright Row',
  'Upright Row (Cable)':                    'Cable Upright Row',
  'Push Press':                             'Push Press',
  'Push Press (Barbell)':                   'Push Press',

  // Biceps
  'Bicep Curl (Barbell)':                   'Barbell Curl',
  'Bicep Curl (Dumbbell)':                  'Dumbbell Curl',
  'Bicep Curl (Cable)':                     'Cable Curl',
  'Barbell Curl':                           'Barbell Curl',
  'Dumbbell Curl':                          'Dumbbell Curl',
  'Hammer Curl (Dumbbell)':                 'Hammer Curl',
  'Hammer Curl':                            'Hammer Curl',
  'Concentration Curl (Dumbbell)':          'Concentration Curl',
  'Incline Dumbbell Curl':                  'Incline Curl',
  'Preacher Curl (Barbell)':                'Barbell Preacher Curl',
  'Preacher Curl (Dumbbell)':               'Dumbbell Preacher Curl',
  'Preacher Curl (Machine)':                'Machine Preacher Curl',
  'Reverse Curl (Barbell)':                 'Reverse Barbell Curl',
  'Cable Curl (Bar)':                       'Cable Curl',
  'Cable Curl (Rope)':                      'Rope Hammer Curl',
  '21s':                                    'Barbell 21s',

  // Triceps
  'Tricep Pushdown (Cable, Bar)':           'Tricep Pushdown',
  'Tricep Pushdown (Cable, Rope)':          'Rope Pushdown',
  'Tricep Pushdown':                        'Tricep Pushdown',
  'Skull Crusher (Barbell)':                'Skull Crusher',
  'Skull Crusher (Dumbbell)':               'Dumbbell Skull Crusher',
  'Skull Crusher (EZ Bar)':                 'EZ Bar Skull Crusher',
  'Overhead Tricep Extension (Dumbbell)':   'Overhead Tricep Extension',
  'Overhead Tricep Extension (Cable)':      'Cable Overhead Tricep Extension',
  'Overhead Tricep Extension (Barbell)':    'Barbell Overhead Tricep Extension',
  'Close-Grip Bench Press':                 'Close Grip Bench Press',
  'Tricep Dip':                             'Bench Dip',
  'Bench Dip':                              'Bench Dip',
  'Dips':                                   'Tricep Dip',
  'Kickback (Dumbbell)':                    'Tricep Kickback',
  'Tricep Kickback':                        'Tricep Kickback',
  'Diamond Push-Up':                        'Diamond Push-Up',
  'French Press (Barbell)':                 'EZ Bar Skull Crusher',
  'French Press (Dumbbell)':                'Overhead Tricep Extension',

  // Quads / Legs
  'Squat (Barbell)':                        'Barbell Squat',
  'Back Squat (Barbell)':                   'Barbell Squat',
  'Front Squat (Barbell)':                  'Front Squat',
  'Goblet Squat (Dumbbell)':                'Goblet Squat',
  'Goblet Squat (Kettlebell)':              'Kettlebell Goblet Squat',
  'Hack Squat (Machine)':                   'Hack Squat Machine',
  'Hack Squat (Barbell)':                   'Barbell Hack Squat',
  'Leg Press (Machine)':                    'Leg Press',
  'Leg Press':                              'Leg Press',
  'Leg Extension (Machine)':               'Leg Extension',
  'Leg Extension':                          'Leg Extension',
  'Walking Lunges':                         'Walking Lunge',
  'Lunge (Dumbbell)':                       'Dumbbell Lunge',
  'Lunge (Barbell)':                        'Barbell Lunge',
  'Reverse Lunge':                          'Reverse Lunge',
  'Step-Up (Dumbbell)':                     'Dumbbell Step-Up',
  'Step-Up (Barbell)':                      'Barbell Step-Up',
  'Bulgarian Split Squat':                  'Bulgarian Split Squat',
  'Bulgarian Split Squat (Dumbbell)':       'Dumbbell Bulgarian Split Squat',
  'Sissy Squat':                            'Sissy Squat',
  'Wall Sit':                               'Wall Sit',

  // Hamstrings
  'Leg Curl (Machine, Lying)':              'Lying Leg Curl',
  'Leg Curl (Machine, Seated)':             'Seated Leg Curl',
  'Leg Curl (Machine)':                     'Lying Leg Curl',
  'Leg Curl':                               'Lying Leg Curl',
  'Nordic Hamstring Curl':                  'Nordic Curl',
  'Good Morning':                           'Good Morning',

  // Glutes
  'Hip Thrust (Barbell)':                   'Hip Thrust',
  'Hip Thrust (Dumbbell)':                  'Dumbbell Hip Thrust',
  'Hip Thrust (Machine)':                   'Machine Hip Thrust',
  'Glute Bridge':                           'Glute Bridge',
  'Glute Bridge (Barbell)':                 'Barbell Glute Bridge',
  'Glute Kickback (Cable)':                 'Cable Glute Kickback',
  'Donkey Kick':                            'Donkey Kick',
  'Donkey Kickback':                        'Donkey Kick',
  'Cable Kickback':                         'Cable Glute Kickback',
  'Abductor Machine':                       'Hip Abductor Machine',
  'Adductor Machine':                       'Hip Adductor Machine',

  // Calves
  'Calf Raise (Standing, Machine)':         'Standing Calf Raise',
  'Calf Raise (Seated, Machine)':           'Seated Calf Raise',
  'Standing Calf Raise':                    'Standing Calf Raise',
  'Seated Calf Raise':                      'Seated Calf Raise',
  'Calf Raise (Donkey)':                    'Donkey Calf Raise',

  // Core
  'Crunches':                               'Crunch',
  'Reverse Crunch':                         'Reverse Crunch',
  'Leg Raise (Lying)':                      'Lying Leg Raise',
  'Leg Raise (Hanging)':                    'Hanging Leg Raise',
  'Knee Raise (Hanging)':                   'Hanging Knee Raise',
  'Ab Rollout':                             'Ab Wheel Rollout',
  'Ab Wheel':                               'Ab Wheel Rollout',
  'Russian Twist':                          'Russian Twist',
  'Cable Woodchop':                         'Cable Wood Chop',
  'Woodchopper':                            'Cable Wood Chop',
  'Pallof Press':                           'Pallof Press',
  'Side Plank':                             'Side Plank',
  'Dead Bug':                               'Dead Bug',
  'Bird Dog':                               'Bird Dog',
  'Bicycle Crunch':                         'Bicycle Crunch',
  'V-Up':                                   'V-Up',
  'Toe Touch':                              'Toe Touch',
  'Flutter Kick':                           'Flutter Kicks',
  'Scissor Kick':                           'Scissor Kicks',
  'Mountain Climbers':                      'Mountain Climber',
  'Oblique Crunch':                         'Oblique Crunch',
  'Dragon Flag':                            'Dragon Flag',
  'L-Sit':                                  'L-Sit Hold',

  // Forearms / Grip
  'Wrist Curl (Barbell)':                   'Wrist Curl',
  'Reverse Wrist Curl (Barbell)':           'Reverse Wrist Curl',
  'Farmers Walk':                           "Farmer's Carry",
  "Farmer's Walk":                          "Farmer's Carry",
  'Plate Pinch':                            'Plate Pinch',

  // Cardio / Full Body
  'Burpees':                                'Burpee',
  'Jumping Jacks':                          'Jumping Jack',
  'Jump Rope':                              'Jump Rope',
  'Jumping Rope':                           'Jump Rope',
  'Box Jump':                               'Box Jump',
  'Kettlebell Swing':                       'Kettlebell Swing',
  'Battle Ropes':                           'Battle Rope',
  'Sled Push':                              'Sled Push',
  'Sled Pull':                              'Sled Pull',
  'Tire Flip':                              'Tire Flip',
  'Thrusters':                              'Thruster',
  'Clean and Jerk':                         'Clean & Jerk',
  'Clean And Jerk':                         'Clean & Jerk',
  'Power Clean':                            'Power Clean',
  'Snatch':                                 'Snatch',

  // Common oddly-named wger exercises
  'Stiff-Legged Deadlift':                  'Stiff Leg Deadlift',
  'Dumbbell Lunges':                        'Dumbbell Lunge',
  'Dumbell Bicep Curl':                     'Dumbbell Curl',
  'Alternate Hammer Curl':                  'Alternating Hammer Curl',
  'Alternate Incline Dumbbell Curl':        'Alternating Incline Curl',
  'Wide-Grip Lat Pulldown':                 'Wide Grip Lat Pulldown',
  'Straight-Arm Lat Pulldown':              'Straight Arm Pulldown',
  'Kneeling Cable Crunch':                  'Cable Crunch',
  'Cable Crunch':                           'Cable Crunch',
  'Seated Dumbbell Shoulder Press':         'Dumbbell Shoulder Press',
  'Standing Dumbbell Shoulder Press':       'Dumbbell Shoulder Press',
  'Dumbbell Shoulder Press (Seated)':       'Dumbbell Shoulder Press',
  'EZ-Bar Curl':                            'EZ Bar Curl',
  'EZ Bar Bicep Curl':                      'EZ Bar Curl',
  'Triceps Pushdown':                       'Tricep Pushdown',
  'Triceps Dip':                            'Tricep Dip',
  'Tricep Extension (Cable)':               'Tricep Pushdown',
  'Overhead Dumbbell Extension':            'Overhead Tricep Extension',
  'Seated Leg Press':                       'Leg Press',
  'Lying Tricep Extension':                 'Skull Crusher',
  'Lying Tricep Extension (Barbell)':       'Skull Crusher',
  'Lying Tricep Extension (Dumbbell)':      'Dumbbell Skull Crusher',
  'Lying Leg Curl (Machine)':               'Lying Leg Curl',
  'Seated Leg Curl (Machine)':              'Seated Leg Curl',
  'Hip Abduction (Machine)':                'Hip Abductor Machine',
  'Hip Adduction (Machine)':                'Hip Adductor Machine',
  'Cable Pull Through':                     'Cable Pull-Through',
  'Straight-Leg Deadlift':                  'Stiff Leg Deadlift',
};

// ─── Pattern-based rename rules (applied when no direct match) ─────────────
// Transforms wger "Exercise Name (Equipment)" format to "Equipment Exercise Name"
function applyPatternRename(name) {
  // Pattern: "Name (Barbell)" → "Barbell Name"
  let m = name.match(/^(.+?)\s*\((Barbell|Dumbbell|Cable|Kettlebell|EZ.?Bar?)\)$/i);
  if (m) {
    const equip = m[2].replace(/ez.?bar?/i, 'EZ Bar').replace(/^./, c => c.toUpperCase());
    return `${equip} ${m[1].trim()}`;
  }

  // Pattern: "Name (Machine)" → "Name Machine"
  m = name.match(/^(.+?)\s*\((Machine)\)$/i);
  if (m) return `${m[1].trim()} Machine`;

  // Remove trivial qualifiers that add no value
  let n = name
    .replace(/\s*\((two arms?|one arm?|single arm?|bilateral|unilateral|alternating|supinated grip?|pronated grip?|neutral grip?|simultaneous|both arms?)\)/gi, '')
    .trim();

  // Normalize plural → singular for movement names
  n = n.replace(/\bCrunches\b/g, 'Crunch');
  n = n.replace(/\bLunges\b/g, 'Lunge');
  n = n.replace(/\bDips\b$/, 'Dip');
  n = n.replace(/\bPush-Ups\b/g, 'Push-Up');
  n = n.replace(/\bPull-Ups\b/g, 'Pull-Up');
  n = n.replace(/\bBurpees\b/g, 'Burpee');
  n = n.replace(/\bCurl\s+\(([^)]+)\)/g, '$1 Curl');

  return n;
}

function cleanName(rawName) {
  const name = rawName.trim();
  if (DIRECT_RENAMES[name]) return DIRECT_RENAMES[name];
  const patternResult = applyPatternRename(name);
  if (patternResult !== name) return patternResult;
  return name;
}

// ─── Dedup key: normalize for duplicate detection ─────────────────────────────
// Only removes TRULY trivial qualifiers (laterality, "HD" marker).
// KEEPS equipment words (barbell ≠ dumbbell) and grip/stance variants.
// Used only for comparison — never shown to users.
function dedupKey(name) {
  return name
    .toLowerCase()
    // Remove trivial laterality qualifiers
    .replace(/\s*\((two arms?|one arm?|single arm?|bilateral|unilateral|alternating|simultaneous|both arms?)\)\s*/gi, ' ')
    // Remove wger video-quality marker
    .replace(/\bhd\b/gi, '')
    // Remove hyphens so push-up = pushup
    .replace(/-/g, '')
    // Remove trailing plural 's' on words (lunges→lunge, crunches→crunch, push ups→push up)
    .replace(/([a-z]{3,})s\b/g, '$1')
    // Strip remaining punctuation
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Junk blocklist ───────────────────────────────────────────────────────────
// Exercises to delete outright: non-English, nonsensical, or data artifacts.
const JUNK_PATTERNS = [
  /^supino/i,          // Spanish/Italian (supine bench)
  /^inclinado/i,       // Spanish
  /^serratus/i,        // Anatomy label, not exercise name
  /\bhd\b/i,           // wger video exercises (duplicates of non-HD versions)
  /^cat.?cow\s*hd/i,
];

function isJunk(name) {
  return JUNK_PATTERNS.some(re => re.test(name));
}

// ─── Muscle canonicalization (mirrors recategorize-exercises.js) ─────────────
const MUSCLE_GROUP = {
  pectoralis_major: ['chest'], pectoralis_minor: ['chest'], chest: ['chest'], pecs: ['chest'],
  latissimus_dorsi: ['back','lats'], lats: ['back','lats'], back: ['back'], rhomboids: ['back'],
  trapezius: ['back','traps'], traps: ['back','traps'], paravertebrals: ['back'],
  erector_spinae: ['back'], lower_back: ['back'],
  anterior_deltoid: ['shoulders'], posterior_deltoid: ['shoulders'], lateral_deltoid: ['shoulders'],
  deltoids: ['shoulders'], shoulders: ['shoulders'], rear_delts: ['shoulders'],
  biceps: ['biceps'], brachialis: ['biceps'], brachioradialis: ['forearms'],
  triceps: ['triceps'], forearms: ['forearms'],
  quadriceps: ['quads'], quads: ['quads'], biceps_femoris: ['hamstrings'], hamstrings: ['hamstrings'],
  gluteus_maximus: ['glutes'], gluteus_medius: ['glutes'], glutes: ['glutes'],
  adductors: ['legs'], abductors: ['legs'],
  gastrocnemius: ['calves'], soleus: ['calves'], calves: ['calves'],
  rectus_abdominis: ['core'], obliques: ['core'], serratus_anterior: ['core'], abs: ['core'], core: ['core'],
  cardio: ['cardio'],
};

const NAME_HINTS = [
  { groups: ['chest'],       re: /\b(bench press|chest press|incline press|decline press|push.?up|pec deck|fly|cable fly|chest fly|dip\b)/i },
  { groups: ['back','lats'], re: /\b(pull.?up|chin.?up|lat pull|lat row|seated row|barbell row|t.?bar row|cable row|pulldown|inverted row|face pull|rear delt|reverse fly)/i },
  { groups: ['shoulders'],   re: /\b(overhead press|ohp|military press|shoulder press|arnold press|lateral raise|front raise|upright row|shrug|push press)/i },
  { groups: ['biceps'],      re: /\b(curl|chin.?up|hammer)/i },
  { groups: ['triceps'],     re: /\b(tricep|skull.?crusher|french press|kickback|push.?down|close.?grip bench|bench dip)/i },
  { groups: ['quads'],       re: /\b(squat|leg press|hack squat|lunge|step.?up|leg extension|sissy squat|thruster)/i },
  { groups: ['hamstrings'],  re: /\b(deadlift|romanian|rdl|leg curl|good morning|hamstring|nordic|stiff.?leg)/i },
  { groups: ['glutes'],      re: /\b(hip thrust|glute bridge|glute kickback|cable kickback|donkey kick|abductor|adductor)/i },
  { groups: ['calves'],      re: /\b(calf raise|calf press|tibialis)/i },
  { groups: ['core'],        re: /\b(plank|crunch|sit.?up|leg raise|knee raise|ab wheel|cable wood|russian twist|hollow|toe touch|dead bug|bird dog|side plank|reverse crunch|v.?up|mountain climber|oblique|flutter|scissor|bicycle|dragon|l.?sit|pallof|cable crunch)/i },
  { groups: ['cardio'],      re: /\b(run|sprint|cycl|jog|treadmill|elliptical|row(?!ing machine)|swim|hike|stair|jump rope|jumping rope|burpee|jumping jack|high knees|battle rope|box jump|sled)/i },
  { groups: ['forearms'],    re: /\b(forearm|wrist curl|farmer|plate pinch)/i },
  { groups: ['back'],        re: /\b(deadlift|shrug|pull-through|row)/i },
];

function canonicalizeMuscles(muscles) {
  if (!Array.isArray(muscles)) return [];
  const out = new Set();
  for (const raw of muscles) {
    if (!raw) continue;
    const key = String(raw).toLowerCase().replace(/\s+/g, '_');
    const groups = MUSCLE_GROUP[key];
    if (groups) groups.forEach(g => out.add(g));
    else if (Object.values(MUSCLE_GROUP).flat().includes(key)) out.add(key);
  }
  return [...out];
}

function inferGroupsFromName(name) {
  const all = new Set();
  for (const { groups, re } of NAME_HINTS) {
    if (re.test(name)) groups.forEach(g => all.add(g));
  }
  return [...all];
}

function finalMuscles(name, primaryMuscles) {
  const fromMuscles = canonicalizeMuscles(primaryMuscles);
  const fromName = inferGroupsFromName(name);
  const combined = [...new Set([...fromMuscles, ...fromName])];
  return combined.length > 0 ? combined : ['other'];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function fetchAll() {
  const all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('exercises')
      .select('id, name, primary_muscles, secondary_muscles, equipment, logging_type, wger_id, image_url, description, is_custom, gym_id')
      .is('gym_id', null)          // global exercises only; skip gym-specific customs
      .order('name')
      .range(offset, offset + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  return all;
}

async function mergeFKs(loserId, winnerId) {
  const tables = [
    { table: 'workout_exercises', col: 'exercise_id' },
    { table: 'personal_records',  col: 'exercise_id' },
    { table: 'routine_exercises', col: 'exercise_id' },
  ];
  const nullableTables = [
    { table: 'leaderboard_challenges', col: 'exercise_id' },
    { table: 'leaderboard_snapshots',  col: 'exercise_id' },
  ];
  for (const { table, col } of tables) {
    const { error } = await supabase.from(table).update({ [col]: winnerId }).eq(col, loserId);
    if (error && !error.message.includes('does not exist')) {
      console.warn(`  [warn] merging ${table}: ${error.message}`);
    }
  }
  for (const { table, col } of nullableTables) {
    const { error } = await supabase.from(table).update({ [col]: winnerId }).eq(col, loserId);
    if (error && !error.message.includes('does not exist')) {
      console.warn(`  [warn] merging ${table}: ${error.message}`);
    }
  }
}

async function run() {
  console.log(`\n[clean-exercises] Starting${DRY_RUN ? ' (DRY RUN — no DB writes)' : ''}…\n`);

  const exercises = await fetchAll();
  console.log(`[clean-exercises] Loaded ${exercises.length} global exercises\n`);

  // ── Step 0: Identify outright junk to delete ─────────────────────────────
  const junkIds = exercises.filter(ex => isJunk(ex.name)).map(ex => ex.id);
  const cleanExercises = exercises.filter(ex => !isJunk(ex.name));
  console.log(`[clean-exercises] ${junkIds.length} junk/non-English exercises flagged for deletion:`);
  exercises.filter(ex => isJunk(ex.name)).forEach(ex => console.log(`  - "${ex.name}"`));

  // ── Step 1: Build rename + muscle-update list ─────────────────────────────
  const renames = [];     // { id, oldName, newName, newMuscles }
  for (const ex of cleanExercises) {
    const newName = cleanName(ex.name);
    const newMuscles = finalMuscles(newName, ex.primary_muscles);
    const oldMuscles = (ex.primary_muscles || []).map(m => String(m).toLowerCase());

    const nameChanged = newName !== ex.name;
    const musclesChanged = newMuscles.length !== oldMuscles.length || !newMuscles.every(m => oldMuscles.includes(m));

    if (nameChanged || musclesChanged) {
      renames.push({ id: ex.id, oldName: ex.name, newName, oldMuscles, newMuscles, nameChanged, musclesChanged });
    }
  }
  console.log(`[clean-exercises] ${renames.length} exercises need rename / recategorization`);
  if (renames.filter(r => r.nameChanged).length > 0) {
    console.log('\nName changes:');
    for (const r of renames.filter(r => r.nameChanged).slice(0, 50)) {
      console.log(`  "${r.oldName}" → "${r.newName}"`);
    }
    if (renames.filter(r => r.nameChanged).length > 50) {
      console.log(`  ... and ${renames.filter(r => r.nameChanged).length - 50} more`);
    }
  }

  // ── Step 2: Find duplicates using dedup key ───────────────────────────────
  // Use the *new* name for the dedup key so renames consolidate properly.
  const groups = new Map(); // dedupKey → [exercise]
  for (const ex of cleanExercises) {
    const newName = cleanName(ex.name);
    const key = dedupKey(newName);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...ex, newName });
  }

  const duplicateGroups = [...groups.values()].filter(g => g.length > 1);
  console.log(`\n[clean-exercises] ${duplicateGroups.length} duplicate groups found`);

  const toDelete = [];   // losers
  const merges = [];     // { loserId, winnerId, loserName, winnerName }

  for (const group of duplicateGroups) {
    // Pick winner: prefer entry with wger_id + image_url, then wger_id, then image_url, then first
    group.sort((a, b) => {
      const scoreA = (a.wger_id ? 2 : 0) + (a.image_url ? 1 : 0) + (a.description ? 1 : 0);
      const scoreB = (b.wger_id ? 2 : 0) + (b.image_url ? 1 : 0) + (b.description ? 1 : 0);
      return scoreB - scoreA;
    });
    const winner = group[0];
    const losers = group.slice(1);
    console.log(`  [dup] "${winner.newName}" (keep) ← merging: ${losers.map(l => `"${l.name}"`).join(', ')}`);
    for (const loser of losers) {
      merges.push({ loserId: loser.id, winnerId: winner.id, loserName: loser.name, winnerName: winner.newName });
      toDelete.push(loser.id);
    }
  }

  console.log(`\n[clean-exercises] Summary:`);
  console.log(`  Renames/recategorizations : ${renames.length}`);
  console.log(`  Junk to delete            : ${junkIds.length}`);
  console.log(`  Duplicates to delete      : ${toDelete.length}`);
  console.log(`  Final exercise count      : ${exercises.length - toDelete.length - junkIds.length}`);

  if (DRY_RUN) {
    console.log('\n[clean-exercises] DRY RUN — no changes written. Remove DRY_RUN=1 to apply.\n');
    return;
  }

  // ── Step 3: Apply renames + muscle updates ────────────────────────────────
  console.log('\n[clean-exercises] Applying renames and muscle updates…');
  const BATCH = 25;
  for (let i = 0; i < renames.length; i += BATCH) {
    const batch = renames.slice(i, i + BATCH);
    await Promise.all(batch.map(r => {
      const patch = {};
      if (r.nameChanged) patch.name = r.newName;
      if (r.musclesChanged) patch.primary_muscles = r.newMuscles;
      return supabase.from('exercises').update(patch).eq('id', r.id);
    }));
    if ((i + BATCH) % 100 === 0) console.log(`  ...${Math.min(i + BATCH, renames.length)}/${renames.length}`);
  }
  console.log(`  Applied ${renames.length} updates.`);

  // ── Step 3b: Delete junk exercises ───────────────────────────────────────
  if (junkIds.length > 0) {
    console.log('\n[clean-exercises] Merging FK refs for junk then deleting…');
    // Junk exercises shouldn't have workout references but be safe
    for (const jid of junkIds) await mergeFKs(jid, jid); // no-op merge (loser = winner = jid, will update 0 rows)
    for (let i = 0; i < junkIds.length; i += 25) {
      const batch = junkIds.slice(i, i + 25);
      await supabase.from('exercises').delete().in('id', batch);
    }
    console.log(`  Deleted ${junkIds.length} junk exercises.`);
  }

  // ── Step 4: Merge FK references then delete duplicates ────────────────────
  if (merges.length > 0) {
    console.log('\n[clean-exercises] Merging FK references for duplicates…');
    for (const m of merges) {
      await mergeFKs(m.loserId, m.winnerId);
    }

    console.log('[clean-exercises] Deleting duplicate losers…');
    for (let i = 0; i < toDelete.length; i += 25) {
      const batch = toDelete.slice(i, i + 25);
      const { error } = await supabase.from('exercises').delete().in('id', batch);
      if (error) console.warn(`  [warn] delete batch: ${error.message}`);
    }
    console.log(`  Deleted ${toDelete.length} duplicate exercises.`);
  }

  console.log('\n[clean-exercises] Done.\n');
}

run().catch(err => {
  console.error('[clean-exercises] Fatal:', err);
  process.exit(1);
});
