import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { AppError } from '../middleware/errorHandler';
import { requireActiveUser } from '../middleware/requireActiveUser';
import { cacheControl } from '../middleware/cache';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const strengthStandards = require('../../data/strength-standards.js') as {
  exercises: Record<number, { name: string; male: number[]; female: number[] }>;
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const volumeComparisons = require('../../data/volume-comparisons.js') as Array<{ label: string; kg: number }>;

const WGER_IDS: number[] = Object.keys(strengthStandards.exercises).map(Number);

const router = Router();

// All analytics routes require an active authenticated user
router.use(requireActiveUser);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getVolumeComparison(kg: number): { label: string; kg: number } | null {
  if (kg < 10) return null;
  const sorted = [...volumeComparisons].sort((a, b) => b.kg - a.kg);
  return sorted.find((c) => c.kg <= kg) ?? null;
}

function getPeriodCutoff(period: string): string | null {
  const now = new Date();
  switch (period) {
    case '3m':
      now.setMonth(now.getMonth() - 3);
      return now.toISOString();
    case '1y':
      now.setFullYear(now.getFullYear() - 1);
      return now.toISOString();
    case 'all':
      return null;
    case '30d':
    default:
      now.setDate(now.getDate() - 30);
      return now.toISOString();
  }
}

function classifyStrengthLevel(
  projected1rm: number,
  bodyweightKg: number,
  sex: string | null,
  standard: { male: number[]; female: number[] }
): string | null {
  const ratios = sex === 'female' ? standard.female : standard.male;
  const levels = ['Beginner', 'Intermediate', 'Advanced', 'Elite'];
  const ratio = projected1rm / bodyweightKg;
  const idx = ratios.findIndex((r) => ratio < r);
  return idx === -1 ? 'Elite' : levels[idx];
}

// ---------------------------------------------------------------------------
// Endpoint 1: GET /analytics/stats
// ---------------------------------------------------------------------------

router.get('/stats', cacheControl(60), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const period = (req.query.period as string) || '30d';
    const validPeriods = ['30d', '3m', '1y', 'all'];
    if (!validPeriods.includes(period)) {
      return next(new AppError('VALIDATION_ERROR', 422, 'period must be one of: 30d, 3m, 1y, all'));
    }

    // --- Overview ---
    const { data: workoutsAll, error: workoutsAllErr } = await supabase
      .from('workouts')
      .select('is_completed, total_volume_kg, duration_seconds, total_sets')
      .eq('user_id', userId);

    if (workoutsAllErr) return next(new AppError('DB_ERROR', 500, workoutsAllErr.message));

    const completed = (workoutsAll ?? []).filter((w) => w.is_completed);
    const overview = {
      total_workouts: completed.length,
      total_volume_kg: completed.reduce((s, w) => s + (w.total_volume_kg ?? 0), 0),
      total_duration_seconds: completed.reduce((s, w) => s + (w.duration_seconds ?? 0), 0),
      total_sets: completed.reduce((s, w) => s + (w.total_sets ?? 0), 0),
    };

    // --- Last 7 days ---
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    const last7Days: {
      date: string;
      workout_ids: string[];
      muscles: string[];
    }[] = [];

    for (let i = 6; i >= 0; i--) {
      const day = new Date(todayUTC);
      day.setUTCDate(todayUTC.getUTCDate() - i);
      const dateStr = day.toISOString().split('T')[0];

      const dayStart = `${dateStr}T00:00:00.000Z`;
      const dayEnd = `${dateStr}T23:59:59.999Z`;

      const { data: dayWorkouts } = await supabase
        .from('workouts')
        .select('id')
        .eq('user_id', userId)
        .eq('is_completed', true)
        .gte('started_at', dayStart)
        .lte('started_at', dayEnd);

      const workoutIds = (dayWorkouts ?? []).map((w) => w.id);
      let muscles: string[] = [];

      if (workoutIds.length > 0) {
        const { data: weRows } = await supabase
          .from('workout_exercises')
          .select('exercise_id')
          .in('workout_id', workoutIds);

        const exerciseIds = [...new Set((weRows ?? []).map((r) => r.exercise_id))];

        if (exerciseIds.length > 0) {
          const { data: exRows } = await supabase
            .from('exercises')
            .select('primary_muscles')
            .in('id', exerciseIds);

          const muscleSet = new Set<string>();
          for (const ex of exRows ?? []) {
            for (const m of ex.primary_muscles ?? []) {
              muscleSet.add(m);
            }
          }
          muscles = [...muscleSet];
        }
      }

      last7Days.push({ date: dateStr, workout_ids: workoutIds, muscles });
    }

    // --- Muscle sets (period-filtered) ---
    const cutoff = getPeriodCutoff(period);

    let muscleQuery = supabase
      .from('workout_sets')
      .select(
        `
        id,
        workout_exercises!inner (
          exercise_id,
          workouts!inner (
            id,
            user_id,
            is_completed,
            started_at
          ),
          exercises!inner (
            primary_muscles
          )
        )
      `
      )
      .eq('is_completed', true)
      .neq('set_type', 'warmup')
      .eq('workout_exercises.workouts.user_id', userId)
      .eq('workout_exercises.workouts.is_completed', true);

    if (cutoff) {
      muscleQuery = muscleQuery.gte('workout_exercises.workouts.started_at', cutoff);
    }

    const { data: muscleSetRows, error: muscleSetErr } = await muscleQuery;

    const muscleCounts: Record<string, number> = {};
    if (!muscleSetErr) {
      for (const row of muscleSetRows ?? []) {
        const we = (row as any).workout_exercises;
        const primaryMuscles: string[] = we?.exercises?.primary_muscles ?? [];
        for (const m of primaryMuscles) {
          muscleCounts[m] = (muscleCounts[m] ?? 0) + 1;
        }
      }
    }

    const muscle_sets = Object.entries(muscleCounts)
      .map(([muscle, sets]) => ({ muscle, sets }))
      .sort((a, b) => b.sets - a.sets);

    // --- Top 5 exercises ---
    const { data: completedWorkoutIds } = await supabase
      .from('workouts')
      .select('id')
      .eq('user_id', userId)
      .eq('is_completed', true);

    const cWIds = (completedWorkoutIds ?? []).map((w) => w.id);
    let top_exercises: { exercise_id: string; exercise_name: string; times_logged: number }[] = [];

    if (cWIds.length > 0) {
      const { data: weAll } = await supabase
        .from('workout_exercises')
        .select('exercise_id, exercises!inner(name)')
        .in('workout_id', cWIds);

      const exCountMap: Record<string, { name: string; count: number }> = {};
      for (const row of weAll ?? []) {
        const eid = row.exercise_id;
        const name = (row as any).exercises?.name ?? '';
        if (!exCountMap[eid]) exCountMap[eid] = { name, count: 0 };
        exCountMap[eid].count++;
      }

      top_exercises = Object.entries(exCountMap)
        .map(([exercise_id, { name, count }]) => ({
          exercise_id,
          exercise_name: name,
          times_logged: count,
        }))
        .sort((a, b) => b.times_logged - a.times_logged)
        .slice(0, 5);
    }

    // --- Strength levels ---
    // Resolve WGER IDs to internal UUIDs
    const { data: exRows } = await supabase
      .from('exercises')
      .select('id, wger_id')
      .in('wger_id', WGER_IDS)
      .is('gym_id', null);

    const wgerToUuid: Record<number, string> = {};
    for (const ex of exRows ?? []) {
      wgerToUuid[ex.wger_id] = ex.id;
    }

    // Get user's bodyweight_kg and sex
    const { data: userRow } = await supabase
      .from('users')
      .select('bodyweight_kg, sex')
      .eq('id', userId)
      .single();

    const bodyweightKg: number | null = userRow?.bodyweight_kg ?? null;
    const userSex: string | null = userRow?.sex ?? null;

    // Get max projected_1rm PRs for relevant exercises
    const internalUuids = Object.values(wgerToUuid);
    let prMap: Record<string, number> = {};

    if (internalUuids.length > 0) {
      const { data: prRows } = await supabase
        .from('personal_records')
        .select('exercise_id, value')
        .eq('user_id', userId)
        .eq('record_type', 'projected_1rm')
        .in('exercise_id', internalUuids);

      for (const pr of prRows ?? []) {
        if (!prMap[pr.exercise_id] || pr.value > prMap[pr.exercise_id]) {
          prMap[pr.exercise_id] = pr.value;
        }
      }
    }

    const strength_levels = WGER_IDS.map((wgerId) => {
      const standard = strengthStandards.exercises[wgerId];
      const uuid = wgerToUuid[wgerId];
      const projected1rm = uuid ? (prMap[uuid] ?? null) : null;

      let level: string | null = null;
      if (projected1rm !== null && bodyweightKg !== null && bodyweightKg > 0) {
        level = classifyStrengthLevel(projected1rm, bodyweightKg, userSex, standard);
      }

      return {
        exercise_name: standard.name,
        wger_id: wgerId,
        projected_1rm_kg: projected1rm,
        level,
      };
    });

    // --- Current streak ---
    const { data: streakRow } = await supabase
      .from('streaks')
      .select('current_streak_weeks')
      .eq('user_id', userId)
      .maybeSingle();

    const current_streak_weeks: number = streakRow?.current_streak_weeks ?? 0;

    // --- Volume comparison (all-time) ---
    const volume_comparison = getVolumeComparison(overview.total_volume_kg);

    return res.json({
      data: {
        overview,
        last_7_days: last7Days,
        muscle_sets,
        top_exercises,
        strength_levels,
        current_streak_weeks,
        volume_comparison,
      },
    });
  } catch (err: any) {
    return next(new AppError('INTERNAL_ERROR', 500, err.message ?? 'Unexpected error'));
  }
});

