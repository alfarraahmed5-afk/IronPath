import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { AppError } from '../middleware/errorHandler';
import { requireActiveUser } from '../middleware/requireActiveUser';
import { logger } from '../lib/logger';
import { checkAndAwardBadges } from '../lib/badges';
import { runProgressionEngine } from './trainer';

const router = Router();

// Helper: Get ISO week Monday (YYYY-MM-DD)
function getISOWeekMonday(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

// Helper: PR detection — bulk version
// 1. Build all candidates locally (no DB roundtrip).
// 2. Fetch ALL existing PRs for these (exercise_id, record_type) tuples in ONE query.
// 3. Filter to actual new records.
// 4. Bulk insert in ONE query.
// Returns descriptive strings like "Bench Press · 100 kg" so the celebrate
// screen can render them directly without an extra fetch.
async function detectPRs(
  workoutId: string, userId: string, gymId: string,
  exercises: Array<{ exercise_id: string; exercise_name: string; sets: Array<{ id?: string; set_type: string; weight_kg?: number|null; reps?: number|null; duration_seconds?: number|null; distance_meters?: number|null; is_completed: boolean }> }>,
  loggingTypes: Record<string, string>,
  bodyweightKg: number | null
): Promise<string[]> {
  type Candidate = {
    exercise_id: string;
    exercise_name: string;
    record_type: string;
    value: number;
    set_id: string | null;
    label: string; // for response
  };

  const candidates: Candidate[] = [];

  for (const ex of exercises) {
    const eligibleSets = ex.sets.filter(s => s.is_completed && ['normal','dropset','failure'].includes(s.set_type));
    if (!eligibleSets.length) continue;
    const lt = loggingTypes[ex.exercise_id] || 'weight_reps';

    if (lt === 'weight_reps' || lt === 'bodyweight_reps') {
      const withWeight = eligibleSets.filter(s => (s.weight_kg ?? 0) >= 0 && (s.reps ?? 0) >= 0);
      if (!withWeight.length) continue;
      const bw = bodyweightKg || 0;
      const effectiveWeight = (s: any) => lt === 'bodyweight_reps' ? (bw + (s.weight_kg || 0)) : (s.weight_kg || 0);
      const fmtKg = (n: number) => `${Math.round(n * 10) / 10} kg`;

      const maxHeavy = withWeight.reduce((b, s) => effectiveWeight(s) > effectiveWeight(b) ? s : b, withWeight[0]);
      candidates.push({ exercise_id: ex.exercise_id, exercise_name: ex.exercise_name, record_type: 'heaviest_weight', value: effectiveWeight(maxHeavy), set_id: (maxHeavy as any).id || null, label: `${ex.exercise_name} · ${fmtKg(effectiveWeight(maxHeavy))}` });

      const with1rm = withWeight.filter(s => (s.reps || 0) > 0);
      if (with1rm.length) {
        const max1rm = with1rm.reduce((b, s) => effectiveWeight(s) * (1 + (s.reps || 0) / 30) > effectiveWeight(b) * (1 + (b.reps || 0) / 30) ? s : b, with1rm[0]);
        const v = effectiveWeight(max1rm) * (1 + (max1rm.reps || 0) / 30);
        candidates.push({ exercise_id: ex.exercise_id, exercise_name: ex.exercise_name, record_type: 'projected_1rm', value: v, set_id: (max1rm as any).id || null, label: `${ex.exercise_name} · ${fmtKg(v)} 1RM` });
      }

      const maxVol = withWeight.reduce((b, s) => (effectiveWeight(s) * (s.reps || 0)) > (effectiveWeight(b) * (b.reps || 0)) ? s : b, withWeight[0]);
      candidates.push({ exercise_id: ex.exercise_id, exercise_name: ex.exercise_name, record_type: 'best_volume_set', value: effectiveWeight(maxVol) * (maxVol.reps || 0), set_id: (maxVol as any).id || null, label: `${ex.exercise_name} · ${fmtKg(effectiveWeight(maxVol))}×${maxVol.reps}` });

      const totalVol = withWeight.reduce((sum, s) => sum + effectiveWeight(s) * (s.reps || 0), 0);
      if (totalVol > 0) candidates.push({ exercise_id: ex.exercise_id, exercise_name: ex.exercise_name, record_type: 'best_volume_session', value: totalVol, set_id: null, label: `${ex.exercise_name} · ${fmtKg(totalVol)} total` });

      const maxReps = withWeight.reduce((b, s) => (s.reps || 0) > (b.reps || 0) ? s : b, withWeight[0]);
      if ((maxReps.reps || 0) > 0) candidates.push({ exercise_id: ex.exercise_id, exercise_name: ex.exercise_name, record_type: 'most_reps', value: maxReps.reps || 0, set_id: (maxReps as any).id || null, label: `${ex.exercise_name} · ${maxReps.reps} reps` });

      for (const repsTarget of [3, 5, 10]) {
        const filtered = withWeight.filter(s => (s.reps || 0) >= repsTarget);
        if (!filtered.length) continue;
        const m = filtered.reduce((b, s) => effectiveWeight(s) > effectiveWeight(b) ? s : b, filtered[0]);
        candidates.push({ exercise_id: ex.exercise_id, exercise_name: ex.exercise_name, record_type: `${repsTarget}rm`, value: effectiveWeight(m), set_id: (m as any).id || null, label: `${ex.exercise_name} · ${repsTarget}RM ${fmtKg(effectiveWeight(m))}` });
      }
    } else if (lt === 'duration') {
      const withDur = eligibleSets.filter(s => (s.duration_seconds || 0) > 0);
      if (!withDur.length) continue;
      const m = withDur.reduce((b, s) => (s.duration_seconds || 0) > (b.duration_seconds || 0) ? s : b, withDur[0]);
      const secs = m.duration_seconds || 0;
      const mins = Math.floor(secs / 60);
      const ss = secs % 60;
      candidates.push({ exercise_id: ex.exercise_id, exercise_name: ex.exercise_name, record_type: 'longest_duration', value: secs, set_id: (m as any).id || null, label: `${ex.exercise_name} · ${mins}:${String(ss).padStart(2, '0')}` });
    } else if (lt === 'distance') {
      const withDist = eligibleSets.filter(s => (s.distance_meters || 0) > 0);
      if (!withDist.length) continue;
      const total = withDist.reduce((sum, s) => sum + (s.distance_meters || 0), 0);
      candidates.push({ exercise_id: ex.exercise_id, exercise_name: ex.exercise_name, record_type: 'longest_distance', value: total, set_id: null, label: `${ex.exercise_name} · ${total} m` });
    }
  }

  if (!candidates.length) return [];

  // Fetch existing PRs in ONE query: max value per (exercise_id, record_type)
  const exerciseIds = [...new Set(candidates.map(c => c.exercise_id))];
  const recordTypes = [...new Set(candidates.map(c => c.record_type))];
  const { data: existingPRs } = await supabase.from('personal_records')
    .select('exercise_id, record_type, value')
    .eq('user_id', userId)
    .in('exercise_id', exerciseIds)
    .in('record_type', recordTypes);

  const existingMap = new Map<string, number>();
  for (const r of existingPRs || []) {
    const key = `${r.exercise_id}::${r.record_type}`;
    const cur = existingMap.get(key) ?? 0;
    if (Number(r.value) > cur) existingMap.set(key, Number(r.value));
  }

  const newPRs = candidates.filter(c => {
    const key = `${c.exercise_id}::${c.record_type}`;
    const existing = existingMap.get(key) ?? 0;
    return c.value > existing && c.value > 0;
  });

  if (!newPRs.length) return [];

  // Bulk insert
  const now = new Date().toISOString();
  await supabase.from('personal_records').insert(newPRs.map(c => ({
    user_id: userId, gym_id: gymId, exercise_id: c.exercise_id, workout_id: workoutId,
    workout_set_id: c.set_id, record_type: c.record_type, value: c.value, achieved_at: now,
  })));

  return newPRs.map(c => c.label);
}

const workoutSchema = z.object({
  idempotency_key: z.string().uuid(),
  client_upload_uuid: z.string().uuid().optional(),
  media_filenames: z.array(z.string()).optional().default([]),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional().default(''),
  visibility: z.enum(['public','followers','private']).default('public'),
  started_at: z.string().datetime(),
  duration_seconds: z.number().int().positive(),
  routine_id: z.string().uuid().nullable().optional(),
  exercises: z.array(z.object({
    exercise_id: z.string().uuid(),
    position: z.number().int().min(0),
    superset_group: z.number().int().positive().nullable().optional(),
    rest_seconds: z.number().int().positive().optional().default(90),
    notes: z.string().max(500).optional().default(''),
    sets: z.array(z.object({
      position: z.number().int().min(0),
      set_type: z.enum(['normal','warmup','dropset','failure']),
      weight_kg: z.number().min(0).nullable().optional(),
      reps: z.number().int().min(0).nullable().optional(),
      duration_seconds: z.number().int().min(0).nullable().optional(),
      distance_meters: z.number().min(0).nullable().optional(),
      rpe: z.number().min(6).max(10).nullable().optional(),
      is_completed: z.boolean(),
      completed_at: z.string().datetime().nullable().optional(),
    }))
  }))
});

// POST /workouts
router.post('/', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const parsed = workoutSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('VALIDATION_ERROR', 422, 'Validation failed', parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }))));
    const body = parsed.data;

    // Idempotency check
    const { data: existing } = await supabase.from('workouts').select('id,name,started_at,finished_at,duration_seconds,total_volume_kg,total_sets,ordinal_number,is_completed,visibility').eq('user_id', req.user.id).eq('idempotency_key', body.idempotency_key).single();
    if (existing) return res.json({ data: { workout: existing, prs_detected: [], media_failed: false } });

    // User settings + bodyweight
    const { data: settings } = await supabase.from('user_settings').select('warm_up_sets_in_stats').eq('user_id', req.user.id).single();
    const warm_up_sets_in_stats = settings?.warm_up_sets_in_stats ?? false;
    const { data: userRow } = await supabase.from('users').select('bodyweight_kg').eq('id', req.user.id).single();
    const bodyweightKg = userRow?.bodyweight_kg ?? null;

    // Get exercise logging types + names (one query for both)
    const exerciseIds = [...new Set(body.exercises.map(e => e.exercise_id))];
    const { data: exRows } = await supabase.from('exercises').select('id,name,logging_type').in('id', exerciseIds);
    const loggingTypes: Record<string, string> = {};
    const exerciseNames: Record<string, string> = {};
    for (const e of exRows || []) {
      loggingTypes[e.id] = e.logging_type;
      exerciseNames[e.id] = e.name;
    }

    // Insert workout
    const { data: workout, error: wErr } = await supabase.from('workouts').insert({
      user_id: req.user.id, gym_id: req.user.gym_id, name: body.name, description: body.description,
      visibility: body.visibility, started_at: body.started_at, duration_seconds: body.duration_seconds,
      routine_id: body.routine_id || null, idempotency_key: body.idempotency_key,
      is_completed: false, total_volume_kg: 0, total_sets: 0,
    }).select().single();
    if (wErr) throw wErr;

    // BULK insert workout_exercises (single roundtrip)
    const exRowsToInsert = body.exercises.map(ex => ({
      workout_id: workout.id, exercise_id: ex.exercise_id, position: ex.position,
      superset_group: ex.superset_group || null, rest_seconds: ex.rest_seconds || 90, notes: ex.notes || '',
    }));
    const { data: insertedExs, error: bulkExErr } = await supabase.from('workout_exercises').insert(exRowsToInsert).select('id, position');
    if (bulkExErr) throw bulkExErr;

    // Map back: position -> workout_exercise_id (positions are unique per workout)
    const posToWeId: Record<number, string> = {};
    for (const r of insertedExs || []) posToWeId[r.position] = r.id;

    // BULK insert workout_sets (single roundtrip)
    let totalVolumeKg = 0;
    let totalSets = 0;
    const setsToInsert: any[] = [];

    for (const ex of body.exercises) {
      const weId = posToWeId[ex.position];
      ex.sets.forEach((s) => {
        const is_warmup_counted = s.set_type === 'warmup' && warm_up_sets_in_stats;
        setsToInsert.push({
          workout_exercise_id: weId, position: s.position, set_type: s.set_type,
          weight_kg: s.weight_kg ?? null, reps: s.reps ?? null, duration_seconds: s.duration_seconds ?? null,
          distance_meters: s.distance_meters ?? null, rpe: s.rpe ?? null,
          is_completed: s.is_completed, is_warmup_counted, completed_at: s.completed_at ?? null,
        });

        if (s.is_completed && (s.set_type !== 'warmup' || is_warmup_counted)) {
          const lt = loggingTypes[ex.exercise_id] || 'weight_reps';
          if (lt === 'weight_reps') totalVolumeKg += (s.weight_kg || 0) * (s.reps || 0);
          else if (lt === 'bodyweight_reps') totalVolumeKg += ((bodyweightKg || 0) + (s.weight_kg || 0)) * (s.reps || 0);
        }
        if (s.is_completed && s.set_type !== 'warmup') totalSets++;
      });
    }

    const { data: insertedSets, error: bulkSetErr } = setsToInsert.length
      ? await supabase.from('workout_sets').insert(setsToInsert).select('id, workout_exercise_id, position')
      : { data: [] as any[], error: null };
    if (bulkSetErr) throw bulkSetErr;

    // Build exercisesForPR with set IDs (lookup by workout_exercise_id+position)
    const setIdLookup = new Map<string, string>();
    for (const r of insertedSets || []) setIdLookup.set(`${r.workout_exercise_id}::${r.position}`, r.id);
    const exercisesForPR = body.exercises.map(ex => ({
      exercise_id: ex.exercise_id,
      exercise_name: exerciseNames[ex.exercise_id] || 'Exercise',
      sets: ex.sets.map(s => ({ ...s, id: setIdLookup.get(`${posToWeId[ex.position]}::${s.position}`) })),
    }));

    // ordinal_number
    const { count: completedCount } = await supabase.from('workouts').select('id', { count: 'exact', head: true }).eq('user_id', req.user.id).eq('is_completed', true);
    const ordinal_number = (completedCount || 0) + 1;

    // Update workout to completed
    const { data: updatedWorkout, error: upErr } = await supabase.from('workouts').update({ is_completed: true, finished_at: new Date().toISOString(), duration_seconds: body.duration_seconds, total_volume_kg: Math.round(totalVolumeKg * 100) / 100, total_sets: totalSets, ordinal_number }).eq('id', workout.id).select().single();
    if (upErr) throw upErr;

    // Move media (post-commit)
    let media_failed = false;
    if (body.client_upload_uuid && body.media_filenames.length > 0) {
      for (const filename of body.media_filenames) {
        const oldPath = `${req.user.gym_id}/${req.user.id}/pending/${body.client_upload_uuid}/${filename}`;
        const newPath = `${req.user.gym_id}/${req.user.id}/${workout.id}/${filename}`;
        try {
          const { data: fileData, error: dlErr } = await supabase.storage.from('workout-media').download(oldPath);
          if (dlErr) throw dlErr;
          const { error: ulErr } = await supabase.storage.from('workout-media').upload(newPath, fileData, { upsert: true });
          if (ulErr) throw ulErr;
          await supabase.storage.from('workout-media').remove([oldPath]);
          const ext = filename.split('.').pop()?.toLowerCase() || '';
          const media_type = ['mp4','mov','avi'].includes(ext) ? 'video' : 'photo';
          const url = supabase.storage.from('workout-media').getPublicUrl(newPath).data.publicUrl;
          await supabase.from('workout_media').insert({ workout_id: workout.id, user_id: req.user.id, media_type, storage_path: newPath, url });
        } catch (e) {
          logger.warn({ e, filename }, 'Media move failed');
          media_failed = true;
        }
      }
    }

    // PR detection (async, non-blocking to response)
    const prIds = await detectPRs(workout.id, req.user.id, req.user.gym_id!, exercisesForPR, loggingTypes, bodyweightKg);

    // Streak update
    const workoutWeek = getISOWeekMonday(body.started_at);
    const { data: streak } = await supabase.from('streaks').select('*').eq('user_id', req.user.id).single();
    let newCurrent = 1;
    const longest = streak?.longest_streak_weeks || 0;
    if (streak?.last_workout_week) {
      const prevWeek = new Date(streak.last_workout_week);
      const currWeek = new Date(workoutWeek);
      const diffDays = (currWeek.getTime() - prevWeek.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays === 0) { newCurrent = streak.current_streak_weeks; }
      else if (diffDays === 7) { newCurrent = (streak.current_streak_weeks || 0) + 1; }
      else { newCurrent = 1; }
    }
    await supabase.from('streaks').upsert({ user_id: req.user.id, gym_id: req.user.gym_id, current_streak_weeks: newCurrent, longest_streak_weeks: Math.max(longest, newCurrent), last_workout_week: workoutWeek }, { onConflict: 'user_id' });

    // @mention notifications
    if (body.description) {
      const mentionRegex = /(?<!\w)@([a-zA-Z0-9_]{3,30})(?!\w)/g;
      const mentions = [...body.description.matchAll(mentionRegex)].map(m => m[1]);
      for (const username of [...new Set(mentions)]) {
        const { data: mentioned } = await supabase.from('users').select('id').eq('username', username).eq('gym_id', req.user.gym_id!).is('deleted_at', null).single();
        if (mentioned && mentioned.id !== req.user.id) {
          await supabase.from('notifications').insert({ user_id: mentioned.id, gym_id: req.user.gym_id, type: 'mention', title: 'You were mentioned', body: `Someone mentioned you in a workout`, data: { workout_id: workout.id, actor_user_id: req.user.id } });
        }
      }
    }

    // Progression engine + badge check (non-blocking)
    setImmediate(() => {
      runProgressionEngine(req.user!.id, workout.id, body.started_at);
      checkAndAwardBadges({
        workoutId: workout.id,
        userId: req.user!.id,
        gymId: req.user!.gym_id!,
        ordinalNumber: ordinal_number,
        startedAt: body.started_at,
      });
    });

    res.status(201).json({ data: { workout: updatedWorkout, prs_detected: prIds, media_failed } });
  } catch (err) { next(err); }
});

