// wger exercise IDs used in templates.
// Resolved to internal exercise UUIDs at runtime via the
// exercises.wger_id column.
//
// 2026-05-11: wger.de renumbered their catalog. The previous constants
// (W.SQUAT = 110 etc.) pointed at exercises that no longer correspond
// to the canonical big lifts in our exercises table after the latest
// import. This second-pass audit (skills/exercise-cleanup/ID-MAPPING.md)
// re-grounded every constant against an 881-row inventory using regex
// priority + equipment/muscle filters, and surfaced the four IDs that
// the naive search had missed (PUSHUP, PLANK, BURPEE, LAT_PD).
//
// A 0 value means the canonical lift is genuinely not in the current
// catalog (only BURPEE / LAT_PD were ever in this bucket and both are
// now resolved; nothing is left at 0). trainer.ts gracefully skips
// wger_ids it can't resolve, so a 0 here is inert.
const W = {
  SQUAT: 1627,        // "Barbell squat"
  BENCH: 73,          // "Barbell Bench Press"
  DEADLIFT: 184,      // "Deadlifts"
  OHP: 687,           // "Overhead Press"
  ROW: 1698,          // "Barbell Row (Overhand)"
  RDLIFT: 1700,       // "Barbell Romanian Deadlift (RDL)"
  PULLUP: 475,        // "Pull-ups" (was 1929 "Assisted Pull-Up" -- wrong)
  LAT_PD: 1806,       // "Lat Pull Down" (was 0 -- it IS in the catalog)
  CURL: 91,           // "Biceps Curls With Barbell" (was 1290 "Reverse Grip Barbell Curls")
  PUSHUP: 1551,       // "Push-Up" (was 0)
  LUNGE: 46,          // "Barbell Lunge Standing"
  PLANK: 1317,        // "Plank" (was 0; duplicate row 458 also exists)
  BURPEE: 132,        // "Burpee" (was 0)
  RUNNING: 908,       // "Zone 2 Running"
  GOBLET_SQ: 203,     // "Dumbbell Goblet Squat"
  SPLIT_SQ: 988,      // "Bulgarian split squats left" (rename pending)
  DB_BENCH: 1676,     // "Dumbbell Bench Press"
  DB_SHOULDER: 1337,  // "Dumbbell Shoulder Press"
  DB_ROW: 1085,       // "Dumbbell Bent Over Row" (was 310 "Incline Dumbbell Row")
  DB_CURL: 1931,      // "Dumbbell Curl"
};

