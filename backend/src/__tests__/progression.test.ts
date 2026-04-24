import {
  applyProgressionStep,
  applyOverride,
  calcTrend,
  roundToNearest2_5,
  ExerciseState,
} from '../lib/progressionCalc';

const baseState: ExerciseState = {
  current_weight_kg: 100,
  consecutive_successes: 0,
  consecutive_failures: 0,
  total_sessions_logged: 0,
  last_session_date: null,
  override_history: [],
};

const linearTemplate = {
  protocol: 'linear',
  deload_after_failures: 2,
  deload_percentage: 0.90,
  upper_body_increment_kg: 2.5,
  lower_body_increment_kg: 5.0,
};

const hypertrophyTemplate = {
  protocol: 'hypertrophy',
  deload_after_failures: 3,
  deload_percentage: 0.90,
  upper_body_increment_kg: 2.5,
  lower_body_increment_kg: 2.5,
};

const lowerBodyExercise = {
  sets: 5, reps: 5, reps_min: null, is_lower_body: true,
};
const upperBodyExercise = {
  sets: 5, reps: 5, reps_min: null, is_lower_body: false,
};

// ── Linear protocol ─────────────────────────────────────────────────────────

describe('applyProgressionStep — linear protocol', () => {
  test('successful session increments lower body weight by 5kg', () => {
    const result = applyProgressionStep(baseState, lowerBodyExercise, linearTemplate, 5, true, 1.0);
    expect(result.current_weight_kg).toBe(105); // 100 + 5
    expect(result.consecutive_successes).toBe(0);
    expect(result.total_sessions_logged).toBe(1);
  });

  test('successful session increments upper body weight by 2.5kg', () => {
    const result = applyProgressionStep(baseState, upperBodyExercise, linearTemplate, 5, true, 1.0);
    expect(result.current_weight_kg).toBe(102.5);
  });

  test('threshold=1 for linear — fires immediately on first success', () => {
    const result = applyProgressionStep(baseState, lowerBodyExercise, linearTemplate, 5, true, 1.0);
    expect(result.current_weight_kg).toBe(105);
    expect(result.consecutive_successes).toBe(0); // reset after fire
  });

  test('failed session does not increment weight', () => {
    const result = applyProgressionStep(baseState, lowerBodyExercise, linearTemplate, 5, false, 1.0);
    expect(result.current_weight_kg).toBe(100);
    expect(result.consecutive_failures).toBe(1);
  });

  test('deload fires on 2nd consecutive failure', () => {
    const afterFirst = applyProgressionStep(baseState, lowerBodyExercise, linearTemplate, 5, false, 1.0);
    const afterSecond = applyProgressionStep(afterFirst, lowerBodyExercise, linearTemplate, 5, false, 1.0);
    // 100 * 0.90 = 90, rounded to nearest 2.5 = 90
    expect(afterSecond.current_weight_kg).toBe(90);
    expect(afterSecond.consecutive_failures).toBe(0); // reset after deload
  });

  test('single failure then success resets failure counter', () => {
    const afterFail = applyProgressionStep(baseState, lowerBodyExercise, linearTemplate, 5, false, 1.0);
    expect(afterFail.consecutive_failures).toBe(1);
    const afterSuccess = applyProgressionStep(afterFail, lowerBodyExercise, linearTemplate, 5, true, 1.0);
    expect(afterSuccess.consecutive_failures).toBe(0);
    expect(afterSuccess.current_weight_kg).toBe(105);
  });

  test('partial completion (not enough sets) is treated as failure', () => {
    // 3/5 sets = 0.6 completion < 1.0
    const result = applyProgressionStep(baseState, lowerBodyExercise, linearTemplate, 3, true, 1.0);
    expect(result.consecutive_failures).toBe(1);
    expect(result.current_weight_kg).toBe(100);
  });
});

// ── Increment multiplier ─────────────────────────────────────────────────────

describe('applyProgressionStep — increment multiplier', () => {
  test('1.25× multiplier increases increment proportionally', () => {
    const result = applyProgressionStep(baseState, lowerBodyExercise, linearTemplate, 5, true, 1.25);
    // 5.0 * 1.25 = 6.25, rounded to nearest 2.5 = 7.5 → 100 + 7.5 = 107.5
    expect(result.current_weight_kg).toBe(107.5);
  });

  test('0.75× multiplier reduces increment', () => {
    const result = applyProgressionStep(baseState, upperBodyExercise, linearTemplate, 5, true, 0.75);
    // 2.5 * 0.75 = 1.875, rounded to nearest 2.5 = 2.5 → 100 + 2.5 = 102.5
    expect(result.current_weight_kg).toBe(102.5);
  });
});

