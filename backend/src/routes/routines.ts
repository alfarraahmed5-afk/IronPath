import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { AppError } from '../middleware/errorHandler';
import { requireActiveUser } from '../middleware/requireActiveUser';
import { logger } from '../lib/logger';

// ─── Routines Router ─────────────────────────────────────────────────────────
const routinesRouter = Router();

const routineBodySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  folder_id: z.string().uuid().nullable().optional(),
});

const exerciseSetSchema = z.object({
  position: z.number().int().min(0),
  set_type: z.enum(['normal','warmup','dropset','failure']).default('normal'),
  target_weight_kg: z.number().min(0).nullable().optional(),
  target_reps: z.number().int().positive().nullable().optional(),
  target_reps_min: z.number().int().positive().nullable().optional(),
  target_reps_max: z.number().int().positive().nullable().optional(),
  target_duration_seconds: z.number().int().positive().nullable().optional(),
  target_distance_meters: z.number().min(0).nullable().optional(),
});

const routineExerciseSchema = z.object({
  exercise_id: z.string().uuid(),
  position: z.number().int().min(0),
  superset_group: z.number().int().positive().nullable().optional(),
  rest_seconds: z.number().int().positive().optional().default(90),
  notes: z.string().max(500).optional().default(''),
  sets: z.array(exerciseSetSchema),
});

const patchRoutineSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  folder_id: z.string().uuid().nullable().optional(),
  exercises: z.array(routineExerciseSchema).optional(),
});

async function getFullRoutineDetail(routineId: string) {
  const { data: routine, error } = await supabase.from('routines').select('*').eq('id', routineId).single();
  if (error || !routine) return null;

  const { data: exRows } = await supabase.from('routine_exercises')
    .select('id,position,superset_group,rest_seconds,notes,exercise_id,exercises(id,name,equipment,logging_type,image_url)')
    .eq('routine_id', routineId).order('position');

  const exerciseIds = (exRows || []).map((r: any) => r.id);
  const { data: setRows } = exerciseIds.length
    ? await supabase.from('routine_sets').select('*').in('routine_exercise_id', exerciseIds).order('position')
    : { data: [] };

  const setsByExId: Record<string, any[]> = {};
  for (const s of setRows || []) {
    if (!setsByExId[s.routine_exercise_id]) setsByExId[s.routine_exercise_id] = [];
    setsByExId[s.routine_exercise_id].push(s);
  }

  const exercises = (exRows || []).map((r: any) => ({
    id: r.id, position: r.position, superset_group: r.superset_group,
    rest_seconds: r.rest_seconds, notes: r.notes, exercise_id: r.exercise_id,
    exercise: r.exercises,
    sets: setsByExId[r.id] || [],
  }));

  return { ...routine, exercises };
}

// GET /routines
routinesRouter.get('/', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));

    const { data: folders } = await supabase.from('routine_folders')
      .select('id,name,position').eq('user_id', req.user.id).order('position');

    const { data: routines, error } = await supabase.from('routines')
      .select('id,name,description,folder_id,created_at').eq('user_id', req.user.id).order('created_at', { ascending: false });
    if (error) throw error;

    // Get exercise counts
    const routineIds = (routines || []).map((r: any) => r.id);
    let countMap: Record<string, number> = {};
    if (routineIds.length) {
      const { data: counts } = await supabase.from('routine_exercises').select('routine_id').in('routine_id', routineIds);
      for (const c of counts || []) {
        countMap[c.routine_id] = (countMap[c.routine_id] || 0) + 1;
      }
    }

    const enriched = (routines || []).map((r: any) => ({ ...r, exercise_count: countMap[r.id] || 0 }));

    const folderMap: Record<string, any[]> = {};
    const unfoldered: any[] = [];
    for (const r of enriched) {
      if (r.folder_id) {
        if (!folderMap[r.folder_id]) folderMap[r.folder_id] = [];
        folderMap[r.folder_id].push(r);
      } else {
        unfoldered.push(r);
      }
    }

    const result = (folders || []).map((f: any) => ({ ...f, routines: folderMap[f.id] || [] }));
    res.json({ data: { folders: result, unfoldered } });
  } catch (err) { next(err); }
});

