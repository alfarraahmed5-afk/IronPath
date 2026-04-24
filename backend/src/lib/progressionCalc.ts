// Pure progression calculation functions — no DB dependencies, fully testable

export interface ExerciseState {
  current_weight_kg: number;
  consecutive_successes: number;
  consecutive_failures: number;
  total_sessions_logged: number;
  last_session_date: string | null;
  override_history: Array<{ date: string; prescribed_kg: number; override_kg: number; direction: 'up' | 'down' }>;
}

export interface TemplateExercise {
  sets: number;
  reps: number | null;
  reps_min: number | null;
  is_lower_body: boolean;
}

export interface ProgressionTemplate {
  protocol: string;
  deload_after_failures: number;
  deload_percentage: number;
  upper_body_increment_kg: number;
  lower_body_increment_kg: number;
}

export function applyProgressionStep(
  state: ExerciseState,
  templateExercise: TemplateExercise,
  template: ProgressionTemplate,
  completedSetCount: number,
  allRepsHit: boolean,
  incrementMultiplier: number
): ExerciseState {
  const next = { ...state };
  const completionRate = completedSetCount / templateExercise.sets;

  if (allRepsHit && completionRate >= 1.0) {
    next.consecutive_successes += 1;
    next.consecutive_failures = 0;
    const threshold = template.protocol === 'linear' ? 1 : 3;
    if (next.consecutive_successes >= threshold) {
      const baseIncrement = templateExercise.is_lower_body
        ? template.lower_body_increment_kg
        : template.upper_body_increment_kg;
      const effectiveIncrement = baseIncrement * incrementMultiplier;
      if (effectiveIncrement > 0) {
        next.current_weight_kg = Math.round(
          (next.current_weight_kg + effectiveIncrement) / 2.5
        ) * 2.5;
      }
      next.consecutive_successes = 0;
    }
  } else {
    next.consecutive_failures += 1;
    next.consecutive_successes = 0;
    if (next.consecutive_failures >= template.deload_after_failures) {
      if (template.deload_percentage < 1.0) {
        next.current_weight_kg = Math.round(
          (next.current_weight_kg * template.deload_percentage) / 2.5
        ) * 2.5;
      }
      next.consecutive_failures = 0;
    }
  }

  next.total_sessions_logged += 1;
  return next;
}

export function applyOverride(
  state: ExerciseState,
  overrideKg: number,
  prescribedKg: number,
  overrideBias: number,
  incrementMultiplier: number
): { state: ExerciseState; override_bias: number; increment_multiplier: number } {
  const direction: 'up' | 'down' = overrideKg > prescribedKg ? 'up' : 'down';
  const next: ExerciseState = {
    ...state,
    current_weight_kg: overrideKg,
    override_history: [
      ...(state.override_history || []),
      { date: new Date().toISOString(), prescribed_kg: prescribedKg, override_kg: overrideKg, direction },
    ],
  };

  let newBias = Math.max(-5, Math.min(5, overrideBias + (direction === 'up' ? 1 : -1)));
  let newMultiplier: number;
  if (newBias >= 3) newMultiplier = 1.25;
  else if (newBias <= -3) newMultiplier = 0.75;
  else newMultiplier = 1.0;

  return { state: next, override_bias: newBias, increment_multiplier: newMultiplier };
}

export function calcTrend(
  state: ExerciseState,
  deloadAfterFailures: number
): 'trending_up' | 'stalled' | 'deloaded' {
  if (state.consecutive_successes > 0) return 'trending_up';
  if (state.consecutive_failures >= deloadAfterFailures) return 'deloaded';
  return 'stalled';
}

export function roundToNearest2_5(kg: number): number {
  return Math.round(kg / 2.5) * 2.5;
}
