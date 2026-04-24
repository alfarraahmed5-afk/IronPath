import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { AppError } from '../middleware/errorHandler';
import { requireActiveUser } from '../middleware/requireActiveUser';
import { logger } from '../lib/logger';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { TEMPLATES, resolveTemplateKey } = require('../../data/trainer-templates');

const router = Router();

const programSchema = z.object({
  goal: z.enum(['strength', 'hypertrophy', 'endurance', 'general']),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']),
  days_per_week: z.number().int().min(2).max(6),
  equipment: z.enum(['full_gym', 'dumbbells', 'bodyweight', 'home_mixed']),
  initial_weights: z.array(z.object({
    wger_id: z.number().int(),
    weight_kg: z.number().min(0),
  })).optional().default([]),
});

const feedbackSchema = z.object({
  exercise_id: z.string().uuid(),
  override_kg: z.number().min(0),
  prescribed_kg: z.number().min(0),
});

// POST /trainer/program — create or replace AI program
router.post('/program', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const parsed = programSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('VALIDATION_ERROR', 422, 'Validation failed'));
    const body = parsed.data;

    const templateKey = resolveTemplateKey(body.experience_level, body.goal, body.days_per_week, body.equipment);
    const template = TEMPLATES[templateKey];

    // Resolve wger_ids → internal exercise UUIDs for initial_weights
    const wgerIds = body.initial_weights.map(w => w.wger_id);
    const exercisesMap: Record<number, string> = {};
    if (wgerIds.length > 0) {
      const { data: exRows } = await supabase.from('exercises').select('id, wger_id').in('wger_id', wgerIds);
      for (const ex of exRows || []) {
        if (ex.wger_id != null) exercisesMap[ex.wger_id] = ex.id;
      }
    }

    // Build initial progression_data.exercises
    const exerciseStates: Record<string, object> = {};
    for (const w of body.initial_weights) {
      const uuid = exercisesMap[w.wger_id];
      if (!uuid) continue;
      exerciseStates[uuid] = {
        current_weight_kg: w.weight_kg,
        consecutive_successes: 0,
        consecutive_failures: 0,
        total_sessions_logged: 0,
        last_session_date: null,
        override_history: [],
      };
    }

    const progressionData = {
      total_program_sessions_completed: 0,
      increment_multiplier: 1.0,
      override_bias: 0,
      exercises: exerciseStates,
    };

    const { data: program, error } = await supabase
      .from('ai_trainer_programs')
      .upsert({
        user_id: req.user.id,
        gym_id: req.user.gym_id,
        goal: body.goal,
        experience_level: body.experience_level,
        days_per_week: body.days_per_week,
        equipment: body.equipment,
        program_template_key: templateKey,
        is_active: true,
        is_paused: false,
        progression_data: progressionData,
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data: { program, template_name: template.name } });
  } catch (err) { next(err); }
});

// GET /trainer/next-session
router.get('/next-session', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));

    const { data: program } = await supabase
      .from('ai_trainer_programs')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .single();

    if (!program) return next(new AppError('NOT_FOUND', 404, 'No active AI trainer program found'));
    if (program.is_paused) return next(new AppError('PROGRAM_PAUSED', 400, 'AI trainer program is paused'));

    const template = TEMPLATES[program.program_template_key];
    if (!template) return next(new AppError('TEMPLATE_NOT_FOUND', 500, 'Program template not found'));

    const pd = program.progression_data;
    const sessionIndex = pd.total_program_sessions_completed % template.sessions.length;
    const session = template.sessions[sessionIndex];

    // Collect all wger_ids from this session
    const wgerIds: number[] = session.exercises.map((e: any) => e.wger_id);
    const { data: exRows } = await supabase.from('exercises').select('id, name, wger_id').in('wger_id', wgerIds);
    const wgerToEx: Record<number, { id: string; name: string }> = {};
    for (const ex of exRows || []) {
      if (ex.wger_id != null) wgerToEx[ex.wger_id] = { id: ex.id, name: ex.name };
    }

    const exercises = [];
    for (const te of session.exercises) {
      const ex = wgerToEx[te.wger_id];
      if (!ex) continue;
      const state = pd.exercises[ex.id] as any;
      const prescribed_weight_kg = state?.current_weight_kg ?? null;
      exercises.push({
        exercise_id: ex.id,
        exercise_name: ex.name,
        sets: te.sets,
        reps: te.reps,
        reps_min: te.reps_min,
        reps_max: te.reps_max,
        target_duration_seconds: te.target_duration_seconds,
        prescribed_weight_kg,
        rest_seconds: te.is_lower_body ? 180 : 120,
        notes: '',
        is_lower_body: te.is_lower_body,
      });
    }

    res.json({
      data: {
        session_label: session.day_label,
        session_number: pd.total_program_sessions_completed + 1,
        exercises,
        template_name: template.name,
        is_paused: program.is_paused,
      },
    });
  } catch (err) { next(err); }
});