// ---------------------------------------------------------------------------
// Endpoint 2: GET /analytics/exercises
// ---------------------------------------------------------------------------

router.get('/exercises', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    // Distinct exercises the user has logged
    const { data: completedWIds, error: wErr } = await supabase
      .from('workouts')
      .select('id')
      .eq('user_id', userId)
      .eq('is_completed', true);

    if (wErr) return next(new AppError('DB_ERROR', 500, wErr.message));

    const cWIds = (completedWIds ?? []).map((w) => w.id);

    if (cWIds.length === 0) {
      return res.json({ data: { exercises: [] } });
    }

    const { data: weRows, error: weErr } = await supabase
      .from('workout_exercises')
      .select(
        `
        exercise_id,
        exercises!inner (
          id,
          name,
          logging_type,
          equipment,
          primary_muscles
        )
      `
      )
      .in('workout_id', cWIds)
      .order('exercises(name)', { ascending: true });

    if (weErr) return next(new AppError('DB_ERROR', 500, weErr.message));

    // Deduplicate by exercise_id
    const seenIds = new Set<string>();
    const distinctExercises: Array<{
      exercise_id: string;
      name: string;
      logging_type: string;
      equipment: string | null;
      primary_muscles: string[];
    }> = [];

    for (const row of weRows ?? []) {
      const eid = row.exercise_id;
      if (!seenIds.has(eid)) {
        seenIds.add(eid);
        const ex = (row as any).exercises;
        distinctExercises.push({
          exercise_id: eid,
          name: ex?.name ?? '',
          logging_type: ex?.logging_type ?? 'weight_reps',
          equipment: ex?.equipment ?? null,
          primary_muscles: ex?.primary_muscles ?? [],
        });
      }
    }

    // Sort by name ascending
    distinctExercises.sort((a, b) => a.name.localeCompare(b.name));

    // Get all PRs for the user, grouped by exercise_id + record_type (MAX value)
    const exerciseIds = distinctExercises.map((e) => e.exercise_id);

    const { data: allPRs } = await supabase
      .from('personal_records')
      .select('exercise_id, record_type, value')
      .eq('user_id', userId)
      .in('exercise_id', exerciseIds);

    // Build max PR map: { [exercise_id]: { [record_type]: maxValue } }
    const prMaxMap: Record<string, Record<string, number>> = {};
    for (const pr of allPRs ?? []) {
      if (!prMaxMap[pr.exercise_id]) prMaxMap[pr.exercise_id] = {};
      const current = prMaxMap[pr.exercise_id][pr.record_type];
      if (current === undefined || pr.value > current) {
        prMaxMap[pr.exercise_id][pr.record_type] = pr.value;
      }
    }

    const exercises = distinctExercises.map((ex) => {
      const prs = prMaxMap[ex.exercise_id] ?? {};
      const bestPRs: Record<string, number | null> = {};

      if (ex.logging_type === 'weight_reps' || ex.logging_type === 'bodyweight_reps') {
        bestPRs.heaviest_weight = prs['heaviest_weight'] ?? null;
        bestPRs.projected_1rm = prs['projected_1rm'] ?? null;
      } else if (ex.logging_type === 'duration') {
        bestPRs.longest_duration = prs['longest_duration'] ?? null;
      } else if (ex.logging_type === 'distance') {
        bestPRs.longest_distance = prs['longest_distance'] ?? null;
      }

      return { ...ex, best_prs: bestPRs };
    });

    return res.json({ data: { exercises } });
  } catch (err: any) {
    return next(new AppError('INTERNAL_ERROR', 500, err.message ?? 'Unexpected error'));
  }
});

