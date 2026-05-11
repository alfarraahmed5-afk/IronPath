// [wger_id, display_name]
// wger_id resolves to the internal exercise UUID at startup via the
// exercises.wger_id column. display_name is a fallback label -- the
// public route prefers the live DB name when present.
//
// 2026-05-11: re-grounded every entry against the post-import production
// catalog (881 rows). The old IDs (110 / 192 / 241 etc.) all pointed at
// the pre-import wger.de numbering and were silently mapping the
// leaderboard to wrong exercises (or to no exercise at all). See
// skills/exercise-cleanup/ID-MAPPING.md for the full audit trail.
//
// LB_TRAP_BAR_DL stays at 0 -- the wger catalog only carries "Trap Bar
// Squat" right now, not a trap-bar deadlift. The startup resolver
// skips zero IDs.
module.exports = [
  // Compound / powerlifting
  [1627, 'Barbell Squat'],
  [73,   'Barbell Bench Press'],
  [184,  'Barbell Deadlift'],
  [687,  'Overhead Press'],
  [1698, 'Barbell Row'],
  [1700, 'Romanian Deadlift'],
  [630,  'Sumo Deadlift'],
  [257,  'Front Squat'],
  [0,    'Trap Bar Deadlift'],  // not in current wger catalog

  // Upper body pulls
  [475,  'Pull-Up'],
  [152,  'Chin-Up'],
  [1806, 'Lat Pulldown'],
  [1117, 'Seated Cable Row'],

  // Chest
  [538,  'Incline Barbell Press'],
  [185,  'Decline Barbell Press'],
  [1676, 'Dumbbell Bench Press'],
  [924,  'Cable Fly'],
  [135,  'Pec Deck Machine'],

  // Shoulders
  [1337, 'Dumbbell Shoulder Press'],
  [348,  'Lateral Raise'],
  [20,   'Arnold Press'],
  [222,  'Cable Face Pull'],

  // Arms
  [91,   'Barbell Curl'],
  [1932, 'Hammer Curl'],
  [465,  'Preacher Curl'],
  [204,  'Incline Dumbbell Curl'],
  [1185, 'Tricep Pushdown'],
  [1480, 'Skull Crusher'],
  [1897, 'Close Grip Bench Press'],
  [194,  'Tricep Dip'],

  // Legs
  [371,  'Leg Press'],
  [364,  'Lying Leg Curl'],
  [369,  'Leg Extension'],
  [294,  'Hip Thrust'],
  [988,  'Bulgarian Split Squat'],
  [46,   'Barbell Lunge'],
  [622,  'Standing Calf Raise'],
];