// GET /trainer/progress
router.get('/progress', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));

    const { data: program } = await supabase
      .from('ai_trainer_programs')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .single();

    if (!program) return next(new AppError('NOT_FOUND', 404, 'No active AI trainer program found'));

    const pd = program.progression_data;
    const exerciseIds = Object.keys(pd.exercises || {});

    const { data: exRows } = exerciseIds.length
      ? await supabase.from('exercises').select('id, name').in('id', exerciseIds)
      : { data: [] };

    const exNameMap: Record<string, string> = {};
    for (const ex of exRows || []) exNameMap[ex.id] = ex.name;

    const exercises = exerciseIds.map(id => {
      const state = pd.exercises[id] as any;
      let trend: 'trending_up' | 'stalled' | 'deloaded' = 'stalled';
      if (state.consecutive_successes > 0) trend = 'trending_up';
      else if (state.consecutive_failures >= (TEMPLATES[program.program_template_key]?.deload_after_failures ?? 2)) trend = 'deloaded';
      return {
        exercise_id: id,
        exercise_name: exNameMap[id] ?? 'Unknown',
        trend,
        current_weight_kg: state.current_weight_kg,
        sessions_logged: state.total_sessions_logged,
        consecutive_failures: state.consecutive_failures,
        consecutive_successes: state.consecutive_successes,
        last_session_date: state.last_session_date,
      };
    });

    res.json({
      data: {
        program_name: TEMPLATES[program.program_template_key]?.name ?? program.program_template_key,
        total_sessions: pd.total_program_sessions_completed,
        increment_multiplier: pd.increment_multiplier,
        exercises,
      },
    });
  } catch (err) { next(err); }
});

// POST /trainer/feedback — override learning
router.post('/feedback', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('VALIDATION_ERROR', 422, 'Validation failed'));
    const { exercise_id, override_kg, prescribed_kg } = parsed.data;

    const { data: program } = await supabase
      .from('ai_trainer_programs')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .single();

    if (!program) return next(new AppError('NOT_FOUND', 404, 'No active AI trainer program found'));

    const pd = { ...program.progression_data };
    const state = { ...(pd.exercises[exercise_id] ?? {
      current_weight_kg: override_kg,
      consecutive_successes: 0,
      consecutive_failures: 0,
      total_sessions_logged: 0,
      last_session_date: null,
      override_history: [],
    }) };

    const direction = override_kg > prescribed_kg ? 'up' : 'down';
    if (!state.override_history) state.override_history = [];
    state.override_history.push({ date: new Date().toISOString(), prescribed_kg, override_kg, direction });
    state.current_weight_kg = override_kg;

    pd.override_bias = (pd.override_bias ?? 0) + (direction === 'up' ? 1 : -1);
    pd.override_bias = Math.max(-5, Math.min(5, pd.override_bias));
    if (pd.override_bias >= 3) pd.increment_multiplier = 1.25;
    else if (pd.override_bias <= -3) pd.increment_multiplier = 0.75;
    else pd.increment_multiplier = 1.0;

    pd.exercises[exercise_id] = state;

    const { error } = await supabase
      .from('ai_trainer_programs')
      .update({ progression_data: pd })
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ data: { override_bias: pd.override_bias, increment_multiplier: pd.increment_multiplier } });
  } catch (err) { next(err); }
});

// PATCH /trainer/program — pause/resume
router.patch('/program', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const { is_paused } = req.body;
    if (typeof is_paused !== 'boolean') return next(new AppError('VALIDATION_ERROR', 422, 'is_paused must be boolean'));

    const { data: program, error } = await supabase
      .from('ai_trainer_programs')
      .update({ is_paused })
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ data: { program } });
  } catch (err) { next(err); }
});