const TEMPLATES = {
  // ─── BEGINNER ────────────────────────────────────────────────────────────────

  beginner_strength_3_full_gym: {
    name: 'StrongLifts 5×5',
    protocol: 'linear',
    weeks_per_cycle: 1,
    deload_after_failures: 2,
    deload_percentage: 0.90,
    upper_body_increment_kg: 2.5,
    lower_body_increment_kg: 5.0,
    sessions: [
      {
        day_label: 'Session A',
        exercises: [
          { wger_id: W.SQUAT, sets: 5, reps: 5, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.BENCH, sets: 5, reps: 5, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.ROW, sets: 5, reps: 5, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Session B',
        exercises: [
          { wger_id: W.SQUAT, sets: 5, reps: 5, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.OHP, sets: 5, reps: 5, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DEADLIFT, sets: 1, reps: 5, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
        ],
      },
    ],
  },

  beginner_strength_3_dumbbells: {
    name: 'Dumbbell Strength 3×',
    protocol: 'linear',
    weeks_per_cycle: 1,
    deload_after_failures: 2,
    deload_percentage: 0.90,
    upper_body_increment_kg: 2.5,
    lower_body_increment_kg: 2.5,
    sessions: [
      {
        day_label: 'Full Body A',
        exercises: [
          { wger_id: W.GOBLET_SQ, sets: 4, reps: 8, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.DB_BENCH, sets: 4, reps: 8, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_ROW, sets: 4, reps: 8, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_SHOULDER, sets: 3, reps: 10, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Full Body B',
        exercises: [
          { wger_id: W.LUNGE, sets: 4, reps: 10, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.DB_BENCH, sets: 4, reps: 8, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_ROW, sets: 4, reps: 8, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_CURL, sets: 3, reps: 12, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Full Body C',
        exercises: [
          { wger_id: W.SPLIT_SQ, sets: 3, reps: 10, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.DB_SHOULDER, sets: 4, reps: 10, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_ROW, sets: 4, reps: 10, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_CURL, sets: 3, reps: 12, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
    ],
  },

  beginner_strength_3_bodyweight: {
    name: 'Bodyweight Strength 3×',
    protocol: 'linear',
    weeks_per_cycle: 1,
    deload_after_failures: 3,
    deload_percentage: 1.0,
    upper_body_increment_kg: 0,
    lower_body_increment_kg: 0,
    sessions: [
      {
        day_label: 'Push Day',
        exercises: [
          { wger_id: W.PUSHUP, sets: 4, reps: null, reps_min: 8, reps_max: 15, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: false },
          { wger_id: W.LUNGE, sets: 3, reps: null, reps_min: 10, reps_max: 15, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: true },
          { wger_id: W.PLANK, sets: 3, reps: null, reps_min: null, reps_max: null, target_duration_seconds: 45, logging_type: 'duration', is_lower_body: false },
        ],
      },
      {
        day_label: 'Pull Day',
        exercises: [
          { wger_id: W.PULLUP, sets: 4, reps: null, reps_min: 3, reps_max: 10, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: false },
          { wger_id: W.BURPEE, sets: 3, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: false },
          { wger_id: W.PLANK, sets: 3, reps: null, reps_min: null, reps_max: null, target_duration_seconds: 45, logging_type: 'duration', is_lower_body: false },
        ],
      },
      {
        day_label: 'Legs Day',
        exercises: [
          { wger_id: W.LUNGE, sets: 4, reps: null, reps_min: 12, reps_max: 20, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: true },
          { wger_id: W.PUSHUP, sets: 3, reps: null, reps_min: 10, reps_max: 15, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: false },
          { wger_id: W.BURPEE, sets: 3, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: false },
        ],
      },
    ],
  },

  beginner_hypertrophy_3_full_gym: {
    name: 'Beginner PPL 3×',
    protocol: 'linear',
    weeks_per_cycle: 1,
    deload_after_failures: 3,
    deload_percentage: 0.90,
    upper_body_increment_kg: 2.5,
    lower_body_increment_kg: 2.5,
    sessions: [
      {
        day_label: 'Push',
        exercises: [
          { wger_id: W.BENCH, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.OHP, sets: 3, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_BENCH, sets: 3, reps: null, reps_min: 10, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Pull',
        exercises: [
          { wger_id: W.ROW, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.LAT_PD, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.CURL, sets: 3, reps: null, reps_min: 10, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Legs',
        exercises: [
          { wger_id: W.SQUAT, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.RDLIFT, sets: 3, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.LUNGE, sets: 3, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
        ],
      },
    ],
  },

  beginner_hypertrophy_4_full_gym: {
    name: 'Beginner Upper/Lower 4×',
    protocol: 'linear',
    weeks_per_cycle: 1,
    deload_after_failures: 3,
    deload_percentage: 0.90,
    upper_body_increment_kg: 2.5,
    lower_body_increment_kg: 2.5,
    sessions: [
      {
        day_label: 'Upper A',
        exercises: [
          { wger_id: W.BENCH, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.ROW, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.OHP, sets: 3, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.CURL, sets: 3, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Lower A',
        exercises: [
          { wger_id: W.SQUAT, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.RDLIFT, sets: 3, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.LUNGE, sets: 3, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
        ],
      },
      {
        day_label: 'Upper B',
        exercises: [
          { wger_id: W.DB_BENCH, sets: 4, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.LAT_PD, sets: 4, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_SHOULDER, sets: 3, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_CURL, sets: 3, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Lower B',
        exercises: [
          { wger_id: W.SQUAT, sets: 4, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.SPLIT_SQ, sets: 3, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.RDLIFT, sets: 3, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
        ],
      },
    ],
  },

  beginner_general_2_full_gym: {
    name: 'Full Body 2×',
    protocol: 'linear',
    weeks_per_cycle: 1,
    deload_after_failures: 3,
    deload_percentage: 0.90,
    upper_body_increment_kg: 2.5,
    lower_body_increment_kg: 5.0,
    sessions: [
      {
        day_label: 'Full Body A',
        exercises: [
          { wger_id: W.SQUAT, sets: 3, reps: 8, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.BENCH, sets: 3, reps: 8, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.ROW, sets: 3, reps: 8, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.PLANK, sets: 3, reps: null, reps_min: null, reps_max: null, target_duration_seconds: 30, logging_type: 'duration', is_lower_body: false },
        ],
      },
      {
        day_label: 'Full Body B',
        exercises: [
          { wger_id: W.DEADLIFT, sets: 3, reps: 5, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.OHP, sets: 3, reps: 8, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.LAT_PD, sets: 3, reps: 10, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.PLANK, sets: 3, reps: null, reps_min: null, reps_max: null, target_duration_seconds: 30, logging_type: 'duration', is_lower_body: false },
        ],
      },
    ],
  },

  beginner_general_3_full_gym: {
    name: 'Full Body 3× (General Fitness)',
    protocol: 'linear',
    weeks_per_cycle: 1,
    deload_after_failures: 3,
    deload_percentage: 0.90,
    upper_body_increment_kg: 2.5,
    lower_body_increment_kg: 5.0,
    sessions: [
      {
        day_label: 'Full Body A',
        exercises: [
          { wger_id: W.SQUAT, sets: 3, reps: 8, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.BENCH, sets: 3, reps: 8, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.ROW, sets: 3, reps: 8, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.PLANK, sets: 3, reps: null, reps_min: null, reps_max: null, target_duration_seconds: 30, logging_type: 'duration', is_lower_body: false },
        ],
      },
      {
        day_label: 'Full Body B',
        exercises: [
          { wger_id: W.DEADLIFT, sets: 3, reps: 5, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.OHP, sets: 3, reps: 8, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.LAT_PD, sets: 3, reps: 10, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.PLANK, sets: 3, reps: null, reps_min: null, reps_max: null, target_duration_seconds: 30, logging_type: 'duration', is_lower_body: false },
        ],
      },
      {
        day_label: 'Full Body C',
        exercises: [
          { wger_id: W.SQUAT, sets: 3, reps: 8, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.DB_BENCH, sets: 3, reps: 10, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_ROW, sets: 3, reps: 10, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.CURL, sets: 3, reps: 12, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
    ],
  },

  beginner_endurance_3_bodyweight: {
    name: 'Bodyweight Cardio 3×',
    protocol: 'linear',
    weeks_per_cycle: 1,
    deload_after_failures: 3,
    deload_percentage: 1.0,
    upper_body_increment_kg: 0,
    lower_body_increment_kg: 0,
    sessions: [
      {
        day_label: 'Session A',
        exercises: [
          { wger_id: W.RUNNING, sets: 1, reps: null, reps_min: null, reps_max: null, target_duration_seconds: 1200, logging_type: 'duration', is_lower_body: false },
          { wger_id: W.BURPEE, sets: 3, reps: null, reps_min: 10, reps_max: 15, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: false },
          { wger_id: W.PLANK, sets: 3, reps: null, reps_min: null, reps_max: null, target_duration_seconds: 45, logging_type: 'duration', is_lower_body: false },
        ],
      },
      {
        day_label: 'Session B',
        exercises: [
          { wger_id: W.BURPEE, sets: 4, reps: null, reps_min: 12, reps_max: 20, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: false },
          { wger_id: W.LUNGE, sets: 3, reps: null, reps_min: 15, reps_max: 20, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: true },
          { wger_id: W.PUSHUP, sets: 3, reps: null, reps_min: 10, reps_max: 20, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Session C',
        exercises: [
          { wger_id: W.RUNNING, sets: 1, reps: null, reps_min: null, reps_max: null, target_duration_seconds: 1500, logging_type: 'duration', is_lower_body: false },
          { wger_id: W.PLANK, sets: 3, reps: null, reps_min: null, reps_max: null, target_duration_seconds: 60, logging_type: 'duration', is_lower_body: false },
          { wger_id: W.PUSHUP, sets: 3, reps: null, reps_min: 15, reps_max: 20, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: false },
        ],
      },
    ],
  },

  // ─── INTERMEDIATE ─────────────────────────────────────────────────────────────

  intermediate_strength_3_full_gym: {
    name: 'Texas Method 3×',
    protocol: 'linear',
    weeks_per_cycle: 1,
    deload_after_failures: 2,
    deload_percentage: 0.90,
    upper_body_increment_kg: 2.5,
    lower_body_increment_kg: 2.5,
    sessions: [
      {
        day_label: 'Volume Day (Mon)',
        exercises: [
          { wger_id: W.SQUAT, sets: 5, reps: 5, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.BENCH, sets: 5, reps: 5, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DEADLIFT, sets: 1, reps: 5, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
        ],
      },
      {
        day_label: 'Recovery Day (Wed)',
        exercises: [
          { wger_id: W.SQUAT, sets: 5, reps: 2, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.OHP, sets: 5, reps: 5, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.ROW, sets: 5, reps: 5, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Intensity Day (Fri)',
        exercises: [
          { wger_id: W.SQUAT, sets: 1, reps: 5, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.BENCH, sets: 1, reps: 5, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DEADLIFT, sets: 1, reps: 5, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
        ],
      },
    ],
  },

  intermediate_strength_4_full_gym: {
    name: 'Upper/Lower Power 4×',
    protocol: 'linear',
    weeks_per_cycle: 1,
    deload_after_failures: 2,
    deload_percentage: 0.90,
    upper_body_increment_kg: 2.5,
    lower_body_increment_kg: 5.0,
    sessions: [
      {
        day_label: 'Lower Power',
        exercises: [
          { wger_id: W.SQUAT, sets: 4, reps: 4, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.DEADLIFT, sets: 3, reps: 4, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.SPLIT_SQ, sets: 3, reps: 8, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
        ],
      },
      {
        day_label: 'Upper Power',
        exercises: [
          { wger_id: W.BENCH, sets: 4, reps: 4, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.ROW, sets: 4, reps: 4, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.OHP, sets: 3, reps: 6, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.PULLUP, sets: 3, reps: null, reps_min: 4, reps_max: 8, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Lower Volume',
        exercises: [
          { wger_id: W.SQUAT, sets: 4, reps: null, reps_min: 8, reps_max: 10, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.RDLIFT, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.LUNGE, sets: 3, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
        ],
      },
      {
        day_label: 'Upper Volume',
        exercises: [
          { wger_id: W.DB_BENCH, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.LAT_PD, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.OHP, sets: 3, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.CURL, sets: 3, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
    ],
  },

  intermediate_strength_3_dumbbells: {
    name: 'Dumbbell Power 3×',
    protocol: 'linear',
    weeks_per_cycle: 1,
    deload_after_failures: 2,
    deload_percentage: 0.90,
    upper_body_increment_kg: 2.5,
    lower_body_increment_kg: 2.5,
    sessions: [
      {
        day_label: 'Push',
        exercises: [
          { wger_id: W.DB_BENCH, sets: 5, reps: 5, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_SHOULDER, sets: 4, reps: 6, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.PUSHUP, sets: 3, reps: null, reps_min: 15, reps_max: 20, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Pull',
        exercises: [
          { wger_id: W.DB_ROW, sets: 5, reps: 5, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.PULLUP, sets: 4, reps: null, reps_min: 5, reps_max: 8, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: false },
          { wger_id: W.DB_CURL, sets: 3, reps: 8, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Legs',
        exercises: [
          { wger_id: W.GOBLET_SQ, sets: 5, reps: 6, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.SPLIT_SQ, sets: 4, reps: 8, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.LUNGE, sets: 3, reps: 10, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
        ],
      },
    ],
  },

  intermediate_hypertrophy_4_full_gym: {
    name: 'PPL Upper/Lower 4×',
    protocol: 'linear',
    weeks_per_cycle: 1,
    deload_after_failures: 3,
    deload_percentage: 0.90,
    upper_body_increment_kg: 2.5,
    lower_body_increment_kg: 2.5,
    sessions: [
      {
        day_label: 'Push',
        exercises: [
          { wger_id: W.BENCH, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.OHP, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_BENCH, sets: 4, reps: null, reps_min: 10, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_SHOULDER, sets: 3, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Pull',
        exercises: [
          { wger_id: W.ROW, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.LAT_PD, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.PULLUP, sets: 3, reps: null, reps_min: 6, reps_max: 10, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: false },
          { wger_id: W.CURL, sets: 3, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Legs',
        exercises: [
          { wger_id: W.SQUAT, sets: 5, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.RDLIFT, sets: 4, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.SPLIT_SQ, sets: 3, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
        ],
      },
      {
        day_label: 'Upper Accessory',
        exercises: [
          { wger_id: W.DB_BENCH, sets: 4, reps: null, reps_min: 10, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_ROW, sets: 4, reps: null, reps_min: 10, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_CURL, sets: 3, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
    ],
  },

  intermediate_hypertrophy_5_full_gym: {
    name: 'PPL 5× (Push/Pull/Legs/Upper/Lower)',
    protocol: 'linear',
    weeks_per_cycle: 1,
    deload_after_failures: 3,
    deload_percentage: 0.90,
    upper_body_increment_kg: 2.5,
    lower_body_increment_kg: 2.5,
    sessions: [
      {
        day_label: 'Push',
        exercises: [
          { wger_id: W.BENCH, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.OHP, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_BENCH, sets: 3, reps: null, reps_min: 10, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Pull',
        exercises: [
          { wger_id: W.ROW, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.LAT_PD, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.CURL, sets: 3, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Legs',
        exercises: [
          { wger_id: W.SQUAT, sets: 5, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.RDLIFT, sets: 4, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.LUNGE, sets: 3, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
        ],
      },
      {
        day_label: 'Upper',
        exercises: [
          { wger_id: W.DB_BENCH, sets: 4, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_ROW, sets: 4, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.PULLUP, sets: 3, reps: null, reps_min: 6, reps_max: 10, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: false },
          { wger_id: W.DB_CURL, sets: 3, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Lower',
        exercises: [
          { wger_id: W.SPLIT_SQ, sets: 4, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.RDLIFT, sets: 4, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.PLANK, sets: 3, reps: null, reps_min: null, reps_max: null, target_duration_seconds: 60, logging_type: 'duration', is_lower_body: false },
        ],
      },
    ],
  },

  intermediate_general_3_full_gym: {
    name: 'Intermediate Full Body 3×',
    protocol: 'linear',
    weeks_per_cycle: 1,
    deload_after_failures: 2,
    deload_percentage: 0.90,
    upper_body_increment_kg: 2.5,
    lower_body_increment_kg: 5.0,
    sessions: [
      {
        day_label: 'Full Body A',
        exercises: [
          { wger_id: W.SQUAT, sets: 4, reps: 5, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.BENCH, sets: 4, reps: 6, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.ROW, sets: 4, reps: 6, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.PLANK, sets: 3, reps: null, reps_min: null, reps_max: null, target_duration_seconds: 60, logging_type: 'duration', is_lower_body: false },
        ],
      },
      {
        day_label: 'Full Body B',
        exercises: [
          { wger_id: W.DEADLIFT, sets: 3, reps: 5, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.OHP, sets: 4, reps: 6, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.PULLUP, sets: 4, reps: null, reps_min: 5, reps_max: 8, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: false },
          { wger_id: W.CURL, sets: 3, reps: 10, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Full Body C',
        exercises: [
          { wger_id: W.SQUAT, sets: 4, reps: null, reps_min: 6, reps_max: 10, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.DB_BENCH, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_ROW, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.RDLIFT, sets: 3, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
        ],
      },
    ],
  },

  // ─── ADVANCED ─────────────────────────────────────────────────────────────────

  advanced_strength_4_full_gym: {
    name: 'Advanced Powerbuilding 4×',
    protocol: 'linear',
    weeks_per_cycle: 1,
    deload_after_failures: 2,
    deload_percentage: 0.90,
    upper_body_increment_kg: 2.5,
    lower_body_increment_kg: 2.5,
    sessions: [
      {
        day_label: 'Lower Power',
        exercises: [
          { wger_id: W.SQUAT, sets: 5, reps: 3, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.DEADLIFT, sets: 3, reps: 3, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.RDLIFT, sets: 3, reps: 6, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.SPLIT_SQ, sets: 3, reps: 8, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
        ],
      },
      {
        day_label: 'Upper Power',
        exercises: [
          { wger_id: W.BENCH, sets: 5, reps: 3, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.ROW, sets: 5, reps: 3, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.OHP, sets: 4, reps: 4, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.PULLUP, sets: 4, reps: null, reps_min: 6, reps_max: 10, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Lower Hypertrophy',
        exercises: [
          { wger_id: W.SQUAT, sets: 4, reps: null, reps_min: 8, reps_max: 10, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.RDLIFT, sets: 4, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.LUNGE, sets: 3, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.PLANK, sets: 3, reps: null, reps_min: null, reps_max: null, target_duration_seconds: 90, logging_type: 'duration', is_lower_body: false },
        ],
      },
      {
        day_label: 'Upper Hypertrophy',
        exercises: [
          { wger_id: W.DB_BENCH, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.LAT_PD, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_SHOULDER, sets: 4, reps: null, reps_min: 10, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.CURL, sets: 4, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
    ],
  },

  advanced_strength_5_full_gym: {
    name: 'Advanced 5-Day Powerlifting',
    protocol: 'linear',
    weeks_per_cycle: 1,
    deload_after_failures: 2,
    deload_percentage: 0.90,
    upper_body_increment_kg: 2.5,
    lower_body_increment_kg: 2.5,
    sessions: [
      {
        day_label: 'Squat Focus',
        exercises: [
          { wger_id: W.SQUAT, sets: 5, reps: 3, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.RDLIFT, sets: 4, reps: 6, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.SPLIT_SQ, sets: 3, reps: 8, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
        ],
      },
      {
        day_label: 'Bench Focus',
        exercises: [
          { wger_id: W.BENCH, sets: 5, reps: 3, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.ROW, sets: 5, reps: 5, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_BENCH, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Deadlift Focus',
        exercises: [
          { wger_id: W.DEADLIFT, sets: 4, reps: 3, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.SQUAT, sets: 3, reps: null, reps_min: 5, reps_max: 8, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.LUNGE, sets: 3, reps: 10, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
        ],
      },
      {
        day_label: 'OHP Focus',
        exercises: [
          { wger_id: W.OHP, sets: 5, reps: 3, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.PULLUP, sets: 5, reps: null, reps_min: 6, reps_max: 10, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: false },
          { wger_id: W.DB_SHOULDER, sets: 3, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.CURL, sets: 3, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Accessory',
        exercises: [
          { wger_id: W.SPLIT_SQ, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.DB_BENCH, sets: 4, reps: null, reps_min: 10, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.LAT_PD, sets: 4, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_CURL, sets: 3, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
    ],
  },

  advanced_hypertrophy_5_full_gym: {
    name: 'Advanced PPL 5×',
    protocol: 'linear',
    weeks_per_cycle: 1,
    deload_after_failures: 3,
    deload_percentage: 0.90,
    upper_body_increment_kg: 2.5,
    lower_body_increment_kg: 2.5,
    sessions: [
      {
        day_label: 'Push A',
        exercises: [
          { wger_id: W.BENCH, sets: 5, reps: null, reps_min: 6, reps_max: 10, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.OHP, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_BENCH, sets: 4, reps: null, reps_min: 10, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_SHOULDER, sets: 4, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Pull A',
        exercises: [
          { wger_id: W.ROW, sets: 5, reps: null, reps_min: 6, reps_max: 10, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.PULLUP, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: false },
          { wger_id: W.LAT_PD, sets: 4, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.CURL, sets: 4, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Legs',
        exercises: [
          { wger_id: W.SQUAT, sets: 5, reps: null, reps_min: 6, reps_max: 10, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.DEADLIFT, sets: 3, reps: 5, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.RDLIFT, sets: 4, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.SPLIT_SQ, sets: 3, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
        ],
      },
      {
        day_label: 'Push B',
        exercises: [
          { wger_id: W.OHP, sets: 5, reps: null, reps_min: 6, reps_max: 10, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.BENCH, sets: 4, reps: null, reps_min: 10, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_BENCH, sets: 4, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_SHOULDER, sets: 3, reps: null, reps_min: 15, reps_max: 20, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Pull B',
        exercises: [
          { wger_id: W.PULLUP, sets: 5, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: false },
          { wger_id: W.DB_ROW, sets: 5, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.LAT_PD, sets: 4, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_CURL, sets: 4, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
    ],
  },

  advanced_hypertrophy_6_full_gym: {
    name: 'PPL 6× (Push/Pull/Legs×2)',
    protocol: 'linear',
    weeks_per_cycle: 1,
    deload_after_failures: 3,
    deload_percentage: 0.90,
    upper_body_increment_kg: 2.5,
    lower_body_increment_kg: 2.5,
    sessions: [
      {
        day_label: 'Push A',
        exercises: [
          { wger_id: W.BENCH, sets: 5, reps: null, reps_min: 6, reps_max: 10, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.OHP, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_BENCH, sets: 4, reps: null, reps_min: 10, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Pull A',
        exercises: [
          { wger_id: W.ROW, sets: 5, reps: null, reps_min: 6, reps_max: 10, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.PULLUP, sets: 5, reps: null, reps_min: 6, reps_max: 10, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: false },
          { wger_id: W.CURL, sets: 4, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Legs A',
        exercises: [
          { wger_id: W.SQUAT, sets: 5, reps: null, reps_min: 6, reps_max: 10, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.RDLIFT, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.LUNGE, sets: 3, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
        ],
      },
      {
        day_label: 'Push B',
        exercises: [
          { wger_id: W.OHP, sets: 5, reps: null, reps_min: 6, reps_max: 10, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.BENCH, sets: 4, reps: null, reps_min: 10, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_SHOULDER, sets: 4, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Pull B',
        exercises: [
          { wger_id: W.PULLUP, sets: 5, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: false },
          { wger_id: W.DB_ROW, sets: 5, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_CURL, sets: 4, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Legs B',
        exercises: [
          { wger_id: W.DEADLIFT, sets: 4, reps: 4, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.SPLIT_SQ, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.RDLIFT, sets: 4, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
        ],
      },
    ],
  },

  advanced_general_4_full_gym: {
    name: 'Advanced General Fitness 4×',
    protocol: 'linear',
    weeks_per_cycle: 1,
    deload_after_failures: 2,
    deload_percentage: 0.90,
    upper_body_increment_kg: 2.5,
    lower_body_increment_kg: 2.5,
    sessions: [
      {
        day_label: 'Lower Power',
        exercises: [
          { wger_id: W.SQUAT, sets: 5, reps: 4, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.DEADLIFT, sets: 3, reps: 4, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.SPLIT_SQ, sets: 3, reps: 8, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
        ],
      },
      {
        day_label: 'Upper Power',
        exercises: [
          { wger_id: W.BENCH, sets: 5, reps: 4, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.ROW, sets: 5, reps: 5, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.OHP, sets: 4, reps: 5, reps_min: null, reps_max: null, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.PULLUP, sets: 4, reps: null, reps_min: 6, reps_max: 10, target_duration_seconds: null, logging_type: 'bodyweight_reps', is_lower_body: false },
        ],
      },
      {
        day_label: 'Lower Hypertrophy',
        exercises: [
          { wger_id: W.SQUAT, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.RDLIFT, sets: 4, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.LUNGE, sets: 3, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: true },
          { wger_id: W.PLANK, sets: 3, reps: null, reps_min: null, reps_max: null, target_duration_seconds: 90, logging_type: 'duration', is_lower_body: false },
        ],
      },
      {
        day_label: 'Upper Hypertrophy',
        exercises: [
          { wger_id: W.DB_BENCH, sets: 4, reps: null, reps_min: 8, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.LAT_PD, sets: 4, reps: null, reps_min: 10, reps_max: 12, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.DB_SHOULDER, sets: 3, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
          { wger_id: W.CURL, sets: 3, reps: null, reps_min: 12, reps_max: 15, target_duration_seconds: null, logging_type: 'weight_reps', is_lower_body: false },
        ],
      },
    ],
  },
};

function resolveTemplateKey(experience, goal, days, equipment) {
  const key = `${experience}_${goal}_${days}_${equipment}`;
  if (TEMPLATES[key]) return key;
  for (let d = days - 1; d >= 2; d--) {
    const k = `${experience}_${goal}_${d}_${equipment}`;
    if (TEMPLATES[k]) return k;
  }
  for (let d = days; d >= 2; d--) {
    const k = `${experience}_${goal}_${d}_full_gym`;
    if (TEMPLATES[k]) return k;
  }
  for (let d = days; d >= 2; d--) {
    const k = `${experience}_general_${d}_full_gym`;
    if (TEMPLATES[k]) return k;
  }
  return 'beginner_general_3_full_gym';
}

module.exports = { TEMPLATES, resolveTemplateKey };
