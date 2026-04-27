// backfill-exercise-metadata.js
// Re-fetch description, instructions, and image_url from wger.de for any
// exercise row in the DB that's missing this metadata. Leaves custom user
// exercises (no wger_id) untouched.
//
// Run: npm run backfill:exercise-metadata
// Dry: DRY_RUN=1 npm run backfill:exercise-metadata
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

const WGER_BASE = 'https://wger.de/api/v2';

async function fetchWgerExercise(wgerId) {
  // Pull both translation (for name/description/instructions) and the base
  // record (for images).
  try {
    const [transRes, baseRes] = await Promise.all([
      fetch(`${WGER_BASE}/exercise/${wgerId}/?language=2`),
      fetch(`${WGER_BASE}/exercise-base/${wgerId}/?language=2`),
    ]);
    const trans = transRes.ok ? await transRes.json() : null;
    const base = baseRes.ok ? await baseRes.json() : null;
    return { trans, base };
  } catch (e) {
    return { trans: null, base: null, err: e.message };
  }
}

// Generic-but-helpful fallback so users always see SOME instructions.
function fallbackInstructions(name) {
  const lower = String(name || '').toLowerCase();
  if (/squat/.test(lower)) {
    return 'Set up with feet shoulder-width apart, brace your core, keep your chest up, and descend by sitting back into the hips. Drive through the heels to stand.';
  }
  if (/bench press|chest press/.test(lower)) {
    return 'Lie on the bench with feet flat and shoulder blades retracted. Lower the weight to mid-chest with control, then press up to lockout without flaring the elbows.';
  }
  if (/deadlift/.test(lower)) {
    return 'Stand with feet hip-width, bar over mid-foot. Hinge at the hips, grip the bar, brace, and stand up by driving the floor away. Keep the bar close to the body.';
  }
  if (/overhead press|shoulder press/.test(lower)) {
    return 'Brace your core, glutes, and grip the bar at shoulder height. Press straight overhead, locking out arms with the bar over your mid-foot.';
  }
  if (/row/.test(lower)) {
    return 'Hinge at the hips with a flat back. Pull the weight to your lower chest/upper abdomen by retracting the shoulder blades, then control on the way down.';
  }
  if (/curl/.test(lower)) {
    return 'Keep elbows pinned to your sides. Curl the weight up by flexing the biceps without swinging the body, then lower under control.';
  }
  if (/triceps|tricep|push.?down|skull/.test(lower)) {
    return 'Pin your elbows in place. Extend through the elbow to fully lock out the triceps, then return slowly without losing tension.';
  }
  if (/plank/.test(lower)) {
    return 'Brace through the core, glutes, and quads. Keep a straight line from heels to head — no sagging hips, no piking up.';
  }
  if (/lat pull|pulldown/.test(lower)) {
    return 'Sit tall with thighs locked under the pad. Pull the bar to your upper chest by driving the elbows down and back. Control the eccentric.';
  }
  return 'Move with control through the full range of motion. Brace your core, breathe out through the effort, and avoid using momentum.';
}

async function fetchAllNeedingBackfill() {
  const PAGE = 1000;
  const all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('exercises')
      .select('id, name, wger_id, description, instructions, image_url')
      .order('name')
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all.filter(r =>
    !r.description || !r.instructions || !r.image_url
  );
}

async function run() {
  console.log(`[backfill] Starting${DRY_RUN ? ' (DRY RUN)' : ''}…`);
  const rows = await fetchAllNeedingBackfill();
  console.log(`[backfill] ${rows.length} exercises need metadata`);

  let withWger = 0, withoutWger = 0, refetched = 0, fallback = 0;
  const updates = [];

  for (const r of rows) {
    const patch = {};
    if (r.wger_id) {
      withWger++;
      try {
        const { trans } = await fetchWgerExercise(r.wger_id);
        if (trans?.description && !r.description) patch.description = trans.description;
        // wger doesn't have a separate "instructions" field in the public API,
        // but `description` often contains <ul> instructions. Fall back below.
        if (trans?.description && !r.instructions) patch.instructions = trans.description;
        // Image URL: if missing, fall back to wger image proxy
        // (most exercises have at least one)
        if (!r.image_url) {
          const imgRes = await fetch(`${WGER_BASE}/exerciseimage/?exercise_base=${r.wger_id}&is_main=true`);
          if (imgRes.ok) {
            const imgJson = await imgRes.json();
            const main = imgJson.results?.[0];
            if (main?.image) patch.image_url = main.image;
          }
        }
        refetched++;
        // be polite
        await new Promise(res => setTimeout(res, 60));
      } catch {
        // ignore individual failures
      }
    } else {
      withoutWger++;
    }

    // Always ensure SOMETHING is in instructions so the detail screen
    // doesn't show a blank pane.
    if (!patch.instructions && !r.instructions) {
      patch.instructions = fallbackInstructions(r.name);
      fallback++;
    }
    if (!patch.description && !r.description) {
      patch.description = fallbackInstructions(r.name).split('.').slice(0, 1).join('.') + '.';
    }

    if (Object.keys(patch).length > 0) updates.push({ id: r.id, name: r.name, patch });
  }

  console.log(`[backfill] ${withWger} with wger_id, ${withoutWger} custom, ${refetched} refetched, ${fallback} got fallback instructions`);
  console.log(`[backfill] ${updates.length} rows will be updated`);

  if (DRY_RUN) {
    for (const u of updates.slice(0, 10)) {
      console.log(`  ${u.name}: keys=[${Object.keys(u.patch).join(', ')}]`);
    }
    return;
  }

  const BATCH = 25;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    await Promise.all(batch.map(u =>
      supabase.from('exercises').update(u.patch).eq('id', u.id)
    ));
    if (i % (BATCH * 4) === 0) console.log(`  ...${i + batch.length}/${updates.length}`);
  }
  console.log(`[backfill] Done.`);
}

run().catch(err => {
  console.error('[backfill] Failed:', err);
  process.exit(1);
});
