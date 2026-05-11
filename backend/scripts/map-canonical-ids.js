// Phase-2 helper for the exercise cleanup audit.
//
// For each W.* constant in trainer-templates.js, each leaderboard
// [wger_id, name] tuple, and each strength-standards key, search the
// production exercises table by name + equipment / muscle filters and
// produce a confident wger_id mapping.
//
// READ-ONLY. Prints a markdown table + JSON file to
// skills/exercise-cleanup/ID-MAPPING.md / id-mapping.json
//
// The matching strategy:
//   1. Each target supplies one or more `name_re` regex patterns AND
//      optional disqualifiers (regex that, if present, drops the row).
//   2. We score every candidate row by:
//        + has image_url
//        + has wger_id
//        + name matches first pattern (vs alt patterns)
//        + equipment matches expected equipment (if specified)
//        + primary_muscles intersects expected muscles
//        - disqualifier hit
//   3. Highest score wins, ties broken by shortest name and lowest wger_id.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '../../skills/exercise-cleanup');
fs.mkdirSync(OUT_DIR, { recursive: true });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ---------- target catalog ----------

// `name_re` -- ORDERED. First pattern is the strongest signal.
// `must_not` -- regex; if matches, disqualify.
// `equipment` -- expected equipment value (string) for tie-breaking.
// `muscles` -- expected primary muscle keywords (case-insensitive subset).
// `kind` -- 'trainer' / 'leaderboard' / 'strength' / 'mobile'. Just a label.