// ---------------------------------------------------------------------------
// Endpoint 3: GET /analytics/exercises/:id
// ---------------------------------------------------------------------------

router.get('/exercises/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const gymId = req.user!.gym_id;
    const exerciseId = req.params.id;

    // Verify exercise exists and user has access (global OR gym scoped)
    const { data: exercise, error: exErr } = await supabase
      .from('exercises')
      .select('id, name, logging_type, equipment, primary_muscles, secondary_muscles, description, gym_id')
      .eq('id', exerciseId)
      .maybeSingle();

    if (exErr) return next(new AppError('DB_ERROR', 500, exErr.message));
    if (!exercise) return next(new AppError('NOT_FOUND', 404, 'Exercise not found'));

    // Access check: exercise must be global (gym_id = null) or belong to the user's gym
    if (exercise.gym_id !== null && exercise.gym_id !== gymId) {
      return next(new AppError('FORBIDDEN', 403, 'Access denied to this exercise'));
    }

    // Get all PRs for this user + exercise
    const { data: personalRecords, error: prErr } = await supabase
      .from('personal_records')
      .select('*')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .order('record_type', { ascending: true })
      .order('achieved_at', { ascending: false });

    if (prErr) return next(new AppError('DB_ERROR', 500, prErr.message));

    // Get last 20 workout sessions for this exercise
    const { data: historyRows, error: histErr } = await supabase
      .from('workout_exercises')
      .select(
        `
        workout_id,
        workouts!inner (
          id,
          name,
          started_at,
          user_id,
          is_completed
        ),
        workout_sets (
          position,
          set_type,
          weight_kg,
          reps,
          duration_seconds,
          distance_meters,
          is_completed
        )
      `
      )
      .eq('exercise_id', exerciseId)
      .eq('workouts.user_id', userId)
      .eq('workouts.is_completed', true)
      .order('workouts(started_at)', { ascending: false })
      .limit(20);

    if (histErr) return next(new AppError('DB_ERROR', 500, histErr.message));

    const history = (historyRows ?? []).map((row: any) => ({
      workout_id: row.workout_id,
      workout_name: row.workouts?.name ?? null,
      started_at: row.workouts?.started_at ?? null,
      sets: (row.workout_sets ?? [])
        .filter((s: any) => s.is_completed)
        .map((s: any) => ({
          position: s.position,
          set_type: s.set_type,
          weight_kg: s.weight_kg,
          reps: s.reps,
          duration_seconds: s.duration_seconds,
          distance_meters: s.distance_meters,
          is_completed: s.is_completed,
        })),
    }));

    // Strength level (if this exercise is in strength standards)
    let strength_level: { level: string | null; projected_1rm_kg: number | null } | null = null;

    // Check if exercise has a wger_id that's in standards
    const { data: exWithWger } = await supabase
      .from('exercises')
      .select('wger_id')
      .eq('id', exerciseId)
      .maybeSingle();

    if (exWithWger?.wger_id && strengthStandards.exercises[exWithWger.wger_id]) {
      const standard = strengthStandards.exercises[exWithWger.wger_id];

      const { data: prRow } = await supabase
        .from('personal_records')
        .select('value')
        .eq('user_id', userId)
        .eq('exercise_id', exerciseId)
        .eq('record_type', 'projected_1rm')
        .order('value', { ascending: false })
        .limit(1)
        .maybeSingle();

      const projected1rm = prRow?.value ?? null;

      const { data: userForLevel } = await supabase
        .from('users')
        .select('bodyweight_kg, sex')
        .eq('id', userId)
        .single();

      const bwKg = userForLevel?.bodyweight_kg ?? null;
      const sex = userForLevel?.sex ?? null;

      let level: string | null = null;
      if (projected1rm !== null && bwKg !== null && bwKg > 0) {
        level = classifyStrengthLevel(projected1rm, bwKg, sex, standard);
      }

      strength_level = { level, projected_1rm_kg: projected1rm };
    }

    return res.json({
      data: {
        exercise: {
          id: exercise.id,
          name: exercise.name,
          logging_type: exercise.logging_type,
          equipment: exercise.equipment,
          primary_muscles: exercise.primary_muscles,
          secondary_muscles: exercise.secondary_muscles,
          description: exercise.description,
        },
        personal_records: personalRecords ?? [],
        history,
        strength_level,
      },
    });
  } catch (err: any) {
    return next(new AppError('INTERNAL_ERROR', 500, err.message ?? 'Unexpected error'));
  }
});

