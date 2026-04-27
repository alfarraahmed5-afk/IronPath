import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { AppError } from '../middleware/errorHandler';
import { requireActiveUser } from '../middleware/requireActiveUser';
import { getExerciseCache } from '../lib/leaderboardCompute';

// leaderboard-exercises.js provides [wger_id, displayName][] — we need it to
// enumerate exercises for the summary lift view.
const leaderboardExercises: [number, string][] = require('../../data/leaderboard-exercises.js');

const router = Router();

router.use(requireActiveUser);

// ─── Validation schemas ───────────────────────────────────────────────────────

const uuidSchema = z.string().uuid();

const periodSchema = z.enum(['weekly', 'monthly', 'all_time']);

// ─── Helper: map client period → snapshot category ────────────────────────────

function volumeCategory(period: 'weekly' | 'monthly' | 'all_time'): string {
  const map: Record<string, string> = {
    weekly:    'most_volume_week',
    monthly:   'most_volume_month',
    all_time:  'most_volume_alltime',
  };
  return map[period];
}

function workoutsCategory(period: 'weekly' | 'monthly' | 'all_time'): string {
  const map: Record<string, string> = {
    weekly:    'most_workouts_week',
    monthly:   'most_workouts_month',
    all_time:  'most_workouts_alltime',
  };
  return map[period];
}

function periodToDbPeriod(period: 'weekly' | 'monthly' | 'all_time'): string {
  const map: Record<string, string> = {
    weekly:   'weekly',
    monthly:  'monthly',
    all_time: 'all_time',
  };
  return map[period];
}

// ─── Helper: period → date range ──────────────────────────────────────────────

function rangeForPeriod(period: 'weekly' | 'monthly' | 'all_time'): { start: string | null; end: string } {
  const now = new Date();
  const end = now.toISOString();
  if (period === 'all_time') return { start: null, end };
  const start = new Date(now);
  if (period === 'weekly') {
    const day = now.getUTCDay();
    const diff = (day + 6) % 7; // days since Monday
    start.setUTCDate(now.getUTCDate() - diff);
    start.setUTCHours(0, 0, 0, 0);
  } else if (period === 'monthly') {
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
  }
  return { start: start.toISOString(), end };
}

// Hydrate user info onto live-aggregated rows.
async function hydrateUsers(rows: { user_id: string; value: number }[]): Promise<any[]> {
  if (rows.length === 0) return [];
  const ids = [...new Set(rows.map(r => r.user_id))];
  const { data: users } = await supabase.from('users')
    .select('id, username, full_name, avatar_url')
    .in('id', ids);
  const userMap = new Map<string, any>();
  for (const u of users || []) userMap.set(u.id, u);
  return rows
    .sort((a, b) => b.value - a.value)
    .slice(0, 100)
    .map((r, i) => ({
      rank: i + 1,
      user_id: r.user_id,
      username: userMap.get(r.user_id)?.username ?? 'Unknown',
      full_name: userMap.get(r.user_id)?.full_name ?? '',
      avatar_url: userMap.get(r.user_id)?.avatar_url ?? null,
      value: r.value,
    }));
}

// Compute volume / workouts leaderboard live from the workouts table.
async function computeWorkoutAggregate(
  gymId: string,
  period: 'weekly' | 'monthly' | 'all_time',
  metric: 'volume' | 'workouts'
): Promise<any[]> {
  const { start, end } = rangeForPeriod(period);
  let q = supabase.from('workouts')
    .select('user_id, total_volume_kg')
    .eq('gym_id', gymId)
    .eq('is_completed', true);
  if (start) q = q.gte('started_at', start).lte('started_at', end);

  const { data } = await q;
  const map = new Map<string, number>();
  for (const w of data || []) {
    const cur = map.get(w.user_id) ?? 0;
    if (metric === 'volume') {
      map.set(w.user_id, cur + Number(w.total_volume_kg ?? 0));
    } else {
      map.set(w.user_id, cur + 1);
    }
  }
  const rows = [...map.entries()].map(([user_id, value]) => ({ user_id, value }));
  return hydrateUsers(rows);
}

// Compute streak leaderboard live from the streaks table.
async function computeStreakLeaderboard(gymId: string): Promise<any[]> {
  const { data } = await supabase.from('streaks')
    .select('user_id, current_streak_weeks, longest_streak_weeks')
    .eq('gym_id', gymId);
  const rows = (data || []).map(s => ({
    user_id: s.user_id,
    value: Number(s.longest_streak_weeks || s.current_streak_weeks || 0),
  })).filter(r => r.value > 0);
  return hydrateUsers(rows);
}