// Progression engine — exported for workouts.ts to call
export async function runProgressionEngine(
  userId: string,
  workoutId: string,
  startedAt: string
): Promise<void> {
  try {
    const { data: program } = await supabase
      .from('ai_trainer_programs')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('is_paused', false)
      .single();

    if (!program) return;

    const template = TEMPLATES[program.program_template_key];
    if (!template) return;

    const pd = { ...program.progression_data };
    const sessionIndex = pd.total_program_sessions_completed % template.sessions.length;
    const currentSession = template.sessions[sessionIndex];

    // Get all wger_ids in this session and map to internal UUIDs
    const wgerIds: number[] = currentSession.exercises.map((e: any) => e.wger_id);
    const { data: exRows } = await supabase.from('exercises').select('id, wger_id').in('wger_id', wgerIds);
    const wgerToUuid: Record<number, string> = {};
    for (const ex of exRows || []) {
      if (ex.wger_id != null) wgerToUuid[ex.wger_id] = ex.id;
    }

    // Load completed sets from this workout
    const { data: weRows } = await supabase
      .from('workout_exercises')
      .select('id, exercise_id')
      .eq('workout_id', workoutId);

    const weIds = (weRows || []).map(r => r.id);
    const { data: setRows } = weIds.length
      ? await supabase.from('workout_sets').select('workout_exercise_id, reps, is_completed, set_type').in('workout_exercise_id', weIds)
      : { data: [] };

    // Group sets by exercise_id
    const setsByExercise: Record<string, Array<{ reps: number | null; is_completed: boolean; set_type: string }>> = {};
    for (const we of weRows || []) {
      const sets = (setRows || []).filter(s => s.workout_exercise_id === we.id && s.is_completed && s.set_type !== 'warmup');
      if (sets.length > 0) setsByExercise[we.exercise_id] = sets;
    }

    let matchedExerciseCount = 0;

    for (const templateExercise of currentSession.exercises) {
      const exerciseUuid = wgerToUuid[templateExercise.wger_id];
      if (!exerciseUuid) continue;

      const completedSets = setsByExercise[exerciseUuid] || [];
      if (completedSets.length === 0) continue;

      matchedExerciseCount++;
      const prescribedReps = templateExercise.reps ?? templateExercise.reps_min ?? 0;
      const state: any = { ...(pd.exercises[exerciseUuid] ?? {
        current_weight_kg: 0,
        consecutive_successes: 0,
        consecutive_failures: 0,
        total_sessions_logged: 0,
        last_session_date: null,
        override_history: [],
      }) };

      const allRepsHit = prescribedReps === 0 || completedSets.every(s => (s.reps ?? 0) >= prescribedReps);
      const completionRate = completedSets.length / templateExercise.sets;

      if (allRepsHit && completionRate >= 1.0) {
        state.consecutive_successes += 1;
        state.consecutive_failures = 0;
        const threshold = template.protocol === 'linear' ? 1 : 3;
        if (state.consecutive_successes >= threshold) {
          const baseIncrement = templateExercise.is_lower_body
            ? template.lower_body_increment_kg
            : template.upper_body_increment_kg;
          const effectiveIncrement = baseIncrement * (pd.increment_multiplier ?? 1.0);
          if (effectiveIncrement > 0) {
            state.current_weight_kg = Math.round(
              (state.current_weight_kg + effectiveIncrement) / 2.5
            ) * 2.5;
          }
          state.consecutive_successes = 0;
        }
      } else {
        state.consecutive_failures += 1;
        state.consecutive_successes = 0;
        if (state.consecutive_failures >= template.deload_after_failures) {
          if (template.deload_percentage < 1.0) {
            state.current_weight_kg = Math.round(
              (state.current_weight_kg * template.deload_percentage) / 2.5
            ) * 2.5;
          }
          state.consecutive_failures = 0;
        }
      }

      state.last_session_date = startedAt;
      state.total_sessions_logged += 1;
      pd.exercises[exerciseUuid] = state;
    }

    if (matchedExerciseCount > 0) {
      pd.total_program_sessions_completed += 1;
    }

    await supabase
      .from('ai_trainer_programs')
      .update({ progression_data: pd })
      .eq('user_id', userId);

  } catch (err) {
    logger.error({ err }, 'Progression engine failed');
  }
}

export default router;
