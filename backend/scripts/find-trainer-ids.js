// Find the CURRENT wger_id values for the canonical lifts the AI
// trainer needs. Searches the production exercises table by name and
// prints a code snippet to paste into backend/data/trainer-templates.js.
//
// Background: wger.de periodically renumbers their exercise IDs. The
// hardcoded W.SQUAT = 110 etc. constants pointed at the OLD numbers;
// after the latest wger import, those IDs land on completely
// different exercises in our DB.
//
// Usage: node scripts/find-trainer-ids.js
//   reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from backend/.env.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Canonical exercise names mapped to the W.* constants in
// trainer-templates.js. Each entry lists multiple name patterns we'll
// try in order; the first matching row in `exercises` wins. We bias
// toward the most specific name first.
//
// Each query uses ilike '%pattern%' AND filters by equipment when
// useful to disambiguate (Squat -> Barbell, Goblet Squat -> Dumbbell).
const TARGETS = [
  { key: 'SQUAT',       patterns: ['barbell squat', 'back squat', 'squat'],            equipment: 'barbell' },
  { key: 'BENCH',       patterns: ['barbell bench press', 'bench press'],              equipment: 'barbell' },
  { key: 'DEADLIFT',    patterns: ['barbell deadlift', 'conventional deadlift', 'deadlift'], equipment: 'barbell' },
  { key: 'OHP',         patterns: ['overhead press', 'shoulder press', 'military press'], equipment: 'barbell' },
  { key: 'ROW',         patterns: ['barbell row', 'bent over row', 'pendlay row'],     equipment: 'barbell' },
  { key: 'RDLIFT',      patterns: ['romanian deadlift', 'stiff leg deadlift'],         equipment: 'barbell' },
  { key: 'PULLUP',      patterns: ['pull-up', 'pull up', 'pullup', 'chin-up'],         equipment: null    },
  { key: 'LAT_PD',      patterns: ['lat pulldown', 'lat pull-down', 'pulldown'],       equipment: 'cable' },
  { key: 'CURL',        patterns: ['barbell curl', 'biceps curl with barbell'],        equipment: 'barbell' },
  { key: 'PUSHUP',      patterns: ['push-up', 'push up', 'pushup'],                    equipment: 'bodyweight' },
  { key: 'LUNGE',       patterns: ['lunge', 'walking lunge'],                          equipment: null    },
  { key: 'PLANK',       patterns: ['plank', 'forearm plank'],                          equipment: 'bodyweight' },
  { key: 'BURPEE',      patterns: ['burpee'],                                          equipment: 'bodyweight' },
  { key: 'RUNNING',     patterns: ['running', 'jogging', 'run'],                       equipment: null    },
  { key: 'GOBLET_SQ',   patterns: ['goblet squat'],                                    equipment: 'dumbbell' },
  { key: 'SPLIT_SQ',    patterns: ['bulgarian split squat', 'split squat'],            equipment: null    },
  { key: 'DB_BENCH',    patterns: ['dumbbell bench press', 'db bench press'],          equipment: 'dumbbell' },
  { key: 'DB_SHOULDER', patterns: ['dumbbell shoulder press', 'dumbbell overhead press'], equipment: 'dumbbell' },
  { key: 'DB_ROW',      patterns: ['dumbbell row', 'one-arm dumbbell row', 'db row'],  equipment: 'dumbbell' },
  { key: 'DB_CURL',     patterns: ['dumbbell curl', 'dumbbell biceps curl'],           equipment: 'dumbbell' },
];

async function search(key, patterns, equipment) {
  for (const p of patterns) {
    let q = supabase
      .from('exercises')
      .select('id, name, wger_id, equipment')
      .ilike('name', `%${p}%`)
      .not('wger_id', 'is', null);
    if (equipment) q = q.eq('equipment', equipment);
    const { data, error } = await q.order('name').limit(5);
    if (error) {
      console.error(`  ${key}: query error -- ${error.message}`);
      return null;
    }
    if (data.length > 0) {
      return { matched: p, rows: data };
    }
  }
  return null;
}

(async () => {
  console.log(`Supabase: ${process.env.SUPABASE_URL}\n`);
  console.log('Searching exercises table for canonical lifts...\n');
  const found = {};
  for (const { key, patterns, equipment } of TARGETS) {
    const res = await search(key, patterns, equipment);
    if (!res) {
      console.log(`  MISS  ${key.padEnd(12)} no match for ${patterns.join(' / ')}`);
      continue;
    }
    const best = res.rows[0];
    console.log(`  OK    ${key.padEnd(12)} wger_id=${String(best.wger_id).padEnd(4)} "${best.name}"  [pattern "${res.matched}"]`);
    if (res.rows.length > 1) {
      for (const row of res.rows.slice(1, 3)) {
        console.log(`        alt:           wger_id=${String(row.wger_id).padEnd(4)} "${row.name}"`);
      }
    }
    found[key] = best.wger_id;
  }

  console.log('\n--- Suggested update for backend/data/trainer-templates.js ---\n');
  console.log('const W = {');
  for (const { key } of TARGETS) {
    const id = found[key];
    if (id != null) {
      console.log(`  ${key}: ${id},`);
    } else {
      console.log(`  ${key}: 0, // TODO -- no match found in exercises table`);
    }
  }
  console.log('};');
})();
