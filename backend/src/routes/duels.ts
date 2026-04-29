// 1v1 head-to-head challenges between two users.
// Routes:
//   POST   /duels                  — create a duel against another user
//   GET    /duels                  — list my duels (active + history)
//   GET    /duels/:id              — single duel with live values
//   POST   /duels/:id/accept       — opponent accepts
//   POST   /duels/:id/decline      — opponent declines
//   POST   /duels/:id/resolve      — anyone may force-resolve when ends_at passed
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { AppError } from '../middleware/errorHandler';
import { requireActiveUser } from '../middleware/requireActiveUser';

const router = Router();
router.use(requireActiveUser);

const createSchema = z.object({
  opponent_id: z.string().uuid(),
  exercise_id: z.string().uuid(),
  metric: z.enum(['heaviest_weight', 'most_reps', 'best_volume_set', 'projected_1rm']),
  ends_at: z.string().datetime(),
});

async function getMaxValue(userId: string, exerciseId: string, metric: string, since: string): Promise<number> {
  const { data } = await supabase.from('personal_records')
    .select('value, achieved_at')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .eq('record_type', metric)
    .gte('achieved_at', since)
    .order('value', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.value != null ? Number(data.value) : 0;
}

async function awardDuelWinnerBadge(winnerId: string, gymId: string) {
  // Check current win streak
  const { data: recentDuels } = await supabase.from('user_challenges')
    .select('winner_id, resolved_at')
    .or(`challenger_id.eq.${winnerId},opponent_id.eq.${winnerId}`)
    .eq('status', 'completed')
    .order('resolved_at', { ascending: false })
    .limit(5);
  const wins = (recentDuels || []).filter(d => d.winner_id === winnerId).length;
  if (wins >= 5) {
    await supabase.from('user_achievements').upsert({
      user_id: winnerId, gym_id: gymId,
      badge_type: 'duel_winner_streak_5',
      badge_label: '5 duel win streak',
      badge_color: '#FFD700',
      metadata: { streak: 5 },
    }, { onConflict: 'user_id,badge_type,ref_id' });
  }
}

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const gymId = req.user!.gym_id!;
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('VALIDATION_ERROR', 422, 'Validation failed'));
    const body = parsed.data;
    if (body.opponent_id === userId) return next(new AppError('VALIDATION_ERROR', 422, 'Cannot challenge yourself'));

    // Confirm opponent is in same gym
    const { data: opp } = await supabase.from('users').select('id, gym_id').eq('id', body.opponent_id).single();
    if (!opp || opp.gym_id !== gymId) return next(new AppError('NOT_FOUND', 404, 'Opponent not found'));

    const endsAt = new Date(body.ends_at).getTime();
    if (endsAt <= Date.now()) return next(new AppError('VALIDATION_ERROR', 422, 'ends_at must be future'));
    if (endsAt - Date.now() > 30 * 86400 * 1000) return next(new AppError('TOO_LONG', 422, 'Max 30 days'));

    const { data, error } = await supabase.from('user_challenges').insert({
      gym_id: gymId,
      challenger_id: userId,
      opponent_id: body.opponent_id,
      exercise_id: body.exercise_id,
      metric: body.metric,
      ends_at: body.ends_at,
      status: 'pending',
    }).select().single();
    if (error) throw error;

    // Notify opponent
    await supabase.from('notifications').insert({
      user_id: body.opponent_id, gym_id: gymId, type: 'duel_invite',
      title: 'Duel challenge received',
      data: { duel_id: data.id, actor_user_id: userId, exercise_id: body.exercise_id },
    });

    res.status(201).json({ data: { duel: data } });
  } catch (err) { next(err); }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const status = String(req.query.status || '');
    let q = supabase.from('user_challenges')
      .select('*')
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(50);
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ data: { duels: data ?? [] } });
  } catch (err) { next(err); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const gymId = req.user!.gym_id!;
    const { data: duel, error } = await supabase.from('user_challenges')
      .select('*').eq('id', req.params.id).maybeSingle();
    if (error || !duel || duel.gym_id !== gymId) return next(new AppError('NOT_FOUND', 404, 'Duel not found'));
    if (duel.challenger_id !== userId && duel.opponent_id !== userId) {
      return next(new AppError('FORBIDDEN', 403, 'Not a participant'));
    }

    // Compute live values
    const challengerValue = await getMaxValue(duel.challenger_id, duel.exercise_id, duel.metric, duel.starts_at);
    const opponentValue = await getMaxValue(duel.opponent_id, duel.exercise_id, duel.metric, duel.starts_at);

    res.json({ data: { duel: { ...duel, live_challenger_value: challengerValue, live_opponent_value: opponentValue } } });
  } catch (err) { next(err); }
});

