import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { AppError } from '../middleware/errorHandler';
import { requireActiveUser } from '../middleware/requireActiveUser';
import { requireGymOwner } from '../middleware/roles';

/**
 * Phase C.7 — gym-owner-scoped activation milestone router.
 *
 * Mounted at `/api/v1/admin/milestones` by the orchestrator. The actual
 * milestone evaluation lives in lib/activationCheck.ts and is fired from
 * member-add / workout-log / announcement-create event handlers; this
 * router is purely for the frontend to:
 *
 *   1. GET /admin/milestones — read which milestones the current gym has
 *      hit and which ones are still un-acknowledged (drives the
 *      ActivationToast celebration).
 *   2. POST /admin/milestones/:key/acknowledge — mark a milestone as
 *      seen so the toast doesn't re-fire on the next page load.
 *
 * Idempotent on both ends: re-acknowledging an already-acknowledged
 * milestone is a no-op success, and a missing milestone returns 404
 * rather than silently inserting a row (the milestone insert is owned by
 * activationCheck, not the operator).
 *
 * Per plan §6.1 / §8.1 #3, super_admin is intentionally NOT routed here
 * — they observe gyms via /super-admin/* and don't acknowledge milestones
 * on the operator's behalf.
 */

const router = Router();
router.use(requireActiveUser, requireGymOwner);

const MILESTONE_KEYS = ['activated', 'sticky'] as const;
const MILESTONE_KEY_SET = new Set<string>(MILESTONE_KEYS);

// GET /admin/milestones — list every milestone row this gym has, in hit
// order. The frontend filters for `acknowledged_at === null` to decide
// whether to render the celebration toast.
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gym_id!;
    const { data, error } = await supabase
      .from('gym_milestones')
      .select('milestone_key, hit_at, metadata, acknowledged_at')
      .eq('gym_id', gymId)
      .order('hit_at', { ascending: true });
    if (error) throw error;
    const milestones = (data ?? []).map(row => ({
      key: row.milestone_key as string,
      hit_at: row.hit_at as string,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      acknowledged_at: (row.acknowledged_at as string | null) ?? null,
    }));
    res.json({ data: { milestones } });
  } catch (err) {
    next(err);
  }
});

// POST /admin/milestones/:key/acknowledge — sets acknowledged_at = now()
// for the (gym_id, milestone_key) pair. Idempotent: if already
// acknowledged, the existing timestamp is preserved (we explicitly do not
// overwrite, so the operator's first-dismiss timestamp stays accurate
// for product analytics). Returns the updated row.
router.post('/:key/acknowledge', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gym_id!;
    const key = req.params.key;
    if (!MILESTONE_KEY_SET.has(key)) {
      return next(new AppError('VALIDATION_ERROR', 422, 'Unknown milestone key', [
        { field: 'key', message: `Must be one of: ${MILESTONE_KEYS.join(', ')}` },
      ]));
    }
    const { data: existing, error: readErr } = await supabase
      .from('gym_milestones')
      .select('milestone_key, hit_at, metadata, acknowledged_at')
      .eq('gym_id', gymId)
      .eq('milestone_key', key)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!existing) {
      return next(new AppError('NOT_FOUND', 404, 'Milestone not found for this gym'));
    }

    let row = existing;
    if (!existing.acknowledged_at) {
      const { data: updated, error: updateErr } = await supabase
        .from('gym_milestones')
        .update({ acknowledged_at: new Date().toISOString() })
        .eq('gym_id', gymId)
        .eq('milestone_key', key)
        .select('milestone_key, hit_at, metadata, acknowledged_at')
        .single();
      if (updateErr) throw updateErr;
      if (updated) row = updated;
    }

    res.json({
      data: {
        milestone: {
          key: row.milestone_key as string,
          hit_at: row.hit_at as string,
          metadata: (row.metadata as Record<string, unknown> | null) ?? null,
          acknowledged_at: (row.acknowledged_at as string | null) ?? null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
