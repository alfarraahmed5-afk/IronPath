// Phase C.7 — activation milestone evaluator.
//
// Pure helper called from event-driven code paths (member-add, workout-log,
// announcement-create). It evaluates the two v1 activation milestones for a
// gym and records a row in gym_milestones the first time each one is hit.
//
// Design notes:
//   - Idempotent: re-runs on the same gym after a milestone has been
//     recorded return newly_hit=false. The (gym_id, milestone_key) UNIQUE
//     index in migration 046 is the source of truth.
//   - Best-effort: a DB error logs and returns [] rather than throwing,
//     because the callers (event handlers in member-add / workout-log
//     paths) must NOT be blocked by milestone bookkeeping. A failed
//     milestone read is strictly cosmetic — the next event will re-evaluate.
//   - Stateless: no caching. The function reads the current counts every
//     call, which is fine because it only runs on activation-relevant
//     events (not on every API request).

import { supabase } from './supabase';
import { logger } from './logger';

const MILESTONE_KEYS = ['activated', 'sticky'] as const;
type MilestoneKey = typeof MILESTONE_KEYS[number];

export interface MilestoneResult {
  hit: boolean;
  newly_hit: boolean;  // true the first time, false on every subsequent call
  milestone: MilestoneKey;
  metadata?: Record<string, unknown>;
}

/**
 * Evaluate + record activation milestones for a single gym.
 *
 * Milestones (v1):
 *   - activated: 10 active members + 1 announcement + 25 completed
 *     workouts within the gym's first 14 days. Only fires while the gym
 *     is still in (or just past) its first 14 days — older gyms cannot
 *     newly hit "activated" because the criterion is fundamentally about
 *     the launch window.
 *   - sticky: 25 active members + 50 completed workouts in the trailing
 *     7-day window. Rolling — can be hit at any age.
 *
 * Returns the set of milestones for this gym, each flagged `newly_hit`
 * if this call was the one that recorded them. Repeat calls return the
 * same milestones with `newly_hit=false`.
 */
export async function checkAndRecordMilestones(gymId: string): Promise<MilestoneResult[]> {
  try {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString();

    const [memCount, annCount, wkCount14, wkCount7, gymRow, existing] = await Promise.all([
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .eq('role', 'member')
        .eq('is_active', true)
        .is('deleted_at', null),
      supabase
        .from('gym_announcements')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', gymId),
      supabase
        .from('workouts')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .eq('is_completed', true)
        .gte('started_at', fourteenDaysAgo),
      supabase
        .from('workouts')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .eq('is_completed', true)
        .gte('started_at', sevenDaysAgo),
      supabase
        .from('gyms')
        .select('created_at')
        .eq('id', gymId)
        .single(),
      supabase
        .from('gym_milestones')
        .select('milestone_key')
        .eq('gym_id', gymId),
    ]);

    const members = memCount.count ?? 0;
    const announcements = annCount.count ?? 0;
    const workouts14 = wkCount14.count ?? 0;
    const workoutsWeek = wkCount7.count ?? 0;
    const created = gymRow.data?.created_at ? new Date(gymRow.data.created_at as string) : null;
    // Default ageDays high so a missing gym row doesn't accidentally pass
    // the "<= 14" gate.
    const ageDays = created ? (Date.now() - created.getTime()) / 86400000 : 999;
    const existingKeys = new Set((existing.data ?? []).map(r => r.milestone_key as string));

    const results: MilestoneResult[] = [];

    // --- activated ---------------------------------------------------------
    // 10 members + 1 announcement + 25 workouts in first 14 days. The
    // ageDays gate ensures a gym at day 90 with low activity can't
    // retroactively hit "activated" by happening to add members today.
    const activatedHit =
      ageDays <= 14 && members >= 10 && announcements >= 1 && workouts14 >= 25;

    if (activatedHit && !existingKeys.has('activated')) {
      const meta = { members, announcements, workouts_14d: workouts14 };
      const { error } = await supabase.from('gym_milestones').insert({
        gym_id: gymId,
        milestone_key: 'activated',
        metadata: meta,
      });
      if (!error) {
        results.push({ hit: true, newly_hit: true, milestone: 'activated', metadata: meta });
      } else {
        // A unique-violation here means a concurrent caller raced us and
        // recorded the same milestone first; that's fine, treat as already
        // recorded (newly_hit=false) so we don't double-fire the toast.
        logger.debug({ err: error, gymId, milestone: 'activated' }, 'milestone insert race (treating as already-recorded)');
        results.push({ hit: true, newly_hit: false, milestone: 'activated' });
      }
    } else if (existingKeys.has('activated')) {
      results.push({ hit: true, newly_hit: false, milestone: 'activated' });
    }

    // --- sticky ------------------------------------------------------------
    // 25 active members + 50 workouts/week (rolling). No age gate.
    const stickyHit = members >= 25 && workoutsWeek >= 50;

    if (stickyHit && !existingKeys.has('sticky')) {
      const meta = { members, workouts_week: workoutsWeek };
      const { error } = await supabase.from('gym_milestones').insert({
        gym_id: gymId,
        milestone_key: 'sticky',
        metadata: meta,
      });
      if (!error) {
        results.push({ hit: true, newly_hit: true, milestone: 'sticky', metadata: meta });
      } else {
        logger.debug({ err: error, gymId, milestone: 'sticky' }, 'milestone insert race (treating as already-recorded)');
        results.push({ hit: true, newly_hit: false, milestone: 'sticky' });
      }
    } else if (existingKeys.has('sticky')) {
      results.push({ hit: true, newly_hit: false, milestone: 'sticky' });
    }

    return results;
  } catch (err) {
    logger.error({ err, gymId }, 'activationCheck failed (non-fatal)');
    return [];
  }
}