// POST /routines
// POST /routines — create routine with optional inline exercises + sets.
// Body: { name, description?, folder_id?, is_public?, exercises?: [...] }
const createRoutineSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  folder_id: z.string().uuid().nullable().optional(),
  is_public: z.boolean().optional().default(false),
  exercises: z.array(routineExerciseSchema).optional().default([]),
});

routinesRouter.post('/', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const parsed = createRoutineSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('VALIDATION_ERROR', 422, 'Validation failed', parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }))));

    if (parsed.data.folder_id) {
      const { data: folder } = await supabase.from('routine_folders').select('id').eq('id', parsed.data.folder_id).eq('user_id', req.user.id).single();
      if (!folder) return next(new AppError('NOT_FOUND', 404, 'Folder not found'));
    }

    const { data: routine, error } = await supabase.from('routines').insert({
      user_id: req.user.id, gym_id: req.user.gym_id,
      name: parsed.data.name, description: parsed.data.description || null,
      folder_id: parsed.data.folder_id || null,
      is_public: parsed.data.is_public ?? false,
    }).select().single();
    if (error) throw error;

    // Insert exercises + sets if provided
    for (const ex of parsed.data.exercises) {
      const { data: reRow, error: reErr } = await supabase.from('routine_exercises').insert({
        routine_id: routine.id, exercise_id: ex.exercise_id, position: ex.position,
        superset_group: ex.superset_group ?? null, rest_seconds: ex.rest_seconds, notes: ex.notes,
      }).select().single();
      if (reErr) continue;
      if (ex.sets.length > 0) {
        await supabase.from('routine_sets').insert(ex.sets.map(s => ({
          routine_exercise_id: reRow.id,
          position: s.position, set_type: s.set_type,
          target_weight_kg: s.target_weight_kg ?? null,
          target_reps: s.target_reps ?? null,
          target_reps_min: s.target_reps_min ?? null,
          target_reps_max: s.target_reps_max ?? null,
          target_duration_seconds: s.target_duration_seconds ?? null,
          target_distance_meters: s.target_distance_meters ?? null,
        })));
      }
    }

    const detail = await getFullRoutineDetail(routine.id);
    res.status(201).json({ data: detail ?? routine });
  } catch (err) { next(err); }
});

// GET /routines/explore — public routines in the user's gym.
// Sorted by copy_count DESC, then created_at DESC. Includes owner info.
routinesRouter.get('/explore', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const limit = Math.min(parseInt(String(req.query.limit)) || 20, 50);
    const search = String(req.query.search || '').trim();
    const cursor = String(req.query.cursor || '');

    let q = supabase.from('routines')
      .select('id, user_id, name, description, copy_count, created_at')
      .eq('gym_id', req.user.gym_id!)
      .eq('is_public', true)
      .order('copy_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit + 1);
    if (search) q = q.ilike('name', `%${search}%`);
    if (cursor) q = q.lt('created_at', cursor);

    const { data: routines, error } = await q;
    if (error) throw error;

    const ownerIds = [...new Set((routines || []).map((r: any) => r.user_id))];
    const { data: owners } = ownerIds.length
      ? await supabase.from('users').select('id, username, avatar_url').in('id', ownerIds)
      : { data: [] as any[] };
    const ownerMap = new Map<string, any>();
    for (const u of owners || []) ownerMap.set(u.id, u);

    // Compute exercise count per routine (one query)
    const ids = (routines || []).map((r: any) => r.id);
    const { data: exCounts } = ids.length
      ? await supabase.from('routine_exercises').select('routine_id').in('routine_id', ids)
      : { data: [] as any[] };
    const countMap: Record<string, number> = {};
    for (const r of exCounts || []) countMap[r.routine_id] = (countMap[r.routine_id] ?? 0) + 1;

    const all = (routines || []).slice(0, limit).map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      copy_count: r.copy_count ?? 0,
      created_at: r.created_at,
      exercise_count: countMap[r.id] ?? 0,
      owner: ownerMap.get(r.user_id) ?? null,
    }));
    const next_cursor = (routines?.length ?? 0) > limit ? all[all.length - 1]?.created_at : null;

    res.json({ data: { routines: all, next_cursor } });
  } catch (err) { next(err); }
});

