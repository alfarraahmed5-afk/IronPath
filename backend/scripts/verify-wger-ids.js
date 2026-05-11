// Run BEFORE import-wger.js (or after a wger.de catalog refresh) to confirm
// all critical exercise IDs still point at the right rows on wger.de's API.
// Usage: node backend/scripts/verify-wger-ids.js
//
// 2026-05-11: updated to use the post-import catalog numbering.
// See skills/exercise-cleanup/ID-MAPPING.md for the audit trail.

const CRITICAL_IDS = [
  // Compound barbell lifts (used by leaderboard, strength-standards, AI trainer)
  { id: 1627, expectedName: 'Barbell squat',        usage: 'leaderboard, strength standards, AI trainer (SQUAT)' },
  { id: 73,   expectedName: 'Barbell Bench Press',  usage: 'leaderboard, strength standards, AI trainer (BENCH)' },
  { id: 184,  expectedName: 'Deadlifts',            usage: 'leaderboard, strength standards, AI trainer (DEADLIFT)' },
  { id: 687,  expectedName: 'Overhead Press',       usage: 'leaderboard, strength standards, AI trainer (OHP)' },
  { id: 1698, expectedName: 'Barbell Row',          usage: 'leaderboard, strength standards, AI trainer (ROW)' },
  { id: 1700, expectedName: 'Romanian Deadlift',    usage: 'AI trainer (RDLIFT) + leaderboard (LB_RDL)' },

  // Bodyweight + accessory (AI trainer)
  { id: 475,  expectedName: 'Pull-ups',             usage: 'AI trainer (PULLUP) + leaderboard (LB_PULLUP)' },
  { id: 1806, expectedName: 'Lat Pull Down',        usage: 'AI trainer (LAT_PD) + leaderboard (LB_LAT_PULLDOWN)' },
  { id: 91,   expectedName: 'Biceps Curls With Barbell', usage: 'AI trainer (CURL) + leaderboard (LB_BB_CURL)' },
  { id: 1551, expectedName: 'Push-Up',              usage: 'AI trainer (PUSHUP)' },
  { id: 46,   expectedName: 'Barbell Lunge',        usage: 'AI trainer (LUNGE) + leaderboard (LB_BARBELL_LUNGE)' },
  { id: 1317, expectedName: 'Plank',                usage: 'AI trainer (PLANK)' },
  { id: 132,  expectedName: 'Burpee',               usage: 'AI trainer (BURPEE)' },
  { id: 908,  expectedName: 'Zone 2 Running',       usage: 'AI trainer (RUNNING)' },

  // Dumbbell variants (AI trainer)
  { id: 203,  expectedName: 'Goblet Squat',         usage: 'AI trainer (GOBLET_SQ)' },
  { id: 988,  expectedName: 'Bulgarian split squat',usage: 'AI trainer (SPLIT_SQ) + leaderboard (LB_BULGARIAN_SS)' },
  { id: 1676, expectedName: 'Dumbbell Bench Press', usage: 'AI trainer (DB_BENCH) + leaderboard (LB_DB_BENCH)' },
  { id: 1337, expectedName: 'Dumbbell Shoulder Press', usage: 'AI trainer (DB_SHOULDER) + leaderboard (LB_DB_SHOULDER)' },
  { id: 1085, expectedName: 'Dumbbell Bent Over Row', usage: 'AI trainer (DB_ROW)' },
  { id: 1931, expectedName: 'Dumbbell Curl',        usage: 'AI trainer (DB_CURL)' },
];

async function verify() {
  console.log('Verifying wger exercise IDs against live API...\n');
  let allGood = true;

  for (const entry of CRITICAL_IDS) {
    try {
      const res = await fetch(`https://wger.de/api/v2/exerciseinfo/${entry.id}/?format=json`);
      if (res.status === 404) {
        console.error(`MISS  ID ${entry.id} NOT FOUND -- expected "${entry.expectedName}" (used by: ${entry.usage})`);
        allGood = false;
        continue;
      }
      const json = await res.json();
      const englishTranslation = json.translations?.find(t => t.language === 2);
      const actualName = englishTranslation?.name || '(no English name)';
      const match = actualName.toLowerCase().includes(entry.expectedName.split(' ')[0].toLowerCase());
      if (match) {
        console.log(`OK    ID ${entry.id} = "${actualName}"`);
      } else {
        console.warn(`WARN  ID ${entry.id} = "${actualName}" -- expected "${entry.expectedName}" (used by: ${entry.usage})`);
        console.warn(`      -> review backend/data/* references`);
        allGood = false;
      }
      // Be polite to the API
      await new Promise(r => setTimeout(r, 150));
    } catch (e) {
      console.error(`ERR   ID ${entry.id} -- network error: ${e.message}`);
      allGood = false;
    }
  }

  console.log('\n' + (allGood
    ? 'All IDs verified. Safe to run import-wger.js'
    : 'Some IDs need updating before running import-wger.js (see warnings above)'));
}

verify().catch(err => { console.error(err); process.exit(1); });
