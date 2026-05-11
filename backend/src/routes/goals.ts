/**
 * BE-F (mobile cinematic overhaul) -- user-goals CRUD.
 *
 * Per lens 7 P1-2 and founder Q3 lock (ship in v1, not flagged).
 * Endpoints:
 *   GET    /goals              -- list active + recently-completed
 *   POST   /goals              -- create
 *   PATCH  /goals/:id          -- update target / status
 *   DELETE /goals/:id          -- abandon (soft)
 *
 * Auth: every endpoint requires an active user. Ownership is RLS-
 * enforced at the DB layer (migration 054); we double-check at the
 * handler layer for clearer 404 / 403 responses.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { AppError } from '../middleware/errorHandler';
import { requireActiveUser } from '../middleware/requireActiveUser';

const router = Router();
router.use(requireActiveUser);

const GOAL_TYPES = ['target_weight', 'consistency', 'bodyweight'] as const;
type GoalType = (typeof GOAL_TYPES)[number];

const createSchema = z
  .object({
    goal_type: z.enum(GOAL_TYPES),
    exercise_id: z.string().uuid().optional().nullable(),
    target_value: z.number().positive().max(10000),
    target_unit: z.string().min(1).max(32),
    target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    starting_value: z.number().optional().nullable(),
    starting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.goal_type === 'target_weight' && !data.exercise_id) {
      ctx.addIssue({
        path: ['exercise_id'],
        code: z.ZodIssueCode.custom,
        message: 'exercise_id is required for target_weight goals',
      });
    }
    if (data.goal_type !== 'target_weight' && data.exercise_id) {
      ctx.addIssue({
        path: ['exercise_id'],
        code: z.ZodIssueCode.custom,
        message: 'exercise_id is only valid on target_weight goals',
      });
    }
  });

const patchSchema = z.object({
  target_value: z.number().positive().max(10000).optional(),
  target_unit: z.string().min(1).max(32).optional(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status: z.enum(['active', 'completed', 'abandoned']).optional(),
  current_value: z.number().optional(),
});

// ---------------------------------------------------------------------------
// GET /goals -- list user's goals. Active first, then most-recently completed.
// ---------------------------------------------------------------------------

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { data: goals, error } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .order('status', { ascending: true })  // active first
      .order('created_at', { ascending: false });

    if (error) return next(new AppError('DB_ERROR', 500, error.message));
    return res.json({ data: { goals: goals ?? [] } });
  } catch (err: any) {
    return next(new AppError('INTERNAL_ERROR', 500, err.message ?? 'Unexpected error'));
  }
});

// ---------------------------------------------------------------------------
// POST /goals -- create a new goal.
// ---------------------------------------------------------------------------

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const gymId = req.user!.gym_id;

    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', 422, parsed.error.errors[0]?.message ?? 'Invalid body'));
    }
    const body = parsed.data;

    // Compute starting_value if not supplied. For target_weight, use
    // the user's current PR on the exercise. For bodyweight, the most
    // recent measurement. For consistency, 0 (sessions completed so
    // far this period).
    let startingValue: number | null = body.starting_value ?? null;
    if (startingValue == null) {
      if (body.goal_type === 'target_weight' && body.exercise_id) {
        const { data: pr } = await supabase
          .from('personal_records')
          .select('value')
          .eq('user_id', userId)
          .eq('exercise_id', body.exercise_id)
          .order('value', { ascending: false })
          .limit(1)
          .maybeSingle();
        startingValue = pr?.value ?? 0;
      } else if (body.goal_type === 'bodyweight') {
        const { data: bm } = await supabase
          .from('body_measurements')
          .select('bodyweight_kg')
          .eq('user_id', userId)
          .not('bodyweight_kg', 'is', null)
          .order('measured_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        startingValue = (bm?.bodyweight_kg as number | undefined) ?? null;
      } else if (body.goal_type === 'consistency') {
        startingValue = 0;
      }
    }

    const { data: inserted, error } = await supabase
      .from('user_goals')
      .insert({
        user_id: userId,
        gym_id: gymId,
        goal_type: body.goal_type,
        exercise_id: body.exercise_id ?? null,
        target_value: body.target_value,
        target_unit: body.target_unit,
        target_date: body.target_date ?? null,
        starting_value: startingValue,
        starting_date: body.starting_date ?? new Date().toISOString().slice(0, 10),
        current_value: startingValue,
        status: 'active',
      })
      .select()
      .single();

    if (error) return next(new AppError('DB_ERROR', 500, error.message));
    return res.status(201).json({ data: { goal: inserted } });
  } catch (err: any) {
    return next(new AppError('INTERNAL_ERROR', 500, err.message ?? 'Unexpected error'));
  }
});

// ---------------------------------------------------------------------------
// PATCH /goals/:id -- update a goal.
// ---------------------------------------------------------------------------

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const goalId = req.params.id;

    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', 422, parsed.error.errors[0]?.message ?? 'Invalid body'));
    }

    // Ownership check
    const { data: existing, error: findErr } = await supabase
      .from('user_goals')
      .select('id, user_id, status')
      .eq('id', goalId)
      .maybeSingle();
    if (findErr) return next(new AppError('DB_ERROR', 500, findErr.message));
    if (!existing) return next(new AppError('NOT_FOUND', 404, 'Goal not found'));
    if (existing.user_id !== userId) return next(new AppError('FORBIDDEN', 403, 'Access denied'));

    const updates: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.status === 'completed' && existing.status !== 'completed') {
      updates.completed_at = new Date().toISOString();
    }
    if (parsed.data.status === 'abandoned' && existing.status !== 'abandoned') {
      updates.abandoned_at = new Date().toISOString();
    }

    const { data: updated, error: updErr } = await supabase
      .from('user_goals')
      .update(updates)
      .eq('id', goalId)
      .select()
      .single();

    if (updErr) return next(new AppError('DB_ERROR', 500, updErr.message));
    return res.json({ data: { goal: updated } });
  } catch (err: any) {
    return next(new AppError('INTERNAL_ERROR', 500, err.message ?? 'Unexpected error'));
  }
});

// ---------------------------------------------------------------------------
// DELETE /goals/:id -- soft delete (status -> abandoned).
// ---------------------------------------------------------------------------

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const goalId = req.params.id;

    const { data: existing, error: findErr } = await supabase
      .from('user_goals')
      .select('id, user_id, status')
      .eq('id', goalId)
      .maybeSingle();
    if (findErr) return next(new AppError('DB_ERROR', 500, findErr.message));
    if (!existing) return next(new AppError('NOT_FOUND', 404, 'Goal not found'));
    if (existing.user_id !== userId) return next(new AppError('FORBIDDEN', 403, 'Access denied'));

    const { error: updErr } = await supabase
      .from('user_goals')
      .update({ status: 'abandoned', abandoned_at: new Date().toISOString() })
      .eq('id', goalId);
    if (updErr) return next(new AppError('DB_ERROR', 500, updErr.message));
    return res.status(204).send();
  } catch (err: any) {
    return next(new AppError('INTERNAL_ERROR', 500, err.message ?? 'Unexpected error'));
  }
});

export default router;