// Compute heaviest-lift leaderboard for a single exercise (PR-based).
async function computeLiftLeaderboard(gymId: string, exerciseId: string): Promise<any[]> {
  const { data } = await supabase.from('personal_records')
    .select('user_id, value')
    .eq('gym_id', gymId)
    .eq('exercise_id', exerciseId)
    .eq('record_type', 'heaviest_weight');
  // Take the max value per user (in case there are multiple historical PRs)
  const map = new Map<string, number>();
  for (const r of data || []) {
    const cur = map.get(r.user_id) ?? 0;
    const v = Number(r.value ?? 0);
    if (v > cur) map.set(r.user_id, v);
  }
  const rows = [...map.entries()].map(([user_id, value]) => ({ user_id, value }));
  return hydrateUsers(rows);
}

// ─── Helper: fetch snapshot + annotate my_rank, with LIVE FALLBACK ────────────

async function fetchSnapshot(params: {
  gymId: string;
  userId: string;
  category: string;
  period: string;
  exerciseId?: string;
}) {
  const { gymId, userId, category, period, exerciseId } = params;

  let query = supabase
    .from('leaderboard_snapshots')
    .select('rankings, generated_at')
    .eq('gym_id', gymId)
    .eq('category', category)
    .eq('period', period);

  if (exerciseId) {
    query = query.eq('exercise_id', exerciseId);
  } else {
    query = query.is('exercise_id', null);
  }

  const { data: snapshot } = await query.maybeSingle();
  let rankings = (snapshot?.rankings as any[]) ?? [];
  let generatedAt = snapshot?.generated_at ?? null;

  // LIVE FALLBACK: if no snapshot yet (cron hasn't run, or this is a fresh
  // gym), compute the leaderboard from the source tables. This guarantees
  // users see their data immediately even without snapshot generation.
  if (rankings.length === 0) {
    try {
      const periodKey = (period === 'weekly' || period === 'monthly' || period === 'all_time')
        ? period as 'weekly' | 'monthly' | 'all_time' : 'all_time';
      if (category === 'most_volume_week' || category === 'most_volume_month' || category === 'most_volume_alltime') {
        rankings = await computeWorkoutAggregate(gymId, periodKey, 'volume');
      } else if (category === 'most_workouts_week' || category === 'most_workouts_month' || category === 'most_workouts_alltime') {
        rankings = await computeWorkoutAggregate(gymId, periodKey, 'workouts');
      } else if (category === 'longest_streak') {
        rankings = await computeStreakLeaderboard(gymId);
      } else if (category === 'heaviest_lift' && exerciseId) {
        rankings = await computeLiftLeaderboard(gymId, exerciseId);
      }
      generatedAt = rankings.length > 0 ? new Date().toISOString() : null;
    } catch {
      // Don't blow up the response if a fallback computation fails.
    }
  }

  const myRankIdx = rankings.findIndex((r: any) => r.user_id === userId);
  const myEntry = myRankIdx >= 0 ? rankings[myRankIdx] : null;

  return {
    rankings,
    my_rank: myRankIdx >= 0 ? myRankIdx + 1 : null,
    my_value: myEntry?.value ?? null,
    generated_at: generatedAt,
  };
}

// ─── GET /leaderboards/lifts ─────────────────────────────────────────────────
// ?exercise_id=<uuid>   — full snapshot for one exercise
// (no exercise_id)      — summary: top user per exercise