// ---------------------------------------------------------------------------
// Endpoint 4: GET /analytics/calendar
// ---------------------------------------------------------------------------

const calendarSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'start_date must be YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'end_date must be YYYY-MM-DD'),
});

router.get('/calendar', cacheControl(300), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const parsed = calendarSchema.safeParse(req.query);
    if (!parsed.success) {
      return next(
        new AppError('VALIDATION_ERROR', 422, parsed.error.errors[0]?.message ?? 'Invalid query params')
      );
    }

    const { start_date, end_date } = parsed.data;
    const start = new Date(start_date);
    const end = new Date(end_date);

    if (end < start) {
      return next(new AppError('VALIDATION_ERROR', 422, 'end_date must be >= start_date'));
    }

    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays > 366) {
      return next(new AppError('VALIDATION_ERROR', 422, 'Date range cannot exceed 366 days'));
    }

    const { data, error } = await supabase.rpc('get_calendar_dates', {
      p_user_id: userId,
      p_start: start_date,
      p_end: end_date,
    });

    if (error) {
      // Fallback: manual query if RPC doesn't exist
      const { data: rows, error: rowErr } = await supabase
        .from('workouts')
        .select('started_at')
        .eq('user_id', userId)
        .eq('is_completed', true)
        .gte('started_at', `${start_date}T00:00:00.000Z`)
        .lte('started_at', `${end_date}T23:59:59.999Z`);

      if (rowErr) return next(new AppError('DB_ERROR', 500, rowErr.message));

      const dateSet = new Set<string>();
      for (const row of rows ?? []) {
        const d = new Date(row.started_at).toISOString().split('T')[0];
        dateSet.add(d);
      }

      const dates = [...dateSet].sort();
      return res.json({ data: { dates } });
    }

    const dates = (data ?? []).map((r: any) => (typeof r === 'string' ? r : r.date));
    return res.json({ data: { dates } });
  } catch (err: any) {
    return next(new AppError('INTERNAL_ERROR', 500, err.message ?? 'Unexpected error'));
  }
});