// POST /routines/:id/copy — copy a public routine into the user's library.
routinesRouter.post('/:id/copy', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const source = await getFullRoutineDetail(req.params.id);
    if (!source) return next(new AppError('NOT_FOUND', 404, 'Routine not found'));
    // Allow if owned OR is_public within same gym
    if (source.user_id !== req.user.id) {
      if (source.gym_id !== req.user.gym_id || !source.is_public) {
        return next(new AppError('FORBIDDEN', 403, 'This routine is not shared'));
      }
    }

    const { data: newRoutine, error: rErr } = await supabase.from('routines').insert({
      user_id: req.user.id, gym_id: req.user.gym_id, folder_id: null,
      name: source.user_id === req.user.id ? `${source.name} (Copy)` : source.name,
      description: source.description || null,
      is_public: false,
      source_routine_id: source.id,
    }).select().single();
    if (rErr) throw rErr;

    for (const ex of source.exercises || []) {
      const { data: reRow, error: reErr } = await supabase.from('routine_exercises').insert({
        routine_id: newRoutine.id, exercise_id: ex.exercise_id, position: ex.position,
        superset_group: ex.superset_group ?? null, rest_seconds: ex.rest_seconds, notes: ex.notes ?? '',
      }).select().single();
      if (reErr) continue;
      for (const s of ex.sets || []) {
        await supabase.from('routine_sets').insert({
          routine_exercise_id: reRow.id, position: s.position, set_type: s.set_type,
          target_weight_kg: s.target_weight_kg ?? null, target_reps: s.target_reps ?? null,
          target_reps_min: s.target_reps_min ?? null, target_reps_max: s.target_reps_max ?? null,
          target_duration_seconds: s.target_duration_seconds ?? null, target_distance_meters: s.target_distance_meters ?? null,
        });
      }
    }

    // Bump source copy_count (only if copying someone else's)
    if (source.user_id !== req.user.id) {
      await supabase.from('routines').update({ copy_count: (source.copy_count ?? 0) + 1 }).eq('id', source.id);
    }

    const detail = await getFullRoutineDetail(newRoutine.id);
    res.status(201).json({ data: detail });
  } catch (err) { next(err); }
});

// GET /routines/pre-built — MUST BE BEFORE /routines/:id
routinesRouter.get('/pre-built', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let q = supabase.from('pre_built_routines').select('id,name,description,category,level,goal,equipment_required,days_per_week,created_at');
    if (req.query.category) q = q.eq('category', req.query.category as string);
    if (req.query.level) q = q.eq('level', req.query.level as string);
    if (req.query.goal) q = q.eq('goal', req.query.goal as string);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ data: { pre_built_routines: data || [] } });
  } catch (err) { next(err); }
});

// POST /routines/pre-built/:id/save — MUST BE BEFORE /routines/:id
routinesRouter.post('/pre-built/:id/save', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const { data: preBuilt, error } = await supabase.from('pre_built_routines').select('*').eq('id', req.params.id).single();
    if (error || !preBuilt) return next(new AppError('NOT_FOUND', 404, 'Pre-built routine not found'));

    const { data: maxPos } = await supabase.from('routine_folders').select('position').eq('user_id', req.user.id).order('position', { ascending: false }).limit(1).single();
    const position = maxPos ? maxPos.position + 1 : 0;

    const { data: folder, error: folderErr } = await supabase.from('routine_folders').insert({
      user_id: req.user.id, gym_id: req.user.gym_id, name: preBuilt.name, position,
    }).select().single();
    if (folderErr) throw folderErr;

    const program = preBuilt.program_data as any;
    const routineIds: string[] = [];

    for (const day of (program.days || [])) {
      const { data: routine, error: rErr } = await supabase.from('routines').insert({
        user_id: req.user.id, gym_id: req.user.gym_id, folder_id: folder.id, name: day.name, description: '',
      }).select().single();
      if (rErr) { logger.warn({ rErr }, 'Failed to create routine for day'); continue; }
      routineIds.push(routine.id);

      for (let i = 0; i < (day.exercises || []).length; i++) {
        const ex = day.exercises[i];
        const { data: exRow } = await supabase.from('exercises').select('id').eq('wger_id', ex.wger_id).is('gym_id', null).limit(1).single();
        if (!exRow) { logger.warn({ wger_id: ex.wger_id }, 'Exercise not found for wger_id, skipping'); continue; }

        const { data: reRow, error: reErr } = await supabase.from('routine_exercises').insert({
          routine_id: routine.id, exercise_id: exRow.id, position: i,
          rest_seconds: ex.rest_seconds || 90, notes: ex.notes || '',
        }).select().single();
        if (reErr) continue;

        for (let j = 0; j < (ex.sets || []).length; j++) {
          const s = ex.sets[j];
          await supabase.from('routine_sets').insert({
            routine_exercise_id: reRow.id, position: j,
            set_type: s.set_type || 'normal',
            target_weight_kg: s.target_weight_kg || null,
            target_reps: s.target_reps || null,
          });
        }
      }
    }

    res.status(201).json({ data: { folder_id: folder.id, routine_ids: routineIds } });
  } catch (err) { next(err); }
});