const TARGETS = [
  // ---------- trainer-templates W.* constants ----------
  {
    label: 'SQUAT',
    kind: 'trainer',
    name_re: [/^barbell squat$/i, /^squats?$/i, /^back squat$/i, /^high[- ]bar squat$/i],
    must_not: /(front|hack|split|sissy|jefferson|zercher|bulgarian|goblet|sumo|safety|smith|pause|jump|box|wall|landmine|overhead|pistol|cossack)/i,
    equipment: 'barbell',
    muscles: ['quadriceps', 'glutes'],
  },
  {
    label: 'BENCH',
    kind: 'trainer',
    name_re: [/^barbell bench press$/i, /^bench press$/i, /^flat bench press$/i],
    must_not: /(decline|incline|dumbbell|smith|close[- ]grip|reverse|floor|spoto|pin|paused|underhand|guillotine|board|machine|cable|trx|narrow)/i,
    equipment: 'barbell',
    muscles: ['chest', 'pectorals'],
  },
  {
    label: 'DEADLIFT',
    kind: 'trainer',
    name_re: [/^conventional deadlift$/i, /^barbell deadlift$/i, /^deadlifts?$/i, /^deadlift$/i],
    must_not: /(sumo|romanian|stiff|trap|hex|deficit|rack|paused|snatch[- ]grip|jefferson|single|hex|smith|landmine|kettlebell|dumbbell|kb|db|good morning|cable|wide)/i,
    equipment: 'barbell',
    muscles: ['glutes', 'hamstrings', 'erector', 'back'],
  },
  {
    label: 'OHP',
    kind: 'trainer',
    name_re: [/^overhead press$/i, /^standing (military|overhead|barbell shoulder) press$/i, /^military press$/i, /^barbell shoulder press$/i, /^press$/i],
    must_not: /(dumbbell|smith|seated|push|jerk|landmine|machine|kettlebell|kb|db|behind|partial|pin|z[- ]press)/i,
    equipment: 'barbell',
    muscles: ['shoulders', 'deltoids', 'anterior_deltoid'],
  },
  {
    label: 'ROW',
    kind: 'trainer',
    name_re: [/^barbell row \(overhand\)$/i, /^barbell row$/i, /^bent[- ]over (barbell )?row$/i, /^pendlay row$/i, /^bent over rowing$/i],
    must_not: /(dumbbell|cable|smith|t[- ]bar|machine|seal|chest[- ]supported|inverted|kroc|landmine|reverse|underhand|yates|meadows|pendlay row \(underhand\)|wide|narrow|trx|kettlebell|kb|db|one[- ]arm)/i,
    equipment: 'barbell',
    muscles: ['lats', 'mid_back', 'upper_back', 'rhomboids', 'back'],
  },
  {
    label: 'RDLIFT',
    kind: 'trainer',
    name_re: [/^romanian deadlift$/i, /^barbell romanian deadlift/i, /^stiff[- ]leg(ged)? deadlift$/i],
    must_not: /(dumbbell|kettlebell|kb|db|single[- ]leg|smith|deficit|trap|hex|cable|landmine|sumo|snatch)/i,
    equipment: 'barbell',
    muscles: ['hamstrings', 'glutes'],
  },
  {
    label: 'PULLUP',
    kind: 'trainer',
    name_re: [/^pull[- ]ups?$/i, /^pull up$/i, /^pullup$/i],
    must_not: /(chin|assisted|wide|narrow|close|neutral|weighted|kipping|band|trx|machine|negative|towel|jumping)/i,
    equipment: null,
    muscles: ['lats', 'back'],
  },
  {
    label: 'LAT_PD',
    kind: 'trainer',
    name_re: [/^lat pull[- ]?down$/i, /^lat pulldown$/i, /^pulldown$/i, /^wide grip lat pulldown$/i, /^cable lat pulldown$/i],
    must_not: /(reverse|underhand|narrow|close|neutral|single|one[- ]arm|kneeling|behind|straight[- ]arm|machine)/i,
    equipment: 'cable',
    muscles: ['lats', 'back'],
  },
  {
    label: 'CURL',
    kind: 'trainer',
    name_re: [/^barbell (biceps )?curl$/i, /^biceps curl with barbell$/i, /^barbell curls$/i],
    must_not: /(dumbbell|cable|preacher|incline|spider|reverse|ez|drag|concentration|hammer|zottman|machine|tlow|chair|hercules|trx|kettlebell|kb|db|underhand|wide|close|narrow)/i,
    equipment: 'barbell',
    muscles: ['biceps', 'arms'],
  },
  {
    label: 'PUSHUP',
    kind: 'trainer',
    name_re: [/^push[- ]?ups?$/i, /^push up$/i, /^pushup$/i],
    must_not: /(diamond|wide|close|narrow|incline|decline|deficit|pike|archer|hindu|clap|knee|wall|tricep|spider|one[- ]arm|handstand|atomic|plyo|plyometric|t[- ]push|alternating|knuckle|reverse|sphinx|hand release)/i,
    equipment: null,
    muscles: ['chest'],
  },
  {
    label: 'LUNGE',
    kind: 'trainer',
    name_re: [/^barbell lunge( standing)?$/i, /^walking lunges?$/i, /^reverse lunges?$/i, /^lunges?$/i],
    must_not: /(side|lateral|curtsy|side[- ]to[- ]side|jump|cossack|bulgarian|deficit|elevated|clock)/i,
    equipment: null,
    muscles: ['quadriceps', 'glutes', 'legs'],
  },
  {
    label: 'PLANK',
    kind: 'trainer',
    name_re: [/^plank$/i, /^forearm plank$/i, /^elbow plank$/i],
    must_not: /(side|reverse|extended|walking|spider|saw|hover|high|long|up|down|pulse|reach|leg|knee|tap|with|to|jack|star|alternating|shoulder|tree|crucifix|copenhagen|w[/-]|w )/i,
    equipment: null,
    muscles: ['abdominals', 'core', 'abs'],
  },
  {
    label: 'BURPEE',
    kind: 'trainer',
    name_re: [/^burpees?$/i],
    must_not: /(half|tuck|dumbbell|kettlebell|broad|over[- ]?the|wall|box)/i,
    equipment: null,
    muscles: [],
  },
  {
    label: 'RUNNING',
    kind: 'trainer',
    name_re: [/^running$/i, /^zone 2 running$/i, /^jogging$/i, /^run$/i],
    must_not: /(treadmill|hill|sprint|tempo|interval|fartlek|backwards|in place|march|bear|man|crab|stairs|rope|bird|side|crawl|stair)/i,
    equipment: null,
    muscles: [],
  },
  {
    label: 'GOBLET_SQ',
    kind: 'trainer',
    name_re: [/^(dumbbell )?goblet squat$/i, /^kettlebell goblet squat$/i],
    must_not: /^$/i,
    equipment: null,
    muscles: ['quadriceps', 'glutes'],
  },
  {
    label: 'SPLIT_SQ',
    kind: 'trainer',
    // Prefer the "Bulgarian split squat" if available, otherwise plain
    // "Split Squat". Side-split rows (left/right) accepted -- we'll
    // pick the lower wger_id consistently.
    name_re: [/^bulgarian split squats?( left)?$/i, /^bulgarian split squats? right$/i, /^split squats?( left)?$/i, /^split squats? right$/i],
    must_not: /(side[ -]split|smith)/i,
    equipment: null,
    muscles: ['quadriceps', 'glutes'],
  },
  {
    label: 'DB_BENCH',
    kind: 'trainer',
    name_re: [/^dumbbell bench press$/i, /^db bench press$/i, /^flat dumbbell bench press$/i],
    must_not: /(incline|decline|close|wide|reverse|floor|one[- ]arm|alternating|neutral|hex|svend|push|chest fly|fly|squeeze)/i,
    equipment: 'dumbbell',
    muscles: ['chest'],
  },
  {
    label: 'DB_SHOULDER',
    kind: 'trainer',
    name_re: [/^dumbbell shoulder press$/i, /^seated dumbbell shoulder press$/i, /^dumbbell overhead press$/i, /^standing dumbbell shoulder press$/i],
    must_not: /(arnold|alternating|neutral|hammer|push|seated machine|one[- ]arm|reverse grip|behind|z[- ]press|arnold)/i,
    equipment: 'dumbbell',
    muscles: ['shoulders', 'deltoids'],
  },
  {
    label: 'DB_ROW',
    kind: 'trainer',
    name_re: [/^(one[- ]arm |single[- ]arm )?dumbbell row$/i, /^db row$/i, /^bent over dumbbell row$/i],
    must_not: /(incline|chest[- ]supported|kroc|renegade|meadows|landmine|machine|alternating|two[- ]arm|seated|reverse|underhand|gorilla|head supported)/i,
    equipment: 'dumbbell',
    muscles: ['lats', 'back', 'mid_back'],
  },
  {
    label: 'DB_CURL',
    kind: 'trainer',
    name_re: [/^dumbbell curl$/i, /^dumbbell biceps curl$/i, /^standing dumbbell curl$/i, /^alternating dumbbell curl$/i],
    must_not: /(incline|preacher|spider|hammer|reverse|concentration|zottman|drag|cross|prone|seated|alternative|cable|barbell|alternating bicep curls)/i,
    equipment: 'dumbbell',
    muscles: ['biceps', 'arms'],
  },
];