// GET /workouts/active/personal-records — current PRs for given exercise IDs.
// Used by the active workout screen to flag live PRs as the user logs sets.
// BEFORE /:id (Express matches in order — '/active/...' would otherwise be
// interpreted as the literal id "active").
router.get('/active/personal-records', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const ids = String(req.query.exercise_ids || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!ids.length) return res.json({ data: { records: {} } });
    const { data } = await supabase.from('personal_records')
      .select('exercise_id, record_type, value')
      .eq('user_id', req.user.id)
      .in('exercise_id', ids);
    const records: Record<string, Record<string, number>> = {};
    for (const r of data || []) {
      records[r.exercise_id] = records[r.exercise_id] || {};
      const cur = records[r.exercise_id][r.record_type] ?? 0;
      records[r.exercise_id][r.record_type] = Math.max(cur, Number(r.value));
    }
    res.json({ data: { records } });
  } catch (err) { next(err); }
});

// GET /workouts/history — BEFORE /:id
router.get('/history', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    let q = supabase.from('workouts').select('id,name,started_at,finished_at,duration_seconds,total_volume_kg,total_sets,ordinal_number,routine_id,visibility').eq('user_id', req.user.id).eq('is_completed', true).order('started_at', { ascending: false }).limit(limit + 1);
    if (cursor) q = q.lt('started_at', cursor);

    const { data, error } = await q;
    if (error) throw error;
    const workouts = data || [];
    const hasMore = workouts.length > limit;
    const result = hasMore ? workouts.slice(0, limit) : workouts;
    const next_cursor = hasMore ? result[result.length - 1].started_at : null;

    res.json({ data: { workouts: result, next_cursor } });
  } catch (err) { next(err); }
});

