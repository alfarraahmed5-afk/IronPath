require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const MUSCLE_MAP = require('./wger-muscle-map');
const EQUIPMENT_MAP = require('./wger-equipment-map');

// wger exercise category IDs — verify at: GET https://wger.de/api/v2/exercisecategory/?format=json
// 1=Abs, 2=Arms, 3=Back, 4=Calves, 5=Chest, 6=Legs, 7=Shoulders, 8=Cardio (unofficial), 9=Aerobics
const DURATION_CATEGORIES = new Set([10]); // Stretching/static holds
const DISTANCE_CATEGORIES = new Set([]);   // wger doesn't separate cardio by category well

// Keyword-based fallback for exercises wger doesn't categorize cleanly
const DURATION_KEYWORDS = ['plank', 'wall sit', 'hold', 'isometric', 'static', 'bridge hold', 'hollow hold', 'l-sit'];
const DISTANCE_KEYWORDS = ['running', 'cycling', 'swimming', 'rowing machine', 'elliptical', 'walk', 'jog', 'sprint', 'run'];
const BODYWEIGHT_KEYWORDS = ['push-up', 'pushup', 'pull-up', 'pullup', 'chin-up', 'chinup', 'dip', 'sit-up', 'situp',
  'crunch', 'burpee', 'jumping jack', 'mountain climber', 'lunge', 'squat jump', 'box jump'];

function inferLoggingType(exercise, translationName) {
  const name = (translationName || '').toLowerCase();
  const categoryId = exercise.category?.id;
  const equipmentIds = (exercise.equipment || []).map(e => e.id);

  // Distance exercises (cardio machines, running)
  if (DISTANCE_CATEGORIES.has(categoryId)) return 'distance';
  if (DISTANCE_KEYWORDS.some(kw => name.includes(kw))) return 'distance';

  // Duration exercises (holds, stretches)
  if (DURATION_CATEGORIES.has(categoryId)) return 'duration';
  if (DURATION_KEYWORDS.some(kw => name.includes(kw))) return 'duration';

  // Bodyweight reps (no equipment or explicit bodyweight tag)
  const isBodyweightEquip = equipmentIds.length === 0 || equipmentIds.every(id => id === 6 || id === 12);
  if (isBodyweightEquip && BODYWEIGHT_KEYWORDS.some(kw => name.includes(kw))) return 'bodyweight_reps';

  // Default: weighted reps
  return 'weight_reps';
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      if (res.status === 429) {
        const wait = Math.pow(2, i) * 1000;
        console.log('Rate limited, waiting ' + wait + 'ms...');
        await new Promise(r => setTimeout(r, wait));
      }
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error('Failed after ' + retries + ' retries: ' + url);
}

async function importWger() {
  let url = 'https://wger.de/api/v2/exerciseinfo/?format=json&language=2&limit=100&offset=0';
  let imported = 0, skipped = 0;

  while (url) {
    const res = await fetchWithRetry(url);
    const json = await res.json();

    for (const exercise of json.results) {
      const { data: existing } = await supabase
        .from('exercises').select('id').eq('wger_id', exercise.id).maybeSingle();
      if (existing) { skipped++; continue; }

      const translation = exercise.translations?.find(t => t.language === 2);
      if (!translation?.name) {
        console.log('Skipping exercise ' + exercise.id + ': no English translation');
        continue;
      }

      let imageUrl = null;
      const mainImage = exercise.images?.find(img => img.is_main) ?? exercise.images?.[0];
      if (mainImage?.image) {
        try {
          const imgRes = await fetchWithRetry(mainImage.image);
          const arrayBuffer = await imgRes.arrayBuffer();
          const imgBuffer = Buffer.from(arrayBuffer);
          const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg';
          const ext = contentType.includes('png') ? 'png' : contentType.includes('gif') ? 'gif' : 'jpg';
          const storagePath = 'global/' + exercise.id + '/image_0.' + ext;
          const { error: uploadError } = await supabase.storage
            .from('exercise-assets').upload(storagePath, imgBuffer, { contentType, upsert: true });
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('exercise-assets').getPublicUrl(storagePath);
            imageUrl = urlData.publicUrl;
          }
        } catch (e) {
          console.warn('Failed to upload image for exercise ' + exercise.id + ':', e.message);
        }
      }

      const primaryMuscles = (exercise.muscles || []).map(m => MUSCLE_MAP[m.id] || m.name_en || 'muscle_' + m.id);
      const secondaryMuscles = (exercise.muscles_secondary || []).map(m => MUSCLE_MAP[m.id] || m.name_en || 'muscle_' + m.id);
      const equipmentId = exercise.equipment?.[0]?.id;
      const equipment = equipmentId ? (EQUIPMENT_MAP[equipmentId] || 'other') : null;

      const { error: insertError } = await supabase.from('exercises').insert({
        name: translation.name,
        description: translation.description || null,
        instructions: translation.execution || null,
        image_url: imageUrl,
        equipment,
        primary_muscles: primaryMuscles,
        secondary_muscles: secondaryMuscles,
        logging_type: inferLoggingType(exercise, translation.name),
        is_custom: false,
        is_gym_template: false,
        wger_id: exercise.id,
      });

      if (insertError) {
        console.error('Failed to insert exercise ' + exercise.id + ':', insertError.message);
      } else {
        imported++;
        if (imported % 50 === 0) console.log('Imported ' + imported + ' exercises...');
      }
    }

    url = json.next;
    if (url) await new Promise(r => setTimeout(r, 200));
  }

  console.log('Done. Imported: ' + imported + ', Skipped (already exists): ' + skipped);
}

importWger().catch(err => { console.error(err); process.exit(1); });