router.post('/:id/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { data: duel } = await supabase.from('user_challenges')
      .select('*').eq('id', req.params.id).maybeSingle();
    if (!duel) return next(new AppError('NOT_FOUND', 404, 'Duel not found'));
    if (duel.opponent_id !== userId) return next(new AppError('FORBIDDEN', 403, 'Only the challenged user can accept'));
    if (duel.status !== 'pending') return next(new AppError('CONFLICT', 409, 'Duel already resolved'));
    const { error } = await supabase.from('user_challenges')
      .update({ status: 'accepted' }).eq('id', duel.id);
    if (error) throw error;
    await supabase.from('notifications').insert({
      user_id: duel.challenger_id, gym_id: duel.gym_id, type: 'duel_accepted',
      title: 'Duel accepted',
      data: { duel_id: duel.id, actor_user_id: userId },
    });
    res.json({ data: { status: 'accepted' } });
  } catch (err) { next(err); }
});

router.post('/:id/decline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { data: duel } = await supabase.from('user_challenges')
      .select('*').eq('id', req.params.id).maybeSingle();
    if (!duel) return next(new AppError('NOT_FOUND', 404, 'Duel not found'));
    if (duel.opponent_id !== userId) return next(new AppError('FORBIDDEN', 403, 'Only the challenged user can decline'));
    if (duel.status !== 'pending') return next(new AppError('CONFLICT', 409, 'Duel already resolved'));
    const { error } = await supabase.from('user_challenges')
      .update({ status: 'declined', resolved_at: new Date().toISOString() }).eq('id', duel.id);
    if (error) throw error;
    res.json({ data: { status: 'declined' } });
  } catch (err) { next(err); }
});

router.post('/:id/resolve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: duel } = await supabase.from('user_challenges')
      .select('*').eq('id', req.params.id).maybeSingle();
    if (!duel) return next(new AppError('NOT_FOUND', 404, 'Duel not found'));
    if (duel.status !== 'accepted') return next(new AppError('CONFLICT', 409, 'Duel is not active'));
    if (Date.now() < new Date(duel.ends_at).getTime()) {
      return next(new AppError('TOO_EARLY', 422, 'Duel still in progress'));
    }
    const challengerVal = await getMaxValue(duel.challenger_id, duel.exercise_id, duel.metric, duel.starts_at);
    const opponentVal = await getMaxValue(duel.opponent_id, duel.exercise_id, duel.metric, duel.starts_at);
    const winnerId = challengerVal > opponentVal ? duel.challenger_id : (opponentVal > challengerVal ? duel.opponent_id : null);

    await supabase.from('user_challenges').update({
      status: 'completed', resolved_at: new Date().toISOString(),
      challenger_value: challengerVal, opponent_value: opponentVal, winner_id: winnerId,
    }).eq('id', duel.id);

    // Update W/L counters
    if (winnerId) {
      const loserId = winnerId === duel.challenger_id ? duel.opponent_id : duel.challenger_id;
      const [{ data: winner }, { data: loser }] = await Promise.all([
        supabase.from('users').select('challenge_wins').eq('id', winnerId).single(),
        supabase.from('users').select('challenge_losses').eq('id', loserId).single(),
      ]);
      await Promise.all([
        supabase.from('users').update({ challenge_wins: (winner?.challenge_wins ?? 0) + 1 }).eq('id', winnerId),
        supabase.from('users').update({ challenge_losses: (loser?.challenge_losses ?? 0) + 1 }).eq('id', loserId),
      ]);
      await awardDuelWinnerBadge(winnerId, duel.gym_id);

      // Notify both
      await supabase.from('notifications').insert([
        { user_id: winnerId, gym_id: duel.gym_id, type: 'duel_won', title: 'You won the duel', data: { duel_id: duel.id } },
        { user_id: loserId, gym_id: duel.gym_id, type: 'duel_lost', title: 'You lost the duel', data: { duel_id: duel.id } },
      ]);
    }

    res.json({ data: { status: 'completed', winner_id: winnerId, challenger_value: challengerVal, opponent_value: opponentVal } });
  } catch (err) { next(err); }
});

export default router;
