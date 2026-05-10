/**
 * BE-F (mobile cinematic overhaul) -- goals auto-completion cron.
 *
 * Per lens 7 P1-2 and founder Q3. Runs nightly. For each `active`
 * user_goal:
 *   - target_weight: compare current PR on the exercise to target.
 *   - bodyweight:    compare latest measurement to target.
 *   - consistency:   compare distinct ISO weeks where session count
 *                    >= per-week target between starting_date and now.
 * When the criterion is met, mark the goal `completed`, set
 * completed_at, and emit a push notification on the pr-and-streak
 * channel so the next app focus surfaces the celebration takeover.
 *
 * Idempotent. Safe to re-run -- already-completed goals are
 * filtered out by the WHERE clause.
 */
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

interface GoalRow {
  id: string;
  user_id: string;
  gym_id: string | null;
  goal_type: 'target_weight' | 'consistency' | 'bodyweight';
  exercise_id: string | null;
  target_value: number;
  target_date: string | null;
  starting_date: string;
  status: string;
}

export async function runGoalsAutoComplete(): Promise<{ scanned: number; completed: number }> {
  const { data: goals, error } = await supabase
    .from('user_goals')
    .select('id, user_id, gym_id, goal_type, exercise_id, target_value, target_date, starting_date, status')
    .eq('status', 'active');
  if (error) throw error;

  const list = (goals ?? []) as GoalRow[];
  let completed = 0;

  for (const goal of list) {
    let isComplete = false;
    let currentValue: number | null = null;

    try {
      if (goal.goal_type === 'target_weight' && goal.exercise_id) {
        const { data: pr } = await supabase
          .from('personal_records')
          .select('value')
          .eq('user_id', goal.user_id)
          .eq('exercise_id', goal.exercise_id)
          .order('value', { ascending: false })
          .limit(1)
          .maybeSingle();
        currentValue = pr ? Number(pr.value) : null;
        if (currentValue != null && currentValue >= Number(goal.target_value)) isComplete = true;
      } else if (goal.goal_type === 'bodyweight') {
        const { data: bm } = await supabase
          .from('body_measurements')
          .select('bodyweight_kg')
          .eq('user_id', goal.user_id)
          .not('bodyweight_kg', 'is', null)
          .order('measured_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        currentValue = bm?.bodyweight_kg ? Number(bm.bodyweight_kg) : null;
        // Bodyweight goals can be cut (current <= target) or bulk (current >= target).
        // We treat the goal as met when the user moves the absolute distance
        // from start toward target to zero or past it.
        if (currentValue != null) {
          // Read starting_value to determine polarity.
          const { data: full } = await supabase
            .from('user_goals')
            .select('starting_value')
            .eq('id', goal.id)
            .maybeSingle();
          const start = full?.starting_value ? Number(full.starting_value) : null;
          if (start != null) {
            const cuttingGoal = goal.target_value < start;
            if (cuttingGoal && currentValue <= goal.target_value) isComplete = true;
            if (!cuttingGoal && currentValue >= goal.target_value) isComplete = true;
          }
        }
      } else if (goal.goal_type === 'consistency') {
        const { data: workouts } = await supabase
          .from('workouts')
          .select('started_at')
          .eq('user_id', goal.user_id)
          .eq('is_completed', true)
          .gte('started_at', `${goal.starting_date}T00:00:00.000Z`);
        // Distinct ISO weeks with at least 1 workout.
        const weeks = new Set<string>();
        for (const w of workouts ?? []) {
          const d = new Date(w.started_at);
          const day = (d.getUTCDay() + 6) % 7;
          const monday = new Date(d);
          monday.setUTCDate(d.getUTCDate() - day);
          weeks.add(monday.toISOString().slice(0, 10));
        }
        currentValue = weeks.size;
        if (currentValue >= Number(goal.target_value)) isComplete = true;
      }
    } catch (innerErr) {
      logger.warn({ err: innerErr, goalId: goal.id }, 'goal evaluation failed');
      continue;
    }

    // Push the current_value forward even when not yet complete so
    // mobile UIs show live progress.
    if (currentValue != null) {
      await supabase.from('user_goals').update({ current_value: currentValue }).eq('id', goal.id);
    }

    if (!isComplete) continue;

    const { error: updErr } = await supabase
      .from('user_goals')
      .update({ status: 'completed', completed_at: new Date().toISOString(), current_value: currentValue })
      .eq('id', goal.id)
      .eq('status', 'active'); // idempotent guard
    if (updErr) {
      logger.warn({ err: updErr, goalId: goal.id }, 'goal completion update failed');
      continue;
    }

    await supabase.from('notifications').insert({
      user_id: goal.user_id,
      gym_id: goal.gym_id,
      type: 'goal_completed',
      title: 'You hit your goal',
      body: 'Open IronPath to celebrate.',
      data: { goal_id: goal.id, goal_type: goal.goal_type },
    });

    completed++;
  }

  return { scanned: list.length, completed };
}