// ---------------------------------------------------------------------------
// Endpoint 5: GET /analytics/measurements
// ---------------------------------------------------------------------------

router.get('/measurements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const cursor = req.query.cursor as string | undefined;

    let query = supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', userId)
      .order('measured_at', { ascending: false })
      .limit(20);

    if (cursor) {
      query = query.lt('measured_at', cursor);
    }

    const { data: measurements, error } = await query;

    if (error) return next(new AppError('DB_ERROR', 500, error.message));

    const rows = measurements ?? [];
    const next_cursor =
      rows.length === 20 ? rows[rows.length - 1].measured_at : null;

    return res.json({ data: { measurements: rows, next_cursor } });
  } catch (err: any) {
    return next(new AppError('INTERNAL_ERROR', 500, err.message ?? 'Unexpected error'));
  }
});

// ---------------------------------------------------------------------------
// Endpoint 6: GET /analytics/measurements/:id
// ---------------------------------------------------------------------------

router.get('/measurements/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const measurementId = req.params.id;

    const { data, error } = await supabase
      .from('body_measurements')
      .select(
        `
        *,
        measurement_photos (
          id,
          photo_url,
          storage_path
        )
      `
      )
      .eq('id', measurementId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return next(new AppError('DB_ERROR', 500, error.message));
    if (!data) return next(new AppError('NOT_FOUND', 404, 'Measurement not found'));

    const { measurement_photos, ...rest } = data as any;
    const photos = (measurement_photos ?? []).filter(Boolean);

    return res.json({ data: { ...rest, photos } });
  } catch (err: any) {
    return next(new AppError('INTERNAL_ERROR', 500, err.message ?? 'Unexpected error'));
  }
});