// GET /workouts/calendar — BEFORE /:id
router.get('/calendar', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const start = String(req.query.start || '');
    const end = String(req.query.end || '');
    if (!/^\d{4}-\d{2}-\d{2}/.test(start) || !/^\d{4}-\d{2}-\d{2}/.test(end)) {
      return next(new AppError('VALIDATION_ERROR', 422, 'Invalid start/end'));
    }
    const { data, error } = await supabase
      .from('workouts')
      .select('id,started_at')
      .eq('user_id', req.user.id)
      .eq('is_completed', true)
      .gte('started_at', start)
      .lte('started_at', end);
    if (error) throw error;
    const byDay: Record<string, string[]> = {};
    for (const w of data || []) {
      const day = (w.started_at as string).slice(0, 10);
      (byDay[day] = byDay[day] || []).push(w.id);
    }
    const days = Object.entries(byDay).map(([date, workout_ids]) => ({ date, workout_ids }));
    res.json({ data: { days } });
  } catch (err) { next(err); }
});

// GET /workouts/:id
router.get('/:id', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const { data: workout, error } = await supabase.from('workouts').select('*').eq('id', req.params.id).single();
    if (error || !workout) return next(new AppError('NOT_FOUND', 404, 'Workout not found'));
    if (workout.user_id !== req.user.id) {
      if (workout.gym_id !== req.user.gym_id || workout.visibility !== 'public') return next(new AppError('FORBIDDEN', 403, 'Access denied'));
    }

    const { data: exRows } = await supabase.from('workout_exercises').select('id,position,superset_group,rest_seconds,notes,exercise_id,exercises(id,name,equipment,logging_type,image_url)').eq('workout_id', req.params.id).order('position');
    const exIds = (exRows || []).map((r: any) => r.id);
    const { data: setRows } = exIds.length ? await supabase.from('workout_sets').select('*').in('workout_exercise_id', exIds).order('position') : { data: [] };
    const setsByEx: Record<string, any[]> = {};
    for (const s of setRows || []) { if (!setsByEx[s.workout_exercise_id]) setsByEx[s.workout_exercise_id] = []; setsByEx[s.workout_exercise_id].push(s); }

    const exercises = (exRows || []).map((r: any) => ({ id: r.id, position: r.position, superset_group: r.superset_group, rest_seconds: r.rest_seconds, notes: r.notes, exercise_id: r.exercise_id, exercise: r.exercises, sets: setsByEx[r.id] || [] }));
    const { data: media } = await supabase.from('workout_media').select('*').eq('workout_id', req.params.id).order('position');
    const { data: prs } = await supabase.from('personal_records').select('*').eq('workout_id', req.params.id);

    res.json({ data: { ...workout, exercises, media: media || [], personal_records: prs || [] } });
  } catch (err) { next(err); }
});