router.get('/lifts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId  = req.user!.gym_id!;
    const userId = req.user!.id;

    const exerciseIdRaw = req.query.exercise_id as string | undefined;

    if (exerciseIdRaw) {
      const parsed = uuidSchema.safeParse(exerciseIdRaw);
      if (!parsed.success) throw new AppError('INVALID_EXERCISE_ID', 400, 'Invalid exercise_id');

      const result = await fetchSnapshot({
        gymId,
        userId,
        category: 'heaviest_lift',
        period:   'all_time',
        exerciseId: parsed.data,
      });

      return res.json({ data: result });
    }

    // Summary: one entry per leaderboard exercise
    const cache = getExerciseCache();
    const summaries: {
      exercise_id: string;
      exercise_name: string;
      top_user: object | null;
      generated_at: string | null;
    }[] = [];

    for (const [wgerId, displayName] of leaderboardExercises) {
      const exercise = cache.get(wgerId);
      if (!exercise) continue;

      const { data: snapshot } = await supabase
        .from('leaderboard_snapshots')
        .select('rankings, generated_at')
        .eq('gym_id', gymId)
        .eq('category', 'heaviest_lift')
        .eq('period', 'all_time')
        .eq('exercise_id', exercise.id)
        .maybeSingle();

      let rankings = (snapshot?.rankings as any[]) ?? [];
      let generatedAt = snapshot?.generated_at ?? null;
      // Live fallback when no snapshot exists yet
      if (rankings.length === 0) {
        rankings = await computeLiftLeaderboard(gymId, exercise.id);
        if (rankings.length > 0) generatedAt = new Date().toISOString();
      }
      summaries.push({
        exercise_id:   exercise.id,
        exercise_name: displayName,
        top_user:      rankings[0] ?? null,
        generated_at:  generatedAt,
      });
    }

    return res.json({ data: summaries });
  } catch (err) {
    next(err);
  }
});

// ─── GET /leaderboards/volume ─────────────────────────────────────────────────
// ?period=weekly|monthly|all_time

router.get('/volume', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId  = req.user!.gym_id!;
    const userId = req.user!.id;

    const periodParsed = periodSchema.safeParse(req.query.period);
    if (!periodParsed.success) throw new AppError('INVALID_PERIOD', 400, 'period must be weekly, monthly, or all_time');

    const period = periodParsed.data;
    const result = await fetchSnapshot({
      gymId,
      userId,
      category: volumeCategory(period),
      period:   periodToDbPeriod(period),
    });

    return res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// ─── GET /leaderboards/workouts ───────────────────────────────────────────────
// ?period=weekly|monthly|all_time

router.get('/workouts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId  = req.user!.gym_id!;
    const userId = req.user!.id;

    const periodParsed = periodSchema.safeParse(req.query.period);
    if (!periodParsed.success) throw new AppError('INVALID_PERIOD', 400, 'period must be weekly, monthly, or all_time');

    const period = periodParsed.data;
    const result = await fetchSnapshot({
      gymId,
      userId,
      category: workoutsCategory(period),
      period:   periodToDbPeriod(period),
    });

    return res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// ─── GET /leaderboards/streak ─────────────────────────────────────────────────

router.get('/streak', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId  = req.user!.gym_id!;
    const userId = req.user!.id;

    const result = await fetchSnapshot({
      gymId,
      userId,
      category: 'longest_streak',
      period:   'all_time',
    });

    return res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// ─── GET /leaderboards/challenges ────────────────────────────────────────────

router.get('/challenges', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gym_id!;

    const { data, error } = await supabase
      .from('leaderboard_challenges')
      .select('*')
      .eq('gym_id', gymId)
      .in('status', ['active', 'upcoming'])
      .order('starts_at', { ascending: true });

    if (error) throw new AppError('FETCH_FAILED', 500, 'Failed to fetch challenges');

    // The DB column is `name` but the client expects `title`.
    const challenges = (data ?? []).map((c: any) => ({ ...c, title: c.name }));
    return res.json({ data: challenges });
  } catch (err) {
    next(err);
  }
});

// ─── GET /leaderboards/challenges/:id ────────────────────────────────────────

router.get('/challenges/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId  = req.user!.gym_id!;
    const userId = req.user!.id;

    const idParsed = uuidSchema.safeParse(req.params.id);
    if (!idParsed.success) throw new AppError('INVALID_CHALLENGE_ID', 400, 'Invalid challenge id');

    const challengeId = idParsed.data;

    const { data: challenge, error } = await supabase
      .from('leaderboard_challenges')
      .select('*')
      .eq('id', challengeId)
      .maybeSingle();

    if (error || !challenge) throw new AppError('NOT_FOUND', 404, 'Challenge not found');
    if (challenge.gym_id !== gymId) throw new AppError('NOT_FOUND', 404, 'Challenge not found');

    const result = await getChallengeRankings(challenge, gymId, userId);

    // Enrollment lives on a `enrolled_user_ids` jsonb array column on
    // leaderboard_challenges (see migrations/challenge-enrollment.sql).
    const enrolledIds: string[] = Array.isArray(challenge.enrolled_user_ids) ? challenge.enrolled_user_ids : [];
    const is_enrolled = enrolledIds.includes(userId);
    const participant_count = enrolledIds.length || result.rankings.length;

    // DB column is `name`, client expects `title`
    const challengeForClient = { ...challenge, title: challenge.name };
    return res.json({ data: { challenge: challengeForClient, ...result, is_enrolled, participant_count } });
  } catch (err) {
    next(err);
  }
});