// ---------------------------------------------------------------------------
// Endpoint 7: POST /analytics/measurements
// ---------------------------------------------------------------------------

const measurementSchema = z.object({
  measured_at: z.string().datetime(),
  bodyweight_kg: z.number().positive().max(699).optional(),
  body_fat_percentage: z.number().min(0).max(100).optional(),
  neck_cm: z.number().positive().optional(),
  chest_cm: z.number().positive().optional(),
  waist_cm: z.number().positive().optional(),
  hips_cm: z.number().positive().optional(),
  left_arm_cm: z.number().positive().optional(),
  right_arm_cm: z.number().positive().optional(),
  left_forearm_cm: z.number().positive().optional(),
  right_forearm_cm: z.number().positive().optional(),
  left_thigh_cm: z.number().positive().optional(),
  right_thigh_cm: z.number().positive().optional(),
  left_calf_cm: z.number().positive().optional(),
  right_calf_cm: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
});

router.post('/measurements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const gymId = req.user!.gym_id;

    const parsed = measurementSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError('VALIDATION_ERROR', 422, parsed.error.errors[0]?.message ?? 'Invalid body')
      );
    }

    const { data: inserted, error } = await supabase
      .from('body_measurements')
      .insert({ ...parsed.data, user_id: userId, gym_id: gymId })
      .select()
      .single();

    if (error) return next(new AppError('DB_ERROR', 500, error.message));

    return res.status(201).json({ data: inserted });
  } catch (err: any) {
    return next(new AppError('INTERNAL_ERROR', 500, err.message ?? 'Unexpected error'));
  }
});

// ---------------------------------------------------------------------------
// Endpoint 8: PATCH /analytics/measurements/:id
// ---------------------------------------------------------------------------

const measurementPatchSchema = measurementSchema.partial();

router.patch('/measurements/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const measurementId = req.params.id;

    const parsed = measurementPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError('VALIDATION_ERROR', 422, parsed.error.errors[0]?.message ?? 'Invalid body')
      );
    }

    // Verify ownership
    const { data: existing, error: findErr } = await supabase
      .from('body_measurements')
      .select('id, user_id')
      .eq('id', measurementId)
      .maybeSingle();

    if (findErr) return next(new AppError('DB_ERROR', 500, findErr.message));
    if (!existing) return next(new AppError('NOT_FOUND', 404, 'Measurement not found'));
    if (existing.user_id !== userId) return next(new AppError('FORBIDDEN', 403, 'Access denied'));

    const { data: updated, error: updateErr } = await supabase
      .from('body_measurements')
      .update(parsed.data)
      .eq('id', measurementId)
      .select()
      .single();

    if (updateErr) return next(new AppError('DB_ERROR', 500, updateErr.message));

    return res.json({ data: updated });
  } catch (err: any) {
    return next(new AppError('INTERNAL_ERROR', 500, err.message ?? 'Unexpected error'));
  }
});

// ---------------------------------------------------------------------------
// Endpoint 9: DELETE /analytics/measurements/:id
// ---------------------------------------------------------------------------

router.delete('/measurements/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const measurementId = req.params.id;

    // Verify ownership
    const { data: existing, error: findErr } = await supabase
      .from('body_measurements')
      .select('id, user_id')
      .eq('id', measurementId)
      .maybeSingle();

    if (findErr) return next(new AppError('DB_ERROR', 500, findErr.message));
    if (!existing) return next(new AppError('NOT_FOUND', 404, 'Measurement not found'));
    if (existing.user_id !== userId) return next(new AppError('FORBIDDEN', 403, 'Access denied'));

    // Get photos for storage cleanup
    const { data: photos } = await supabase
      .from('measurement_photos')
      .select('storage_path')
      .eq('measurement_id', measurementId);

    // Delete measurement row (CASCADE removes measurement_photos rows)
    const { error: deleteErr } = await supabase
      .from('body_measurements')
      .delete()
      .eq('id', measurementId);

    if (deleteErr) return next(new AppError('DB_ERROR', 500, deleteErr.message));

    // Clean up storage (best-effort, do not fail request on error)
    for (const photo of photos ?? []) {
      if (photo.storage_path) {
        supabase.storage
          .from('measurement-media')
          .remove([photo.storage_path])
          .catch((err: any) => {
            console.error('Failed to delete measurement photo from storage:', photo.storage_path, err);
          });
      }
    }

    return res.status(204).send();
  } catch (err: any) {
    return next(new AppError('INTERNAL_ERROR', 500, err.message ?? 'Unexpected error'));
  }
});

