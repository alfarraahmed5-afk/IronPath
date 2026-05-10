import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { AppError } from '../middleware/errorHandler';
import { requireActiveUser } from '../middleware/requireActiveUser';
import { requireGymOwner } from '../middleware/roles';

/**
 * Phase C.2 — gym-owner-scoped onboarding wizard router.
 *
 * Mounted at `/api/v1/admin/onboarding` by the orchestrator. All routes here
 * are strictly gym_owner; super_admin operates via /super-admin/* and is
 * intentionally NOT routed through requireGymOwner (plan §6.1, §8.1 #3).
 *
 * Two layers of state:
 *   - `gym_onboarding_steps` (migration 038): per-step progress (composite
 *     PK gym_id + step_key). Idempotent UPSERT semantics.
 *   - `gyms.onboarding_completed_at` (migration 044): wizard-level "should I
 *     show the wizard at login?" flag. The per-step table can't answer this
 *     cleanly when the canonical step list changes over time.
 *
 * The four wizard steps are kept inline — the wider /gyms.ts checklist uses
 * a different (longer) step list for its in-app onboarding card. These two
 * lists are intentionally independent: the wizard is a one-time
 * post-signup flow, the checklist persists.
 */

const router = Router();
router.use(requireActiveUser, requireGymOwner);

const STEP_KEYS = ['brand', 'qr_poster', 'first_announcement', 'trainer_invite'] as const;
type StepKey = typeof STEP_KEYS[number];
const STEP_KEY_SET = new Set<string>(STEP_KEYS);

/**
 * Loads the current wizard state for a gym. Used by GET / and is also
 * returned from every mutation so the frontend can update local state
 * without a second roundtrip.
 */
async function loadState(gymId: string) {
  const [{ data: stepRows, error: stepsError }, { data: gymRow, error: gymError }] = await Promise.all([
    supabase
      .from('gym_onboarding_steps')
      .select('step_key, completed_at')
      .eq('gym_id', gymId),
    supabase
      .from('gyms')
      .select('onboarding_completed_at')
      .eq('id', gymId)
      .single(),
  ]);
  if (stepsError) throw stepsError;
  if (gymError) throw gymError;

  const byKey = new Map<string, string>(
    (stepRows ?? []).map(r => [r.step_key as string, r.completed_at as string])
  );
  const steps = STEP_KEYS.map(key => ({
    key,
    completed_at: byKey.get(key) ?? null,
  }));
  const complete_count = steps.filter(s => s.completed_at !== null).length;
  const completed_at = (gymRow?.onboarding_completed_at as string | null) ?? null;
  return {
    steps,
    completed_at,
    total: STEP_KEYS.length,
    complete_count,
    is_complete: completed_at !== null,
  };
}

// GET /admin/onboarding
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gym_id!;
    const state = await loadState(gymId);
    res.json({ data: state });
  } catch (err) { next(err); }
});

// POST /admin/onboarding/:stepKey/complete — idempotent UPSERT
router.post('/:stepKey/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gym_id!;
    const stepKey = req.params.stepKey;
    if (!STEP_KEY_SET.has(stepKey)) {
      return next(new AppError('VALIDATION_ERROR', 422, 'Unknown onboarding step', [
        { field: 'stepKey', message: `Must be one of: ${STEP_KEYS.join(', ')}` },
      ]));
    }
    const bodySchema = z.object({ metadata: z.record(z.any()).optional() });
    const parsed = bodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('gym_onboarding_steps')
      .upsert(
        {
          gym_id: gymId,
          step_key: stepKey as StepKey,
          completed_at: nowIso,
          completed_by: req.user!.id,
          metadata: parsed.data.metadata ?? null,
        },
        { onConflict: 'gym_id,step_key' }
      );
    if (error) throw error;
    const state = await loadState(gymId);
    res.json({ data: state });
  } catch (err) { next(err); }
});

// POST /admin/onboarding/complete — marks the wizard itself as complete.
// Idempotent: if onboarding_completed_at is already set, we do not overwrite
// (preserves the original completion timestamp).
router.post('/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gym_id!;
    const { data: gymRow, error: readErr } = await supabase
      .from('gyms')
      .select('onboarding_completed_at')
      .eq('id', gymId)
      .single();
    if (readErr) throw readErr;
    if (!gymRow?.onboarding_completed_at) {
      const { error: updateErr } = await supabase
        .from('gyms')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', gymId);
      if (updateErr) throw updateErr;
    }
    const state = await loadState(gymId);
    res.json({ data: state });
  } catch (err) { next(err); }
});

// POST /admin/onboarding/reset — debug-only. Disabled in prod unless the
// operator explicitly opts in via env. Useful for testing the wizard on
// the existing gym during dev (since migration 044 backfilled them as
// already-complete).
router.post('/reset', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (process.env.ALLOW_ONBOARDING_RESET !== '1') {
      return next(new AppError('FORBIDDEN', 403, 'Onboarding reset is disabled in this environment'));
    }
    const gymId = req.user!.gym_id!;
    const [{ error: stepsErr }, { error: gymErr }] = await Promise.all([
      supabase.from('gym_onboarding_steps').delete().eq('gym_id', gymId),
      supabase.from('gyms').update({ onboarding_completed_at: null }).eq('id', gymId),
    ]);
    if (stepsErr) throw stepsErr;
    if (gymErr) throw gymErr;
    const state = await loadState(gymId);
    res.json({ data: state });
  } catch (err) { next(err); }
});

export default router;
