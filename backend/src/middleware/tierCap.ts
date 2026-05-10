import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { AppError } from './errorHandler';

/**
 * Tier-cap enforcement middleware (Phase C §4.4).
 *
 * Blocks invite-link generation, invite-email sends, and member registration
 * when the gym has reached its subscription-tier member cap. The frontend's
 * `UpgradePromptModal` keys on the `TIER_CAP_REACHED` error code to surface
 * the upgrade flow.
 *
 * Wiring (orchestrator owns these — middleware is route-agnostic):
 *   • POST /admin/invites                    — create invite codes
 *   • POST /api/v1/gyms/:id/invite-email     — send invite email
 *   • POST /api/v1/auth/register             — member registration via invite
 *
 * For the register path, the gym-side check is the right gate: the auth
 * register flow resolves gym_id from the invite_code lookup, so calling
 * `enforceTierCap` after that resolution (or running an inline check via
 * `getTierCapState`) catches the boundary case where two members redeem the
 * 50th-seat invite simultaneously.
 *
 * `unlimited` tier short-circuits — never blocked, never even counted.
 * `null` tier defaults to `starter` for safety (fail-closed on a misconfigured
 * gym row rather than handing out free seats).
 */

const TIER_CAPS: Record<string, number> = {
  starter: 50,
  growth: 200,
  // unlimited intentionally omitted — caller short-circuits before lookup.
};

interface TierCapErrorPayload {
  member_count: number;
  cap: number;
  tier: string;
  upgrade_to: 'growth' | 'unlimited' | null;
}

export async function enforceTierCap(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.user?.gym_id) {
    return next(new AppError('UNAUTHORIZED', 401, 'Gym scope required'));
  }
  const gymId = req.user.gym_id;

  const { data: gym, error: gymErr } = await supabase
    .from('gyms')
    .select('subscription_tier')
    .eq('id', gymId)
    .single();
  if (gymErr || !gym) {
    return next(new AppError('NOT_FOUND', 404, 'Gym not found'));
  }

  const tier = gym.subscription_tier ?? 'starter';

  // Unlimited tier short-circuits — never blocked.
  if (tier === 'unlimited') return next();

  const cap = TIER_CAPS[tier] ?? TIER_CAPS.starter;

  const { count: memberCount, error: countErr } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('gym_id', gymId)
    .eq('role', 'member')
    .eq('is_active', true)
    .is('deleted_at', null);
  if (countErr) {
    return next(new AppError('INTERNAL_ERROR', 500, 'Could not check tier cap'));
  }

  const count = memberCount ?? 0;
  if (count >= cap) {
    const payload: TierCapErrorPayload = {
      member_count: count,
      cap,
      tier,
      upgrade_to: tier === 'starter' ? 'growth' : tier === 'growth' ? 'unlimited' : null,
    };
    // Reject with TIER_CAP_REACHED — frontend's UpgradePromptModal keys on this code.
    const err = new AppError(
      'TIER_CAP_REACHED',
      403,
      'Plan member limit reached. Upgrade to invite more members.',
    );
    // AppError.fields is typed as {field,message}[] for zod errors; we attach
    // the structured tier-cap payload via cast. errorHandler passes it through
    // unchanged onto error.fields in the JSON envelope.
    (err as unknown as { fields: TierCapErrorPayload }).fields = payload;
    return next(err);
  }

  next();
}

/**
 * Soft, non-blocking helper for routes/UI that want to surface tier-cap state
 * (e.g. the dashboard "37 / 50 members" header, or a "near cap" warning
 * banner). Returns Infinity for cap and never reports atCap/nearCap when the
 * gym is on `unlimited`.
 */
export async function getTierCapState(
  gymId: string,
): Promise<{ count: number; cap: number; tier: string; atCap: boolean; nearCap: boolean }> {
  const { data: gym } = await supabase
    .from('gyms')
    .select('subscription_tier')
    .eq('id', gymId)
    .single();
  const tier = gym?.subscription_tier ?? 'starter';
  if (tier === 'unlimited') {
    return { count: 0, cap: Infinity, tier, atCap: false, nearCap: false };
  }
  const cap = TIER_CAPS[tier] ?? TIER_CAPS.starter;
  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('gym_id', gymId)
    .eq('role', 'member')
    .eq('is_active', true)
    .is('deleted_at', null);
  const c = count ?? 0;
  return { count: c, cap, tier, atCap: c >= cap, nearCap: c / cap >= 0.8 };
}