// ─── POST /leaderboards/challenges — create peer challenge ───────────────────

const createChallengeSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional().default(''),
  metric: z.enum(['total_volume', 'workout_count', 'exercise_volume']),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  exercise_id: z.string().uuid().nullable().optional(),
});

router.post('/challenges', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const gymId  = req.user!.gym_id!;

    const parsed = createChallengeSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 422, 'Validation failed');
    const body = parsed.data;

    const startsAt = new Date(body.starts_at).getTime();
    const endsAt = new Date(body.ends_at).getTime();
    if (endsAt <= startsAt) throw new AppError('INVALID_DATES', 422, 'ends_at must be after starts_at');
    if (endsAt - startsAt > 90 * 86400 * 1000) throw new AppError('TOO_LONG', 422, 'Max 90 days');

    const status = startsAt > Date.now() ? 'upcoming' : 'active';

    const { data: challenge, error } = await supabase
      .from('leaderboard_challenges')
      .insert({
        gym_id: gymId,
        // DB column is `name`, not `title` — admin route does the same mapping
        name: body.title,
        description: body.description,
        metric: body.metric,
        exercise_id: body.exercise_id ?? null,
        starts_at: body.starts_at,
        ends_at: body.ends_at,
        status,
        created_by_user_id: userId,
        enrolled_user_ids: [userId], // creator is auto-enrolled
      })
      .select()
      .single();

    if (error) throw error;
    // Map back to client shape
    const challengeForClient = { ...challenge, title: challenge.name };
    return res.status(201).json({ data: { challenge: challengeForClient } });
  } catch (err) {
    next(err);
  }
});

// ─── POST /leaderboards/challenges/:id/join ──────────────────────────────────

router.post('/challenges/:id/join', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const gymId  = req.user!.gym_id!;
    const idParsed = uuidSchema.safeParse(req.params.id);
    if (!idParsed.success) throw new AppError('INVALID_CHALLENGE_ID', 400, 'Invalid challenge id');

    const { data: challenge } = await supabase.from('leaderboard_challenges')
      .select('id, gym_id, enrolled_user_ids').eq('id', idParsed.data).maybeSingle();
    if (!challenge || challenge.gym_id !== gymId) throw new AppError('NOT_FOUND', 404, 'Challenge not found');

    const enrolled: string[] = Array.isArray(challenge.enrolled_user_ids) ? challenge.enrolled_user_ids : [];
    if (!enrolled.includes(userId)) {
      enrolled.push(userId);
      const { error } = await supabase.from('leaderboard_challenges')
        .update({ enrolled_user_ids: enrolled }).eq('id', idParsed.data);
      if (error) throw error;
    }
    return res.json({ data: { is_enrolled: true, participant_count: enrolled.length } });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /leaderboards/challenges/:id/leave ───────────────────────────────

router.delete('/challenges/:id/leave', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const gymId  = req.user!.gym_id!;
    const idParsed = uuidSchema.safeParse(req.params.id);
    if (!idParsed.success) throw new AppError('INVALID_CHALLENGE_ID', 400, 'Invalid challenge id');

    const { data: challenge } = await supabase.from('leaderboard_challenges')
      .select('id, gym_id, enrolled_user_ids').eq('id', idParsed.data).maybeSingle();
    if (!challenge || challenge.gym_id !== gymId) throw new AppError('NOT_FOUND', 404, 'Challenge not found');

    const enrolled: string[] = Array.isArray(challenge.enrolled_user_ids) ? challenge.enrolled_user_ids : [];
    const next = enrolled.filter(id => id !== userId);
    if (next.length !== enrolled.length) {
      const { error } = await supabase.from('leaderboard_challenges')
        .update({ enrolled_user_ids: next }).eq('id', idParsed.data);
      if (error) throw error;
    }
    return res.json({ data: { is_enrolled: false, participant_count: next.length } });
  } catch (err) {
    next(err);
  }
});

// ─── Challenge live rankings ──────────────────────────────────────────────────

