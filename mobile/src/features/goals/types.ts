/**
 * Shared Goal types (matches backend migration 054 + routes/goals.ts).
 */
export type GoalType = 'target_weight' | 'consistency' | 'bodyweight';
export type GoalStatus = 'active' | 'completed' | 'abandoned';

export interface Goal {
  id: string;
  user_id: string;
  gym_id?: string | null;
  goal_type: GoalType;
  exercise_id?: string | null;
  target_value: number;
  target_unit: string;
  target_date?: string | null;
  starting_value?: number | null;
  starting_date: string;
  current_value?: number | null;
  status: GoalStatus;
  completed_at?: string | null;
  abandoned_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalCreatePayload {
  goal_type: GoalType;
  exercise_id?: string | null;
  target_value: number;
  target_unit: string;
  target_date?: string | null;
  starting_value?: number | null;
}

export function goalProgressPercent(goal: Goal): number {
  const start = goal.starting_value ?? 0;
  const current = goal.current_value ?? start;
  const target = goal.target_value;
  if (target === start) return current >= target ? 1 : 0;
  const denom = target - start;
  const num = current - start;
  // Polarity-aware: cutting goals (target < start) get inverted.
  const frac = num / denom;
  return Math.max(0, Math.min(1, frac));
}

export function goalShortLabel(goal: Goal, exerciseNameLookup?: (id: string) => string | undefined): string {
  switch (goal.goal_type) {
    case 'target_weight': {
      const name = goal.exercise_id ? exerciseNameLookup?.(goal.exercise_id) ?? 'Lift' : 'Lift';
      return `${name}: ${goal.target_value} ${goal.target_unit}`;
    }
    case 'consistency':
      return `${goal.target_value} sessions/week`;
    case 'bodyweight':
      return `Bodyweight: ${goal.target_value} ${goal.target_unit}`;
  }
}