// ---------- leaderboard targets ----------
// Mirrors leaderboard-exercises.js (35 entries).
const LEADERBOARD_TARGETS = [
  // Compound / powerlifting
  { label: 'LB_BARBELL_SQUAT',     display: 'Barbell Squat',          name_re: [/^barbell squat$/i, /^squats?$/i],          must_not: /(front|hack|split|smith|goblet|sumo|jump|box|wall|landmine|overhead|safety|pause)/i, equipment: 'barbell' },
  { label: 'LB_BARBELL_BENCH',     display: 'Barbell Bench Press',    name_re: [/^barbell bench press$/i, /^bench press$/i], must_not: /(decline|incline|dumbbell|smith|close|reverse|floor|machine|cable|trx|paused)/i, equipment: 'barbell' },
  { label: 'LB_BARBELL_DEADLIFT',  display: 'Barbell Deadlift',       name_re: [/^conventional deadlift$/i, /^barbell deadlift$/i, /^deadlifts?$/i], must_not: /(sumo|romanian|stiff|trap|hex|deficit|rack|paused|snatch[- ]grip|jefferson|kettlebell|dumbbell|kb|db|good morning|wide)/i, equipment: 'barbell' },
  { label: 'LB_OVERHEAD_PRESS',    display: 'Overhead Press',         name_re: [/^overhead press$/i, /^standing military press$/i, /^military press$/i, /^standing barbell shoulder press$/i], must_not: /(dumbbell|smith|seated|push|jerk|landmine|machine|kettlebell|kb|db|behind|z[- ]press)/i, equipment: 'barbell' },
  { label: 'LB_BARBELL_ROW',       display: 'Barbell Row',            name_re: [/^barbell row \(overhand\)$/i, /^barbell row$/i, /^bent[- ]over barbell row$/i, /^pendlay row$/i, /^bent over rowing$/i], must_not: /(dumbbell|cable|smith|t[- ]bar|machine|seal|chest[- ]supported|inverted|kroc|landmine|reverse|underhand|yates|meadows|trx|kettlebell|kb|db|one[- ]arm)/i, equipment: 'barbell' },
  { label: 'LB_RDL',               display: 'Romanian Deadlift',      name_re: [/^romanian deadlift$/i, /^barbell romanian deadlift/i, /^stiff[- ]legged? deadlift$/i], must_not: /(dumbbell|kettlebell|kb|db|single[- ]leg|smith|deficit|trap|hex|sumo)/i, equipment: 'barbell' },
  { label: 'LB_SUMO_DL',           display: 'Sumo Deadlift',          name_re: [/^sumo deadlift$/i, /^barbell sumo deadlift$/i], must_not: /(romanian|stiff|deficit|trap|kettlebell|dumbbell)/i, equipment: 'barbell' },
  { label: 'LB_FRONT_SQ',          display: 'Front Squat',            name_re: [/^front squat$/i, /^barbell front squat$/i], must_not: /(smith|safety|hack|split|jump)/i, equipment: 'barbell' },
  { label: 'LB_TRAP_BAR_DL',       display: 'Trap Bar Deadlift',      name_re: [/^trap bar deadlift$/i, /^hex bar deadlift$/i], must_not: /(romanian|sumo)/i, equipment: null },

  // Upper body pulls
  { label: 'LB_PULLUP',            display: 'Pull-Up',                name_re: [/^pull[- ]ups?$/i, /^pull up$/i, /^pullup$/i], must_not: /(chin|assisted|wide|narrow|close|neutral|weighted|kipping|band|trx|machine|negative|towel|jumping)/i, equipment: null },
  { label: 'LB_CHINUP',            display: 'Chin-Up',                name_re: [/^chin[- ]ups?$/i, /^chin up$/i, /^chinup$/i], must_not: /(assisted|weighted|negative|kipping|machine|band)/i, equipment: null },
  { label: 'LB_LAT_PULLDOWN',      display: 'Lat Pulldown',           name_re: [/^lat pull[- ]?down$/i, /^lat pulldown$/i, /^wide[- ]grip lat pulldown$/i], must_not: /(reverse|underhand|narrow|close|neutral|single|one[- ]arm|kneeling|behind|straight[- ]arm)/i, equipment: 'cable' },
  { label: 'LB_SEATED_CABLE_ROW',  display: 'Seated Cable Row',       name_re: [/^seated cable rows?$/i, /^cable row$/i], must_not: /(unilateral|single|one[- ]arm|wide|narrow|underhand|reverse|standing|kneeling|inclined|t[- ]bar|machine)/i, equipment: 'cable' },

  // Chest
  { label: 'LB_INCLINE_BB_BENCH',  display: 'Incline Barbell Press',  name_re: [/^incline barbell bench press$/i, /^incline bench press$/i, /^incline barbell press$/i], must_not: /(dumbbell|smith|reverse|machine|close)/i, equipment: 'barbell' },
  { label: 'LB_DECLINE_BB_BENCH',  display: 'Decline Barbell Press',  name_re: [/^decline barbell bench press$/i, /^decline bench press$/i, /^decline barbell press$/i], must_not: /(dumbbell|smith|reverse|machine)/i, equipment: 'barbell' },
  { label: 'LB_DB_BENCH',          display: 'Dumbbell Bench Press',   name_re: [/^dumbbell bench press$/i, /^flat dumbbell bench press$/i, /^db bench press$/i], must_not: /(incline|decline|close|wide|reverse|floor|one[- ]arm|alternating|neutral|hex|svend|push|fly|squeeze)/i, equipment: 'dumbbell' },
  { label: 'LB_CABLE_FLY',         display: 'Cable Fly',              name_re: [/^cable (chest )?fly( standing)?$/i, /^cable crossover$/i], must_not: /(low|high|reverse|unilateral|seated|incline|decline|standing reverse)/i, equipment: 'cable' },
  { label: 'LB_PEC_DECK',          display: 'Pec Deck Machine',       name_re: [/^pec deck( machine)?$/i, /^pec deck fly$/i, /^chest fly machine$/i, /^butterfly machine$/i], must_not: /(rear|reverse)/i, equipment: 'machine' },

  // Shoulders
  { label: 'LB_DB_SHOULDER',       display: 'Dumbbell Shoulder Press',name_re: [/^dumbbell shoulder press$/i, /^seated dumbbell shoulder press$/i, /^standing dumbbell shoulder press$/i, /^dumbbell overhead press$/i], must_not: /(arnold|alternating|neutral|hammer|push|machine|seated machine|one[- ]arm|reverse grip|behind|z[- ]press)/i, equipment: 'dumbbell' },
  { label: 'LB_LATERAL_RAISE',     display: 'Lateral Raise',          name_re: [/^(dumbbell )?lateral raise$/i, /^side lateral raise$/i, /^standing dumbbell lateral raise$/i], must_not: /(rear|cable|machine|seated|incline|leaning|bent|y[- ]raise|partial|6[- ]way|3[- ]way)/i, equipment: 'dumbbell' },
  { label: 'LB_ARNOLD_PRESS',      display: 'Arnold Press',           name_re: [/^arnold press$/i, /^dumbbell arnold press$/i, /^seated arnold press$/i], must_not: /^$/i, equipment: 'dumbbell' },
  { label: 'LB_FACE_PULL',         display: 'Cable Face Pull',        name_re: [/^cable face pulls?$/i, /^face pulls?$/i], must_not: /(band|trx|standing reverse|elastic)/i, equipment: 'cable' },

  // Arms
  { label: 'LB_BB_CURL',           display: 'Barbell Curl',           name_re: [/^barbell (biceps )?curl$/i, /^biceps curl with barbell$/i, /^standing barbell curl$/i], must_not: /(dumbbell|cable|preacher|incline|spider|reverse|ez|drag|concentration|hammer|zottman|machine|underhand|wide|close|narrow)/i, equipment: 'barbell' },
  { label: 'LB_HAMMER_CURL',       display: 'Hammer Curl',            name_re: [/^(dumbbell )?hammer curls?$/i, /^standing hammer curl$/i, /^seated hammer curl$/i], must_not: /(cable|rope|cross[- ]body|incline|spider|preacher|trx|reverse)/i, equipment: 'dumbbell' },
  { label: 'LB_PREACHER_CURL',     display: 'Barbell Preacher Curl',  name_re: [/^barbell preacher curl$/i, /^preacher curl$/i, /^preacher curls?$/i], must_not: /(dumbbell|machine|ez|cable|reverse|hammer|spider)/i, equipment: 'barbell' },
  { label: 'LB_INCLINE_CURL',      display: 'Incline Curl',           name_re: [/^incline (dumbbell )?curls?$/i, /^incline dumbbell biceps curl$/i, /^incline biceps curl$/i], must_not: /(hammer|reverse|spider|preacher|cable|machine)/i, equipment: 'dumbbell' },
  { label: 'LB_TRI_PUSHDOWN',      display: 'Tricep Pushdown',        name_re: [/^(cable )?(tri(ceps?)?|triceps?) ?push[- ]?down$/i, /^triceps cable pushdown$/i, /^rope pushdown$/i, /^pushdown$/i], must_not: /(reverse|overhead|underhand|v[- ]bar|single|one[- ]arm|kneeling|machine|incline)/i, equipment: 'cable' },
  { label: 'LB_SKULL_CRUSHER',     display: 'Skull Crusher',          name_re: [/^skull crusher$/i, /^skullcrushers?$/i, /^lying triceps extension$/i, /^french press$/i, /^barbell skull crusher$/i, /^ez bar skull crusher$/i], must_not: /(dumbbell|incline|cable|standing|seated|single|one[- ]arm)/i, equipment: null },
  { label: 'LB_CLOSE_GRIP_BENCH',  display: 'Close Grip Bench Press', name_re: [/^close[- ]?grip bench press$/i, /^close grip barbell bench press$/i, /^narrow grip bench press$/i], must_not: /(dumbbell|smith|incline|decline|reverse|underhand|machine|pin)/i, equipment: 'barbell' },
  { label: 'LB_TRICEP_DIP',        display: 'Tricep Dip',             name_re: [/^(tri(ceps?)? )?dips?$/i, /^parallel bar dips$/i, /^bar dips?$/i, /^body weight dips?$/i, /^chest dips?$/i], must_not: /(bench|chair|machine|assisted|weighted|trx|ring|floor|tablebed)/i, equipment: null },

  // Legs
  { label: 'LB_LEG_PRESS',         display: 'Leg Press',              name_re: [/^leg press$/i, /^45 degree leg press$/i, /^horizontal leg press$/i], must_not: /(single|one[- ]leg|calf|hack|kneeling|standing|reverse|inverted)/i, equipment: 'machine' },
  { label: 'LB_LYING_LEG_CURL',    display: 'Lying Leg Curl',         name_re: [/^lying leg curl$/i, /^prone leg curl$/i], must_not: /(seated|standing|single|one[- ]leg|cable|nordic|swiss|elastic)/i, equipment: 'machine' },
  { label: 'LB_LEG_EXT',           display: 'Leg Extension',          name_re: [/^leg extensions?$/i, /^seated leg extension$/i], must_not: /(reverse|cable|single|one[- ]leg|standing|elastic|hip)/i, equipment: 'machine' },
  { label: 'LB_HIP_THRUST',        display: 'Hip Thrust',             name_re: [/^(barbell )?hip thrust$/i, /^barbell hip thrust$/i], must_not: /(single|one[- ]leg|machine|smith|kettlebell|dumbbell|cable|band|elevated|elastic)/i, equipment: 'barbell' },
  { label: 'LB_BULGARIAN_SS',      display: 'Bulgarian Split Squat',  name_re: [/^bulgarian split squat( left)?$/i, /^bulgarian split squat right$/i, /^bulgarian split squats? ?(left|right)?$/i], must_not: /(smith)/i, equipment: null },
  { label: 'LB_BARBELL_LUNGE',     display: 'Barbell Lunge',          name_re: [/^barbell lunge( standing)?$/i, /^barbell walking lunge$/i, /^barbell reverse lunge$/i], must_not: /(dumbbell|smith|side|curtsy)/i, equipment: 'barbell' },
  { label: 'LB_STANDING_CALF',     display: 'Standing Calf Raise',    name_re: [/^standing calf raises?$/i, /^calf raises?$/i, /^barbell standing calf raise$/i, /^machine standing calf raise$/i], must_not: /(seated|single|one[- ]leg|donkey|tibialis|reverse|left|right|elastic)/i, equipment: null },
];

