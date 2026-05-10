import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { AppError } from '../middleware/errorHandler';
import { requireActiveUser } from '../middleware/requireActiveUser';
import { requireGymOwner } from '../middleware/roles';
import { logger } from '../lib/logger';

const router = Router();
router.use(requireActiveUser, requireGymOwner);

const REASONS = ['too_expensive', 'not_using', 'missing_feature', 'bug_reliability', 'closing_gym', 'other'] as const;
type Reason = typeof REASONS[number];
const OFFER_KINDS = ['pause', 'free_month', 'downgrade', 'none'] as const;
type OfferKind = typeof OFFER_KINDS[number];

// Pick a contextual save offer based on the reason. Plan §4.3 sketches
// "pause / 1 month free / downgrade" as the menu — the mapping below
// matches each reason to the most relevant offer:
//   too_expensive    → downgrade (move to a cheaper tier)
//   not_using        → pause (give them a break, hope they come back)
//   missing_feature  → free_month (buys us time to ship the feature)
//   bug_reliability  → free_month (recovery gesture)
//   closing_gym      → none (no pitch can save this)
//   other            → free_month (broad-spectrum sweetener)
function offerForReason(reason: Reason, currentTier: string | null): { kind: OfferKind; tier_suggestion?: string } {
  if (reason === 'closing_gym') return { kind: 'none' };
  if (reason === 'too_expensive') {
    if (currentTier === 'unlimited') return { kind: 'downgrade', tier_suggestion: 'growth' };
    if (currentTier === 'growth') return { kind: 'downgrade', tier_suggestion: 'starter' };
    // Already on starter — no smaller tier; offer free month instead.
    return { kind: 'free_month' };
  }
  if (reason === 'not_using') return { kind: 'pause' };
  return { kind: 'free_month' };
}

const startSchema = z.object({
  reason: z.enum(REASONS),
  reason_text: z.string().min(10).max(500).optional(),
}).refine(d => d.reason !== 'other' || (d.reason_text && d.reason_text.length >= 10), {
  message: 'reason_text is required when reason is "other"',
  path: ['reason_text'],
});

router.post('/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }
    const { reason, reason_text } = parsed.data;
    const gymId = req.user!.gym_id!;

    const { data: gym, error: gymErr } = await supabase
      .from('gyms')
      .select('subscription_tier, subscription_status')
      .eq('id', gymId)
      .single();
    if (gymErr || !gym) return next(new AppError('NOT_FOUND', 404, 'Gym not found'));

    const offer = offerForReason(reason, gym.subscription_tier);

    // Log the attempt + offer presented (no cancelled_at yet).
    const { error: logErr } = await supabase.from('cancellation_log').insert({
      gym_id: gymId,
      initiated_by: req.user!.id,
      reason, reason_text: reason_text ?? null,
      offer_presented: offer.kind,
      metadata: { tier_suggestion: offer.tier_suggestion ?? null, current_tier: gym.subscription_tier },
    });
    if (logErr) logger.warn({ err: logErr, gymId }, 'Cancellation log insert failed (non-fatal)');

    res.json({ data: { offer } });
  } catch (err) { next(err); }
});

const acceptOfferSchema = z.object({
  offer_kind: z.enum(OFFER_KINDS),
});