// PATCH /workouts/:id
router.patch('/:id', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const schema = z.object({ name: z.string().min(1).max(255).optional(), description: z.string().max(2000).optional(), visibility: z.enum(['public','followers','private']).optional(), started_at: z.string().datetime().optional(), duration_seconds: z.number().int().positive().optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('VALIDATION_ERROR', 422, 'Validation failed'));
    const { data: workout } = await supabase.from('workouts').select('id,user_id').eq('id', req.params.id).single();
    if (!workout || workout.user_id !== req.user.id) return next(new AppError('NOT_FOUND', 404, 'Workout not found'));
    if (parsed.data.started_at) {
      setImmediate(() => logger.info({ workoutId: req.params.id }, 'TODO: full streak recalculation on back-logged workout'));
    }
    const { data: updated, error } = await supabase.from('workouts').update(parsed.data).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ data: updated });
  } catch (err) { next(err); }
});

// DELETE /workouts/:id
router.delete('/:id', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const { data: workout } = await supabase.from('workouts').select('id,user_id').eq('id', req.params.id).single();
    if (!workout || workout.user_id !== req.user.id) return next(new AppError('NOT_FOUND', 404, 'Workout not found'));
    const { data: mediaRows } = await supabase.from('workout_media').select('storage_path').eq('workout_id', req.params.id);
    if (mediaRows?.length) {
      const paths = mediaRows.map((m: any) => m.storage_path);
      const { error: storErr } = await supabase.storage.from('workout-media').remove(paths);
      if (storErr) logger.warn({ storErr }, 'Storage delete failed on workout delete');
    }
    await supabase.from('workouts').delete().eq('id', req.params.id);
    res.json({ data: { message: 'Workout deleted' } });
  } catch (err) { next(err); }
});

