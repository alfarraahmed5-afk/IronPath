// Run BEFORE import-wger.js to confirm all critical exercise IDs are correct.
// Usage: node scripts/verify-wger-ids.js

const CRITICAL_IDS = [
  { id: 110, expectedName: 'Barbell Squat', usage: 'leaderboard, strength standards, AI trainer' },
  { id: 192, expectedName: 'Bench Press',   usage: 'leaderboard, strength standards, AI trainer' },
  { id: 241, expectedName: 'Deadlift',      usage: 'leaderboard, strength standards, AI trainer' },
  { id: 74,  expectedName: 'Overhead Press',usage: 'leaderboard, strength standards, AI trainer' },
  { id: 63,  expectedName: 'Bent Over Row', usage: 'leaderboard, AI trainer' },
  { id: 89,  expectedName: 'Romanian Deadlift', usage: 'AI trainer' },
  { id: 31,  expectedName: 'Pull Up',       usage: 'AI trainer' },
  { id: 122, expectedName: 'Lat Pulldown',  usage: 'AI trainer' },
  { id: 99,  expectedName: 'Barbell Curl',  usage: 'AI trainer' },
  { id: 91,  expectedName: 'Push Up',       usage: 'AI trainer' },
  { id: 78,  expectedName: 'Lunge',         usage: 'AI trainer' },
  { id: 95,  expectedName: 'Plank',         usage: 'AI trainer' },
  { id: 156, expectedName: 'Burpees',       usage: 'AI trainer' },
  { id: 215, expectedName: 'Running',       usage: 'AI trainer' },
  { id: 118, expectedName: 'Goblet Squat',  usage: 'AI trainer' },
  { id: 170, expectedName: 'Bulgarian Split Squat', usage: 'AI trainer' },
  { id: 21,  expectedName: 'Dumbbell Bench Press',  usage: 'AI trainer' },
  { id: 68,  expectedName: 'Dumbbell Shoulder Press', usage: 'AI trainer' },
  { id: 72,  expectedName: 'Dumbbell Row',  usage: 'AI trainer' },
  { id: 5,   expectedName: 'Dumbbell Curl', usage: 'AI trainer' },
];

async function verify() {
  console.log('Verifying wger exercise IDs against live API...\n');
  let allGood = true;

  for (const entry of CRITICAL_IDS) {
    try {
      const res = await fetch(`https://wger.de/api/v2/exerciseinfo/${entry.id}/?format=json`);
      if (res.status === 404) {
        console.error(`❌ ID ${entry.id} NOT FOUND — expected "${entry.expectedName}" (used by: ${entry.usage})`);
        allGood = false;
        continue;
      }
      const json = await res.json();
      const englishTranslation = json.translations?.find(t => t.language === 2);
      const actualName = englishTranslation?.name || '(no English name)';
      const match = actualName.toLowerCase().includes(entry.expectedName.split(' ')[0].toLowerCase());
      if (match) {
        console.log(`✅ ID ${entry.id} = "${actualName}"`);
      } else {
        console.warn(`⚠️  ID ${entry.id} = "${actualName}" — expected "${entry.expectedName}" (used by: ${entry.usage})`);
        console.warn(`   → Update the ID in leaderboard-exercises.js, strength-standards.js, and/or trainer-templates.js`);
        allGood = false;
      }
      // Be polite to the API
      await new Promise(r => setTimeout(r, 150));
    } catch (e) {
      console.error(`❌ ID ${entry.id} — network error: ${e.message}`);
      allGood = false;
    }
  }

  console.log('\n' + (allGood
    ? '✅ All IDs verified. Safe to run import-wger.js'
    : '⚠️  Some IDs need updating before running import-wger.js (see warnings above)'));
}

verify().catch(err => { console.error(err); process.exit(1); });
