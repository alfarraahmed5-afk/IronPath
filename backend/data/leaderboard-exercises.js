// [wger_id, display_name]
// wger_id is used to resolve the internal exercise UUID at startup.
// display_name is the fallback label — the route prefers the live DB name.
module.exports = [
  // Compound / powerlifting
  [110, 'Barbell Squat'],
  [192, 'Barbell Bench Press'],
  [241, 'Barbell Deadlift'],
  [79,  'Overhead Press'],
  [212, 'Barbell Row'],
  [91,  'Romanian Deadlift'],
  [240, 'Sumo Deadlift'],
  [111, 'Front Squat'],
  [242, 'Trap Bar Deadlift'],

  // Upper body pulls
  [31,  'Pull-Up'],
  [32,  'Chin-Up'],
  [36,  'Lat Pulldown'],
  [214, 'Seated Cable Row'],

  // Chest
  [73,  'Incline Barbell Press'],
  [74,  'Decline Barbell Press'],
  [24,  'Dumbbell Bench Press'],
  [27,  'Cable Fly'],
  [28,  'Pec Deck Machine'],

  // Shoulders
  [78,  'Dumbbell Shoulder Press'],
  [77,  'Lateral Raise'],
  [81,  'Arnold Press'],
  [82,  'Cable Face Pull'],

  // Arms
  [2,   'Barbell Curl'],
  [3,   'Hammer Curl'],
  [7,   'Barbell Preacher Curl'],
  [10,  'Incline Curl'],
  [63,  'Tricep Pushdown'],
  [64,  'Skull Crusher'],
  [75,  'Close Grip Bench Press'],
  [37,  'Tricep Dip'],

  // Legs
  [44,  'Leg Press'],
  [116, 'Lying Leg Curl'],
  [117, 'Leg Extension'],
  [175, 'Hip Thrust'],
  [103, 'Bulgarian Split Squat'],
  [99,  'Barbell Lunge'],
  [121, 'Standing Calf Raise'],
];