// ── Hypertrophy protocol (threshold=3) ──────────────────────────────────────

describe('applyProgressionStep — hypertrophy protocol', () => {
  test('does not increment on first success (threshold=3)', () => {
    const result = applyProgressionStep(baseState, lowerBodyExercise, hypertrophyTemplate, 5, true, 1.0);
    expect(result.current_weight_kg).toBe(100);
    expect(result.consecutive_successes).toBe(1);
  });

  test('increments on 3rd consecutive success', () => {
    let s = baseState;
    for (let i = 0; i < 3; i++) {
      s = applyProgressionStep(s, lowerBodyExercise, hypertrophyTemplate, 5, true, 1.0);
    }
    expect(s.current_weight_kg).toBe(102.5); // 100 + 2.5
    expect(s.consecutive_successes).toBe(0);
  });
});

// ── Weight rounding ──────────────────────────────────────────────────────────

describe('roundToNearest2_5', () => {
  test('rounds 101.25 → 102.5 (nearest 2.5)', () => expect(roundToNearest2_5(101.25)).toBe(102.5));
  test('rounds 91.25 → 92.5', () => expect(roundToNearest2_5(91.25)).toBe(92.5));
  test('90 * 0.9 = 81, rounds → 80', () => expect(roundToNearest2_5(81)).toBe(80));
  test('keeps clean multiples unchanged', () => expect(roundToNearest2_5(102.5)).toBe(102.5));
  test('rounds 63.75 → 65', () => expect(roundToNearest2_5(63.75)).toBe(65));
  test('rounds 63.74 → 62.5', () => expect(roundToNearest2_5(63.74)).toBe(62.5));
});

// ── Override learning ────────────────────────────────────────────────────────

describe('applyOverride', () => {
  test('up override increases bias and adds to history', () => {
    const { state, override_bias, increment_multiplier } = applyOverride(baseState, 65, 60, 0, 1.0);
    expect(state.current_weight_kg).toBe(65);
    expect(override_bias).toBe(1);
    expect(increment_multiplier).toBe(1.0);
    expect(state.override_history).toHaveLength(1);
    expect(state.override_history[0].direction).toBe('up');
  });

  test('down override decreases bias', () => {
    const { override_bias } = applyOverride(baseState, 55, 60, 0, 1.0);
    expect(override_bias).toBe(-1);
  });

  test('bias >= 3 sets multiplier to 1.25', () => {
    const { increment_multiplier } = applyOverride(baseState, 65, 60, 2, 1.0);
    expect(increment_multiplier).toBe(1.25);
  });

  test('bias <= -3 sets multiplier to 0.75', () => {
    const { increment_multiplier } = applyOverride(baseState, 55, 60, -2, 1.0);
    expect(increment_multiplier).toBe(0.75);
  });

  test('bias is clamped to ±5', () => {
    const { override_bias } = applyOverride(baseState, 65, 60, 5, 1.0);
    expect(override_bias).toBe(5); // already at max, stays
  });

  test('bias -4 clamped to -5 not -4', () => {
    // starting at -4, one down push → -5 (clamped at -5)
    const { override_bias } = applyOverride(baseState, 55, 60, -4, 1.0);
    expect(override_bias).toBe(-5);
  });
});

// ── Trend calculation ────────────────────────────────────────────────────────

describe('calcTrend', () => {
  test('consecutive_successes > 0 → trending_up', () => {
    expect(calcTrend({ ...baseState, consecutive_successes: 1 }, 2)).toBe('trending_up');
  });

  test('consecutive_failures >= deload_after_failures → deloaded', () => {
    expect(calcTrend({ ...baseState, consecutive_failures: 2 }, 2)).toBe('deloaded');
  });

  test('all zeros → stalled', () => {
    expect(calcTrend(baseState, 2)).toBe('stalled');
  });

  test('trending_up takes precedence over failures', () => {
    const s = { ...baseState, consecutive_successes: 1, consecutive_failures: 3 };
    expect(calcTrend(s, 2)).toBe('trending_up');
  });
});