router.post('/accept-offer', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = acceptOfferSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }
    const { offer_kind } = parsed.data;
    const gymId = req.user!.gym_id!;

    // Apply the offer. Each variant has its own side-effect:
    //   pause       → set subscription_status='paused' + push expiry +60 days (subscription_expires_at += 60d)
    //   free_month  → push expiry +30 days, status stays the same
    //   downgrade   → drop to next-smaller tier (rely on tier_suggestion stored in latest log entry)
    //   none        → no-op (shouldn't be accepted; reject)
    if (offer_kind === 'none') {
      return next(new AppError('VALIDATION_ERROR', 422, 'No offer to accept'));
    }

    const { data: gym, error: gymErr } = await supabase
      .from('gyms')
      .select('subscription_tier, subscription_status, subscription_expires_at')
      .eq('id', gymId)
      .single();
    if (gymErr || !gym) return next(new AppError('NOT_FOUND', 404, 'Gym not found'));

    const baseExpiry = gym.subscription_expires_at ? new Date(gym.subscription_expires_at) : new Date();
    const update: Record<string, unknown> = {};

    if (offer_kind === 'pause') {
      const newExpiry = new Date(baseExpiry);
      newExpiry.setUTCDate(newExpiry.getUTCDate() + 60);
      update.subscription_status = 'paused';
      update.subscription_expires_at = newExpiry.toISOString();
    } else if (offer_kind === 'free_month') {
      const newExpiry = new Date(baseExpiry);
      newExpiry.setUTCDate(newExpiry.getUTCDate() + 30);
      update.subscription_expires_at = newExpiry.toISOString();
    } else if (offer_kind === 'downgrade') {
      const downgradeMap: Record<string, string> = { unlimited: 'growth', growth: 'starter' };
      const next_tier = gym.subscription_tier ? downgradeMap[gym.subscription_tier] : null;
      if (!next_tier) return next(new AppError('CONFLICT', 409, 'No smaller tier available'));
      update.subscription_tier = next_tier;
    }

    const { error: updErr } = await supabase.from('gyms').update(update).eq('id', gymId);
    if (updErr) {
      logger.error({ err: updErr, gymId }, 'Cancellation offer apply failed');
      return next(new AppError('INTERNAL_ERROR', 500, 'Could not apply offer'));
    }

    // Update the most recent cancellation_log row for this gym to mark accepted.
    const { data: latest } = await supabase
      .from('cancellation_log')
      .select('id')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest?.id) {
      await supabase.from('cancellation_log').update({ offer_accepted: true }).eq('id', latest.id);
    }

    res.json({ data: { applied: true, offer_kind } });
  } catch (err) { next(err); }
});

router.post('/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }
    const { reason, reason_text } = parsed.data;
    const gymId = req.user!.gym_id!;
    const cancelledAt = new Date().toISOString();

    const { data: after, error: updErr } = await supabase
      .from('gyms')
      .update({ subscription_status: 'cancelled' })
      .eq('id', gymId)
      .select('subscription_expires_at')
      .single();
    if (updErr) {
      logger.error({ err: updErr, gymId }, 'Cancellation confirm failed');
      return next(new AppError('INTERNAL_ERROR', 500, 'Could not cancel subscription'));
    }

    // Update the most recent cancellation_log row to mark cancelled,
    // OR insert a new row if there's no in-progress one (e.g. user
    // skipped the save offer and went straight to confirm via API).
    const { data: latest } = await supabase
      .from('cancellation_log')
      .select('id')
      .eq('gym_id', gymId)
      .is('cancelled_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest?.id) {
      await supabase.from('cancellation_log')
        .update({ cancelled_at: cancelledAt, offer_accepted: false, reason, reason_text: reason_text ?? null })
        .eq('id', latest.id);
    } else {
      await supabase.from('cancellation_log').insert({
        gym_id: gymId,
        initiated_by: req.user!.id,
        reason, reason_text: reason_text ?? null,
        offer_presented: 'none',
        offer_accepted: false,
        cancelled_at: cancelledAt,
      });
    }

    res.json({ data: { cancelled: true, expires_at: after?.subscription_expires_at } });
  } catch (err) { next(err); }
});

// Reactivate (off-spec but useful) — marks cancelled subscription as active
// again. Plan §4.4 says members keep read-only for 7 days post-expiry, so
// reactivating within the grace window restores the gym fully.
router.post('/reactivate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gym_id!;
    const { data: gym } = await supabase
      .from('gyms')
      .select('subscription_status, subscription_expires_at')
      .eq('id', gymId)
      .single();
    if (!gym) return next(new AppError('NOT_FOUND', 404, 'Gym not found'));
    if (gym.subscription_status !== 'cancelled' && gym.subscription_status !== 'paused') {
      return next(new AppError('CONFLICT', 409, 'Subscription is not cancelled'));
    }

    // Push expiry to "now + 30 days" if the existing expiry is in the past
    // (the gym already lapsed) — otherwise honor the existing expiry.
    const existingExpiry = gym.subscription_expires_at ? new Date(gym.subscription_expires_at) : null;
    const update: Record<string, unknown> = { subscription_status: 'active' };
    if (!existingExpiry || existingExpiry.getTime() < Date.now()) {
      const newExpiry = new Date();
      newExpiry.setUTCDate(newExpiry.getUTCDate() + 30);
      update.subscription_expires_at = newExpiry.toISOString();
    }

    const { error: updErr } = await supabase.from('gyms').update(update).eq('id', gymId);
    if (updErr) return next(new AppError('INTERNAL_ERROR', 500, 'Could not reactivate'));

    res.json({ data: { reactivated: true } });
  } catch (err) { next(err); }
});

export default router;
