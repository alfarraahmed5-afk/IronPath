require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// wger IDs — run verify-wger-ids.js first to confirm these are correct
const W = {
  SQUAT:       110,
  BENCH:       192,
  DEADLIFT:    241,
  OHP:          74,
  ROW:          63,
  RDL:          89,
  PULLUP:       31,
  LAT_PD:      122,
  CURL:         99,
  PUSHUP:       91,
  LUNGE:        78,
  PLANK:        95,
  DB_BENCH:     21,
  DB_SHOULDER:  68,
  DB_ROW:       72,
  DB_CURL:       5,
  GOBLET_SQ:   118,
  LEG_PRESS:   116,
  LEG_CURL:    126,
  CALF_RAISE:  104,
  INC_DB_BENCH:  23,
  LAT_RAISE:    78,  // note: shares ID with lunge — verify
  TRICEP_PD:   125,
  CABLE_ROW:    65,
  FACE_PULL:    96,
  GLUTE_BRIDGE: 77,
  BW_SQUAT:     86,
};

// Helper: build an array of identical sets
function sets(count, set_type, target_reps, target_weight_kg = null) {
  return Array.from({ length: count }, () => ({ set_type, target_reps, target_weight_kg }));
}

// program_data format must match what /routines/pre-built/:id/save endpoint expects:
//   { days: [{ name, exercises: [{ wger_id, rest_seconds, notes, sets: [...] }] }] }
const ROUTINES = [
  {
    name: 'StrongLifts 5x5 (Beginner Strength)',
    description: 'Classic linear progression strength program. 3 days/week, alternating A/B workouts. Add weight every session.',
    category: 'gym',
    level: 'beginner',
    goal: 'strength',
    equipment_required: ['barbell', 'squat rack', 'bench'],
    days_per_week: 3,
    program_data: {
      days: [
        {
          name: 'Workout A',
          exercises: [
            { wger_id: W.SQUAT,   rest_seconds: 180, notes: '', sets: sets(5, 'normal', 5) },
            { wger_id: W.BENCH,   rest_seconds: 180, notes: '', sets: sets(5, 'normal', 5) },
            { wger_id: W.ROW,     rest_seconds: 180, notes: '', sets: sets(5, 'normal', 5) },
          ],
        },
        {
          name: 'Workout B',
          exercises: [
            { wger_id: W.SQUAT,    rest_seconds: 180, notes: '', sets: sets(5, 'normal', 5) },
            { wger_id: W.OHP,      rest_seconds: 180, notes: '', sets: sets(5, 'normal', 5) },
            { wger_id: W.DEADLIFT, rest_seconds: 300, notes: 'One all-out work set', sets: sets(1, 'normal', 5) },
          ],
        },
      ],
    },
  },
  {
    name: 'PPL (Push/Pull/Legs)',
    description: 'Intermediate 6-day push-pull-legs split for hypertrophy. High volume, focused muscle group training.',
    category: 'gym',
    level: 'intermediate',
    goal: 'hypertrophy',
    equipment_required: ['barbell', 'dumbbell', 'cable machine', 'bench'],
    days_per_week: 6,
    program_data: {
      days: [
        {
          name: 'Push (Chest/Shoulders/Triceps)',
          exercises: [
            { wger_id: W.BENCH,      rest_seconds: 120, notes: '6-10 reps',  sets: sets(4, 'normal', 8) },
            { wger_id: W.OHP,        rest_seconds:  90, notes: '8-12 reps',  sets: sets(3, 'normal', 10) },
            { wger_id: W.INC_DB_BENCH, rest_seconds: 90, notes: '10-15 reps', sets: sets(3, 'normal', 12) },
            { wger_id: W.LAT_RAISE,  rest_seconds:  60, notes: '12-20 reps', sets: sets(4, 'normal', 15) },
            { wger_id: W.TRICEP_PD,  rest_seconds:  60, notes: '12-15 reps', sets: sets(3, 'normal', 12) },
          ],
        },
        {
          name: 'Pull (Back/Biceps)',
          exercises: [
            { wger_id: W.PULLUP,    rest_seconds: 120, notes: '6-10 reps',  sets: sets(4, 'normal', 8) },
            { wger_id: W.ROW,       rest_seconds: 120, notes: '6-10 reps',  sets: sets(4, 'normal', 8) },
            { wger_id: W.CABLE_ROW, rest_seconds:  90, notes: '10-15 reps', sets: sets(3, 'normal', 12) },
            { wger_id: W.FACE_PULL, rest_seconds:  60, notes: '15-20 reps', sets: sets(3, 'normal', 15) },
            { wger_id: W.CURL,      rest_seconds:  60, notes: '10-15 reps', sets: sets(3, 'normal', 12) },
          ],
        },
        {
          name: 'Legs (Quads/Hamstrings/Glutes)',
          exercises: [
            { wger_id: W.SQUAT,     rest_seconds: 180, notes: '6-10 reps',  sets: sets(4, 'normal', 8) },
            { wger_id: W.RDL,       rest_seconds: 120, notes: '8-12 reps',  sets: sets(3, 'normal', 10) },
            { wger_id: W.LEG_PRESS, rest_seconds: 120, notes: '10-15 reps', sets: sets(3, 'normal', 12) },
            { wger_id: W.LEG_CURL,  rest_seconds:  90, notes: '10-15 reps', sets: sets(3, 'normal', 12) },
            { wger_id: W.CALF_RAISE,rest_seconds:  60, notes: '12-20 reps', sets: sets(4, 'normal', 15) },
          ],
        },
      ],
    },
  },
  {
    name: 'Full Body Dumbbell (Home)',
    description: 'Effective full-body training with dumbbells only. 3 days/week, suitable for home gym.',
    category: 'home',
    level: 'beginner',
    goal: 'general',
    equipment_required: ['dumbbells'],
    days_per_week: 3,
    program_data: {
      days: [
        {
          name: 'Full Body A',
          exercises: [
            { wger_id: W.GOBLET_SQ,   rest_seconds: 90, notes: '', sets: sets(3, 'normal', 12) },
            { wger_id: W.RDL,         rest_seconds: 90, notes: 'Use dumbbells', sets: sets(3, 'normal', 12) },
            { wger_id: W.DB_BENCH,    rest_seconds: 90, notes: '', sets: sets(3, 'normal', 10) },
            { wger_id: W.DB_ROW,      rest_seconds: 90, notes: '', sets: sets(3, 'normal', 10) },
            { wger_id: W.DB_SHOULDER, rest_seconds: 90, notes: '', sets: sets(3, 'normal', 10) },
          ],
        },
      ],
    },
  },
  {
    name: 'Bodyweight Foundations',
    description: 'No-equipment workout using only bodyweight exercises. Perfect for travel or home.',
    category: 'bodyweight',
    level: 'beginner',
    goal: 'general',
    equipment_required: [],
    days_per_week: 3,
    program_data: {
      days: [
        {
          name: 'Upper Body',
          exercises: [
            { wger_id: W.PUSHUP, rest_seconds: 60, notes: '8-15 reps', sets: sets(3, 'normal', 10) },
            { wger_id: W.PULLUP, rest_seconds: 90, notes: '5-10 reps', sets: sets(3, 'normal', 7) },
          ],
        },
        {
          name: 'Lower Body & Core',
          exercises: [
            { wger_id: W.BW_SQUAT,     rest_seconds: 60, notes: '',        sets: sets(3, 'normal', 20) },
            { wger_id: W.LUNGE,        rest_seconds: 60, notes: 'Each leg', sets: sets(3, 'normal', 12) },
            { wger_id: W.GLUTE_BRIDGE, rest_seconds: 60, notes: '',        sets: sets(3, 'normal', 15) },
            { wger_id: W.PLANK,        rest_seconds: 60, notes: '45 sec hold', sets: sets(3, 'timed', null) },
          ],
        },
      ],
    },
  },
];

async function seedPrebuiltRoutines() {
  console.log('Seeding ' + ROUTINES.length + ' pre-built routines...');
  let inserted = 0, skipped = 0;

  for (const routine of ROUTINES) {
    const { data: existing } = await supabase
      .from('pre_built_routines').select('id').eq('name', routine.name).maybeSingle();
    if (existing) { skipped++; continue; }

    const { error } = await supabase.from('pre_built_routines').insert(routine);
    if (error) {
      console.error('Failed to insert "' + routine.name + '":', error.message);
    } else {
      inserted++;
      console.log('  Inserted: ' + routine.name);
    }
  }

  console.log('Done. Inserted: ' + inserted + ', Skipped: ' + skipped);
}

seedPrebuiltRoutines().catch(err => { console.error(err); process.exit(1); });
