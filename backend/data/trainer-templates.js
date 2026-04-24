// wger exercise IDs used in templates
// These are resolved to internal UUIDs at runtime via exercises.wger_id column
const W = {
  SQUAT: 110,
  BENCH: 192,
  DEADLIFT: 241,
  OHP: 74,
  ROW: 63,
  RDLIFT: 89,
  PULLUP: 31,
  LAT_PD: 122,
  CURL: 99,
  PUSHUP: 91,
  LUNGE: 78,
  PLANK: 95,
  BURPEE: 156,
  RUNNING: 215,
  GOBLET_SQ: 118,
  SPLIT_SQ: 170,
  DB_BENCH: 21,
  DB_SHOULDER: 68,
  DB_ROW: 72,
  DB_CURL: 5,
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
