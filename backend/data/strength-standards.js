// Strength level classification — multipliers of bodyweight_kg for projected_1RM
// WGER IDs MUST be verified against live API at import time
// Ratios: [Beginner, Intermediate, Advanced, Elite]
module.exports = {
  exercises: {
    110: { name: 'Squat',                    male: [0.75, 1.25, 1.75, 2.25], female: [0.50, 0.90, 1.30, 1.70] },
    192: { name: 'Bench Press (Barbell)',     male: [0.50, 0.75, 1.25, 1.60], female: [0.30, 0.55, 0.80, 1.05] },
    241: { name: 'Deadlift (Conventional)',   male: [1.00, 1.50, 2.00, 2.50], female: [0.75, 1.15, 1.55, 2.00] },
    79:  { name: 'Overhead Press (Barbell)',  male: [0.35, 0.55, 0.80, 1.10], female: [0.20, 0.35, 0.55, 0.75] },
    212: { name: 'Barbell Row',               male: [0.50, 0.75, 1.10, 1.40], female: [0.35, 0.55, 0.80, 1.05] },
  }
};
// Usage: classify(projected_1rm_kg, bodyweight_kg, standard)
// levels = ['Beginner','Intermediate','Advanced','Elite']
// ratio = projected_1rm_kg / bodyweight_kg
// level = levels[ratios.findIndex(r => ratio < r)] ?? 'Elite'