// ---------------------------------------------------------------------------
// Endpoint 10: GET /analytics/reports
// ---------------------------------------------------------------------------

router.get('/reports', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const cursor = req.query.cursor as string | undefined;

    let query = supabase
      .from('monthly_reports')
      .select('id, report_type, report_period_start, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: reports, error } = await query;

    if (error) return next(new AppError('DB_ERROR', 500, error.message));

    const rows = reports ?? [];
    const next_cursor =
      rows.length === 20 ? rows[rows.length - 1].created_at : null;

    return res.json({ data: { reports: rows, next_cursor } });
  } catch (err: any) {
    return next(new AppError('INTERNAL_ERROR', 500, err.message ?? 'Unexpected error'));
  }
});

// ---------------------------------------------------------------------------
// Endpoint 11: GET /analytics/reports/:id
// ---------------------------------------------------------------------------

router.get('/reports/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const reportId = req.params.id;

    const { data, error } = await supabase
      .from('monthly_reports')
      .select('*')
      .eq('id', reportId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return next(new AppError('DB_ERROR', 500, error.message));
    if (!data) return next(new AppError('NOT_FOUND', 404, 'Report not found'));

    return res.json({ data });
  } catch (err: any) {
    return next(new AppError('INTERNAL_ERROR', 500, err.message ?? 'Unexpected error'));
  }
});

// ---------------------------------------------------------------------------
// Endpoint: GET /analytics/volume-over-time
// ?period=30d|3m|1y|all  &granularity=day|week|month
// ---------------------------------------------------------------------------

router.get('/volume-over-time', cacheControl(120), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const period = (req.query.period as string) || '30d';
    const granularity = (req.query.granularity as string) || 'week';
    const cutoff = getPeriodCutoff(period);

    let q = supabase.from('workouts')
      .select('started_at, total_volume_kg')
      .eq('user_id', userId)
      .eq('is_completed', true)
      .order('started_at', { ascending: true });
    if (cutoff) q = q.gte('started_at', cutoff);
    const { data: rows } = await q;

    const buckets = new Map<string, number>();
    for (const w of rows || []) {
      const d = new Date(w.started_at);
      let key: string;
      if (granularity === 'day') {
        key = d.toISOString().slice(0, 10);
      } else if (granularity === 'month') {
        key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
      } else {
        // week: ISO Monday
        const day = d.getUTCDay();
        const diff = (day + 6) % 7;
        const monday = new Date(d);
        monday.setUTCDate(d.getUTCDate() - diff);
        key = monday.toISOString().slice(0, 10);
      }
      buckets.set(key, (buckets.get(key) ?? 0) + Number(w.total_volume_kg ?? 0));
    }

    const points = [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, volume_kg]) => ({ date, volume_kg: Math.round(volume_kg * 10) / 10 }));

    res.json({ data: { points } });
  } catch (err: any) {
    return next(new AppError('INTERNAL_ERROR', 500, err.message ?? 'Unexpected error'));
  }
});

// ---------------------------------------------------------------------------
// Endpoint: GET /analytics/bodyweight-history?period=...
// ---------------------------------------------------------------------------

router.get('/bodyweight-history', cacheControl(60), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const period = (req.query.period as string) || '3m';
    const cutoff = getPeriodCutoff(period);

    let q = supabase.from('body_measurements')
      .select('measured_at, bodyweight_kg')
      .eq('user_id', userId)
      .not('bodyweight_kg', 'is', null)
      .order('measured_at', { ascending: true });
    if (cutoff) q = q.gte('measured_at', cutoff);
    const { data: rows } = await q;
    const points = (rows || []).map((r: any) => ({
      date: String(r.measured_at).slice(0, 10),
      bodyweight_kg: Number(r.bodyweight_kg),
    }));
    res.json({ data: { points } });
  } catch (err: any) {
    return next(new AppError('INTERNAL_ERROR', 500, err.message ?? 'Unexpected error'));
  }
});

export default router;