// POST /workouts/:id/copy
router.post('/:id/copy', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const { data: original } = await supabase.from('workouts').select('*').eq('id', req.params.id).single();
    if (!original || original.user_id !== req.user.id) return next(new AppError('NOT_FOUND', 404, 'Workout not found'));

    const { data: newWorkout, error: wErr } = await supabase.from('workouts').insert({ user_id: req.user.id, gym_id: req.user.gym_id, name: original.name, description: original.description, visibility: original.visibility, started_at: new Date().toISOString(), duration_seconds: original.duration_seconds, routine_id: original.routine_id, idempotency_key: uuidv4(), is_completed: false, total_volume_kg: 0, total_sets: 0 }).select().single();
    if (wErr) throw wErr;

    const { data: exRows } = await supabase.from('workout_exercises').select('id,position,superset_group,rest_seconds,notes,exercise_id').eq('workout_id', req.params.id).order('position');
    const exIds = (exRows || []).map((r: any) => r.id);
    const { data: setRows } = exIds.length ? await supabase.from('workout_sets').select('*').in('workout_exercise_id', exIds) : { data: [] };
    const setsByEx: Record<string, any[]> = {};
    for (const s of setRows || []) { if (!setsByEx[s.workout_exercise_id]) setsByEx[s.workout_exercise_id] = []; setsByEx[s.workout_exercise_id].push(s); }

    for (const ex of exRows || []) {
      const { data: newEx } = await supabase.from('workout_exercises').insert({ workout_id: newWorkout.id, exercise_id: ex.exercise_id, position: ex.position, superset_group: ex.superset_group, rest_seconds: ex.rest_seconds, notes: ex.notes }).select().single();
      if (!newEx) continue;
      for (const s of setsByEx[ex.id] || []) {
        await supabase.from('workout_sets').insert({ workout_exercise_id: newEx.id, position: s.position, set_type: s.set_type, weight_kg: s.weight_kg, reps: s.reps, duration_seconds: s.duration_seconds, distance_meters: s.distance_meters, rpe: s.rpe, is_completed: false, is_warmup_counted: false, completed_at: null });
      }
    }

    // Return full detail
    const { data: exRowsFull } = await supabase.from('workout_exercises').select('id,position,superset_group,rest_seconds,notes,exercise_id,exercises(id,name,equipment,logging_type,image_url)').eq('workout_id', newWorkout.id).order('position');
    const exIdsFull = (exRowsFull || []).map((r: any) => r.id);
    const { data: setsFull } = exIdsFull.length ? await supabase.from('workout_sets').select('*').in('workout_exercise_id', exIdsFull).order('position') : { data: [] };
    const setsByExFull: Record<string, any[]> = {};
    for (const s of setsFull || []) { if (!setsByExFull[s.workout_exercise_id]) setsByExFull[s.workout_exercise_id] = []; setsByExFull[s.workout_exercise_id].push(s); }
    const exercisesFull = (exRowsFull || []).map((r: any) => ({ ...r, sets: setsByExFull[r.id] || [] }));

    res.status(201).json({ data: { ...newWorkout, exercises: exercisesFull, media: [], personal_records: [] } });
  } catch (err) { next(err); }
});

