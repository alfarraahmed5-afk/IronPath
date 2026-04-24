module.exports = {
  barbell_plates_kg: [0.25, 0.5, 1.25, 2.5, 5, 10, 15, 20, 25],
  dumbbell_increment_kg: 2.5
  // Plate algorithm: target_per_side = (target_weight - bar_weight) / 2
  // Greedy descent from heaviest plate to lightest
  // Round dumbbell target to nearest increment: Math.round(x/2.5)*2.5
};