// GET /routines/:id
routinesRouter.get('/:id', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const { data: check } = await supabase.from('routines').select('id,user_id').eq('id', req.params.id).single();
    if (!check) return next(new AppError('NOT_FOUND', 404, 'Routine not found'));
    if (check.user_id !== req.user.id) return next(new AppError('FORBIDDEN', 403, 'Access denied'));
    const detail = await getFullRoutineDetail(req.params.id);
    if (!detail) return next(new AppError('NOT_FOUND', 404, 'Routine not found'));
    res.json({ data: detail });
  } catch (err) { next(err); }
});

// PATCH /routines/:id
routinesRouter.patch('/:id', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const parsed = patchRoutineSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('VALIDATION_ERROR', 422, 'Validation failed', parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }))));

    const { data: routine } = await supabase.from('routines').select('id,user_id').eq('id', req.params.id).single();
    if (!routine) return next(new AppError('NOT_FOUND', 404, 'Routine not found'));
    if (routine.user_id !== req.user.id) return next(new AppError('FORBIDDEN', 403, 'Access denied'));

    if (parsed.data.folder_id) {
      const { data: folder } = await supabase.from('routine_folders').select('id').eq('id', parsed.data.folder_id).eq('user_id', req.user.id).single();
      if (!folder) return next(new AppError('NOT_FOUND', 404, 'Folder not found'));
    }

    // Update routine metadata
    const updates: Record<string, any> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if ('folder_id' in parsed.data) updates.folder_id = parsed.data.folder_id ?? null;
    if (Object.keys(updates).length) {
      await supabase.from('routines').update(updates).eq('id', req.params.id);
    }

    // Replace exercises atomically if provided
    if (parsed.data.exercises !== undefined) {
      await supabase.from('routine_exercises').delete().eq('routine_id', req.params.id);
      for (let i = 0; i < parsed.data.exercises.length; i++) {
        const ex = parsed.data.exercises[i];
        const { data: reRow, error: reErr } = await supabase.from('routine_exercises').insert({
          routine_id: req.params.id, exercise_id: ex.exercise_id, position: ex.position,
          superset_group: ex.superset_group || null, rest_seconds: ex.rest_seconds || 90, notes: ex.notes || '',
        }).select().single();
        if (reErr) throw reErr;
        for (let j = 0; j < ex.sets.length; j++) {
          const s = ex.sets[j];
          await supabase.from('routine_sets').insert({
            routine_exercise_id: reRow.id, position: s.position, set_type: s.set_type || 'normal',
            target_weight_kg: s.target_weight_kg ?? null, target_reps: s.target_reps ?? null,
            target_reps_min: s.target_reps_min ?? null, target_reps_max: s.target_reps_max ?? null,
            target_duration_seconds: s.target_duration_seconds ?? null, target_distance_meters: s.target_distance_meters ?? null,
          });
        }
      }
    }

    const detail = await getFullRoutineDetail(req.params.id);
    res.json({ data: detail });
  } catch (err) { next(err); }
});