async function getChallengeRankings(
  challenge: any,
  gymId: string,
  userId: string
): Promise<{
  rankings: object[];
  my_rank: number | null;
  my_value: number | null;
}> {
  const { starts_at, ends_at, metric, exercise_id } = challenge;
  let rows: { user_id: string; value: number }[] = [];

  if (metric === 'total_volume') {
    const { data } = await supabase
      .from('workouts')
      .select('user_id, total_volume_kg')
      .eq('gym_id', gymId)
      .eq('is_completed', true)
      .gte('started_at', starts_at)
      .lte('started_at', ends_at);

    const map = new Map<string, number>();
    for (const w of data ?? []) {
      map.set(w.user_id, (map.get(w.user_id) ?? 0) + (w.total_volume_kg ?? 0));
    }
    rows = [...map.entries()].map(([user_id, value]) => ({ user_id, value }));

  } else if (metric === 'workout_count') {
    const { data } = await supabase
      .from('workouts')
      .select('user_id')
      .eq('gym_id', gymId)
      .eq('is_completed', true)
      .gte('started_at', starts_at)
      .lte('started_at', ends_at);

    const map = new Map<string, number>();
    for (const w of data ?? []) {
      map.set(w.user_id, (map.get(w.user_id) ?? 0) + 1);
    }
    rows = [...map.entries()].map(([user_id, value]) => ({ user_id, value }));

  } else if (metric === 'exercise_volume') {
    const { data: wes } = await supabase
      .from('workout_exercises')
      .select('workout_id, id, workouts!inner(user_id, gym_id, is_completed, started_at)')
      .eq('workouts.gym_id', gymId)
      .eq('workouts.is_completed', true)
      .gte('workouts.started_at', starts_at)
      .lte('workouts.started_at', ends_at)
      .eq('exercise_id', exercise_id);

    const weIds = (wes ?? []).map((we: any) => we.id);

    if (weIds.length > 0) {
      const { data: sets } = await supabase
        .from('workout_sets')
        .select('workout_exercise_id, weight_kg, reps')
        .in('workout_exercise_id', weIds)
        .eq('is_completed', true)
        .neq('set_type', 'warmup');

      const weUserMap = new Map(
        (wes ?? []).map((we: any) => [we.id, (we as any).workouts?.user_id])
      );
      const map = new Map<string, number>();
      for (const s of sets ?? []) {
        const uid = weUserMap.get(s.workout_exercise_id);
        if (uid) {
          map.set(uid, (map.get(uid) ?? 0) + ((s.weight_kg ?? 0) * (s.reps ?? 0)));
        }
      }
      rows = [...map.entries()].map(([user_id, value]) => ({ user_id, value }));
    }

  } else if (metric === 'exercise_1rm') {
    const { data } = await supabase
      .from('personal_records')
      .select('user_id, value')
      .eq('gym_id', gymId)
      .eq('exercise_id', exercise_id)
      .eq('record_type', 'projected_1rm')
      .gte('achieved_at', starts_at)
      .lte('achieved_at', ends_at);

    const map = new Map<string, number>();
    for (const pr of data ?? []) {
      if ((pr.value ?? 0) > (map.get(pr.user_id) ?? 0)) {
        map.set(pr.user_id, pr.value);
      }
    }
    rows = [...map.entries()].map(([user_id, value]) => ({ user_id, value }));
  }

  // Sort descending by value
  rows.sort((a, b) => b.value - a.value);
  const top50 = rows.slice(0, 50);

  // Fetch display info for top 50
  const userIds = top50.map((r) => r.user_id);
  const { data: users } = await supabase
    .from('users')
    .select('id, username, full_name, avatar_url')
    .in('id', userIds);

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  const rankings = top50.map((r, i) => {
    const u = userMap.get(r.user_id);
    return {
      rank:         i + 1,
      user_id:      r.user_id,
      display_name: u?.full_name ?? u?.username ?? 'Unknown',
      avatar_url:   u?.avatar_url ?? null,
      value:        r.value,
    };
  });

  // My rank (even if outside top 50)
  const myIdx   = rows.findIndex((r) => r.user_id === userId);
  const myRank  = myIdx >= 0 ? myIdx + 1 : null;
  const myValue = myIdx >= 0 ? rows[myIdx].value : null;

  return { rankings, my_rank: myRank, my_value: myValue };
}

export default router;