// POST /workouts/:id/save-as-routine
router.post('/:id/save-as-routine', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const { data: workout } = await supabase.from('workouts').select('id,user_id,name,description').eq('id', req.params.id).single();
    if (!workout || workout.user_id !== req.user.id) return next(new AppError('NOT_FOUND', 404, 'Workout not found'));

    const { data: routine, error: rErr } = await supabase.from('routines').insert({ user_id: req.user.id, gym_id: req.user.gym_id, name: workout.name, description: workout.description || '' }).select().single();
    if (rErr) throw rErr;

    const { data: exRows } = await supabase.from('workout_exercises').select('id,position,superset_group,rest_seconds,notes,exercise_id').eq('workout_id', req.params.id).order('position');
    const exIds = (exRows || []).map((r: any) => r.id);
    const { data: setRows } = exIds.length ? await supabase.from('workout_sets').select('*').in('workout_exercise_id', exIds).eq('is_completed', true) : { data: [] };
    const setsByEx: Record<string, any[]> = {};
    for (const s of setRows || []) { if (!setsByEx[s.workout_exercise_id]) setsByEx[s.workout_exercise_id] = []; setsByEx[s.workout_exercise_id].push(s); }

    for (const ex of exRows || []) {
      const { data: reRow } = await supabase.from('routine_exercises').insert({ routine_id: routine.id, exercise_id: ex.exercise_id, position: ex.position, superset_group: ex.superset_group, rest_seconds: ex.rest_seconds, notes: ex.notes }).select().single();
      if (!reRow) continue;
      for (let i = 0; i < (setsByEx[ex.id] || []).length; i++) {
        const s = setsByEx[ex.id][i];
        await supabase.from('routine_sets').insert({ routine_exercise_id: reRow.id, position: i, set_type: s.set_type, target_weight_kg: s.weight_kg, target_reps: s.reps, target_duration_seconds: s.duration_seconds, target_distance_meters: s.distance_meters });
      }
    }

    res.status(201).json({ data: { routine_id: routine.id } });
  } catch (err) { next(err); }
});

export default router;