// DELETE /routines/:id
routinesRouter.delete('/:id', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const { data: routine } = await supabase.from('routines').select('id,user_id').eq('id', req.params.id).single();
    if (!routine) return next(new AppError('NOT_FOUND', 404, 'Routine not found'));
    if (routine.user_id !== req.user.id) return next(new AppError('FORBIDDEN', 403, 'Access denied'));
    await supabase.from('routines').delete().eq('id', req.params.id);
    res.json({ data: { message: 'Routine deleted' } });
  } catch (err) { next(err); }
});

// POST /routines/:id/duplicate
routinesRouter.post('/:id/duplicate', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const original = await getFullRoutineDetail(req.params.id);
    if (!original) return next(new AppError('NOT_FOUND', 404, 'Routine not found'));
    if (original.user_id !== req.user.id) return next(new AppError('FORBIDDEN', 403, 'Access denied'));

    const { data: newRoutine, error: rErr } = await supabase.from('routines').insert({
      user_id: req.user.id, gym_id: req.user.gym_id, folder_id: original.folder_id || null,
      name: `${original.name} (Copy)`, description: original.description || null,
    }).select().single();
    if (rErr) throw rErr;

    for (const ex of original.exercises || []) {
      const { data: reRow, error: reErr } = await supabase.from('routine_exercises').insert({
        routine_id: newRoutine.id, exercise_id: ex.exercise_id, position: ex.position,
        superset_group: ex.superset_group || null, rest_seconds: ex.rest_seconds, notes: ex.notes || '',
      }).select().single();
      if (reErr) continue;
      for (const s of ex.sets || []) {
        await supabase.from('routine_sets').insert({
          routine_exercise_id: reRow.id, position: s.position, set_type: s.set_type,
          target_weight_kg: s.target_weight_kg ?? null, target_reps: s.target_reps ?? null,
          target_reps_min: s.target_reps_min ?? null, target_reps_max: s.target_reps_max ?? null,
          target_duration_seconds: s.target_duration_seconds ?? null, target_distance_meters: s.target_distance_meters ?? null,
        });
      }
    }

    const detail = await getFullRoutineDetail(newRoutine.id);
    res.status(201).json({ data: detail });
  } catch (err) { next(err); }
});

// ─── Routine Folders Router ───────────────────────────────────────────────────
const routineFoldersRouter = Router();

// GET /routine-folders
routineFoldersRouter.get('/', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const { data, error } = await supabase.from('routine_folders').select('*').eq('user_id', req.user.id).order('position');
    if (error) throw error;
    res.json({ data: { folders: data || [] } });
  } catch (err) { next(err); }
});

// POST /routine-folders
routineFoldersRouter.post('/', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const parsed = z.object({ name: z.string().min(1).max(255) }).safeParse(req.body);
    if (!parsed.success) return next(new AppError('VALIDATION_ERROR', 422, 'Name is required'));
    const { data: maxPos } = await supabase.from('routine_folders').select('position').eq('user_id', req.user.id).order('position', { ascending: false }).limit(1).single();
    const position = maxPos ? maxPos.position + 1 : 0;
    const { data: folder, error } = await supabase.from('routine_folders').insert({ user_id: req.user.id, gym_id: req.user.gym_id, name: parsed.data.name, position }).select().single();
    if (error) throw error;
    res.status(201).json({ data: folder });
  } catch (err) { next(err); }
});

// PATCH /routine-folders/:id
routineFoldersRouter.patch('/:id', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const { data: folder } = await supabase.from('routine_folders').select('id,user_id').eq('id', req.params.id).single();
    if (!folder || folder.user_id !== req.user.id) return next(new AppError('NOT_FOUND', 404, 'Folder not found'));
    const updates: Record<string, any> = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.position !== undefined) updates.position = req.body.position;
    const { data: updated, error } = await supabase.from('routine_folders').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ data: updated });
  } catch (err) { next(err); }
});

// DELETE /routine-folders/:id
routineFoldersRouter.delete('/:id', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const { data: folder } = await supabase.from('routine_folders').select('id,user_id').eq('id', req.params.id).single();
    if (!folder || folder.user_id !== req.user.id) return next(new AppError('NOT_FOUND', 404, 'Folder not found'));
    await supabase.from('routine_folders').delete().eq('id', req.params.id);
    res.json({ data: { message: 'Folder deleted' } });
  } catch (err) { next(err); }
});

export default routinesRouter;
export { routineFoldersRouter };