// strength-standards entries -- shared with leaderboard (squat, bench, dl, ohp, row).
const STRENGTH_TARGETS = [
  // re-use same names so we can confirm consistency
  { label: 'SS_SQUAT',    display: 'Squat',                    ref: 'LB_BARBELL_SQUAT' },
  { label: 'SS_BENCH',    display: 'Bench Press (Barbell)',    ref: 'LB_BARBELL_BENCH' },
  { label: 'SS_DL',       display: 'Deadlift (Conventional)',  ref: 'LB_BARBELL_DEADLIFT' },
  { label: 'SS_OHP',      display: 'Overhead Press (Barbell)', ref: 'LB_OVERHEAD_PRESS' },
  { label: 'SS_BB_ROW',   display: 'Barbell Row',              ref: 'LB_BARBELL_ROW' },
];

// ---------- scoring ----------

function loadInventory() {
  const p = path.join(OUT_DIR, 'inventory.json');
  if (!fs.existsSync(p)) {
    console.error('inventory.json missing -- run audit-exercises.js first.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function scoreRow(row, target) {
  const name = row.name || '';
  const eq = row.equipment;
  const pm = (row.primary_muscles || []).map(s => String(s).toLowerCase());

  if (target.must_not && target.must_not.test(name)) return null;

  let score = 0;
  let matchedRe = null;

  for (let i = 0; i < target.name_re.length; i++) {
    if (target.name_re[i].test(name)) {
      // earlier patterns are stronger signals
      score += 12 - i * 2;
      matchedRe = target.name_re[i].source;
      break;
    }
  }
  if (!matchedRe) return null;

  if (row.wger_id != null) score += 2;
  if (row.image_url) score += 2;
  if (target.equipment && eq === target.equipment) score += 4;
  else if (target.equipment && eq && eq !== target.equipment) score -= 4;

  if (target.muscles && target.muscles.length > 0) {
    const hit = target.muscles.some(m => pm.some(p => p.includes(m.toLowerCase())));
    if (hit) score += 3;
  }

  // Penalize very long names (often qualifier-heavy variants).
  if (name.length > 40) score -= 1;

  return { score, matchedRe };
}

function findBest(rows, target) {
  const candidates = [];
  for (const r of rows) {
    const s = scoreRow(r, target);
    if (s) candidates.push({ row: r, ...s });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // shorter name wins
    if (a.row.name.length !== b.row.name.length) return a.row.name.length - b.row.name.length;
    // lower wger_id wins (older = more stable)
    return (a.row.wger_id ?? 1e9) - (b.row.wger_id ?? 1e9);
  });
  return candidates;
}

// ---------- output ----------

(function main() {
  const rows = loadInventory();
  console.log(`Loaded ${rows.length} rows from inventory.json.`);

  const results = {};
  const out = [];

  // existing constants for reference
  const OLD_TRAINER = {
    SQUAT: 1627, BENCH: 73, DEADLIFT: 184, OHP: 687, ROW: 1698,
    RDLIFT: 1700, PULLUP: 1929, LAT_PD: 0, CURL: 1290, PUSHUP: 0,
    LUNGE: 46, PLANK: 0, BURPEE: 0, RUNNING: 908, GOBLET_SQ: 203,
    SPLIT_SQ: 988, DB_BENCH: 1676, DB_SHOULDER: 1337, DB_ROW: 310, DB_CURL: 1931,
  };

  function emit(target, oldId, ref) {
    const cands = findBest(rows, target);
    const best = cands?.[0];
    const alts = cands?.slice(1, 4) ?? [];
    results[target.label] = best ? best.row : null;
    out.push({
      kind: target.kind,
      label: target.label,
      display: target.display ?? null,
      old_id: oldId ?? null,
      best,
      alts,
      ref: ref ?? null,
    });
  }

  for (const t of TARGETS) {
    emit(t, OLD_TRAINER[t.label] ?? null);
  }
  for (const t of LEADERBOARD_TARGETS) {
    emit({ ...t, kind: 'leaderboard' });
  }
  for (const t of STRENGTH_TARGETS) {
    // reuse leaderboard hit
    const ref = results[t.ref];
    out.push({
      kind: 'strength',
      label: t.label,
      display: t.display,
      old_id: null,
      best: ref ? { row: ref, score: 0, matchedRe: 'via ' + t.ref } : null,
      alts: [],
      ref: t.ref,
    });
  }

  // markdown
  const lines = [];
  lines.push('# Canonical ID mapping');
  lines.push('');
  lines.push(`Generated against ${rows.length} rows of the production exercises table.`);
  lines.push('');
  lines.push('## Trainer-template constants (W.\\*)');
  lines.push('');
  lines.push('| key | old_id | new_id | new_name | rationale |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const r of out.filter(x => x.kind === 'trainer')) {
    const b = r.best;
    const newId = b?.row.wger_id ?? 0;
    const newName = b?.row.name ?? 'NO MATCH';
    const rationale = b
      ? `regex ${b.matchedRe} score=${b.score}`
      : 'no candidate matched all filters -- leave 0';
    lines.push(`| ${r.label} | ${r.old_id ?? ''} | ${newId} | ${newName} | ${rationale} |`);
  }
  lines.push('');
  lines.push('### Trainer alts (top 3 alternatives, for human sanity check)');
  lines.push('');
  for (const r of out.filter(x => x.kind === 'trainer')) {
    if (!r.alts.length) continue;
    lines.push(`#### ${r.label}`);
    for (const a of r.alts) {
      lines.push(`- wger_id=${a.row.wger_id ?? 'null'} score=${a.score} "${a.row.name}" eq=${a.row.equipment ?? 'null'}`);
    }
  }

  lines.push('');
  lines.push('## Leaderboard rows (35 entries)');
  lines.push('');
  lines.push('| key | display | new_id | new_name | rationale |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const r of out.filter(x => x.kind === 'leaderboard')) {
    const b = r.best;
    const newId = b?.row.wger_id ?? 0;
    const newName = b?.row.name ?? 'NO MATCH';
    const rationale = b
      ? `regex ${b.matchedRe} score=${b.score}`
      : 'no candidate matched all filters';
    lines.push(`| ${r.label} | ${r.display} | ${newId} | ${newName} | ${rationale} |`);
  }

  lines.push('');
  lines.push('### Leaderboard alts');
  lines.push('');
  for (const r of out.filter(x => x.kind === 'leaderboard')) {
    if (!r.alts.length) continue;
    lines.push(`#### ${r.label} -- ${r.display}`);
    for (const a of r.alts) {
      lines.push(`- wger_id=${a.row.wger_id ?? 'null'} score=${a.score} "${a.row.name}" eq=${a.row.equipment ?? 'null'}`);
    }
  }

  lines.push('');
  lines.push('## Strength-standards (5 entries, derived from leaderboard)');
  lines.push('');
  for (const r of out.filter(x => x.kind === 'strength')) {
    const b = r.best;
    const newId = b?.row.wger_id ?? 0;
    const newName = b?.row.name ?? 'NO MATCH';
    lines.push(`- ${r.label} (${r.display}) -> wger_id=${newId} "${newName}" (via ${r.ref})`);
  }

  fs.writeFileSync(path.join(OUT_DIR, 'ID-MAPPING.md'), lines.join('\n'));
  fs.writeFileSync(path.join(OUT_DIR, 'id-mapping.json'), JSON.stringify(out, null, 2));
  console.log(`Wrote ${path.join(OUT_DIR, 'ID-MAPPING.md')}`);
  console.log(`Wrote ${path.join(OUT_DIR, 'id-mapping.json')}`);

  // brief console summary
  console.log('\n--- Trainer constants ---');
  for (const r of out.filter(x => x.kind === 'trainer')) {
    const id = r.best?.row.wger_id ?? 0;
    const name = r.best?.row.name ?? '(none)';
    console.log(`  ${r.label.padEnd(12)} ${String(r.old_id).padEnd(5)} -> ${String(id).padEnd(5)} "${name}"`);
  }
})();
