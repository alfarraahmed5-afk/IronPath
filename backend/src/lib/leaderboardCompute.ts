import { supabase } from './supabase';
import { logger } from './logger';

// Loaded from backend/data/leaderboard-exercises.js
const leaderboardExercises: [number, string][] = require('../../data/leaderboard-exercises.js');

// Cache wger_id → internal UUID resolved at module load
let exerciseCache: Map<number, { id: string; name: string }> = new Map();
let cacheResolvedAt: Date | null = null;

export async function resolveLeaderboardExercises(): Promise<void> {
  const wgerIds = leaderboardExercises.map(([id]) => id);
  const { data } = await supabase
    .from('exercises')
    .select('id, wger_id, name')
    .in('wger_id', wgerIds)
    .is('gym_id', null);
  exerciseCache = new Map(
    (data ?? []).map((e) => [e.wger_id, { id: e.id, name: e.name }])
  );
  for (const [wgerId, displayName] of leaderboardExercises) {
    if (!exerciseCache.has(wgerId)) {
      logger.warn(
        `Leaderboard exercise wger_id=${wgerId} (${displayName}) not found in exercises table`
      );
    }
  }
  cacheResolvedAt = new Date();
}

export function getExerciseCache() {
  return exerciseCache;
}

// ─── Date helpers ────────────────────────────────────────────────────────────

function getWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sun, 1 = Mon … 6 = Sat
  const diff = (day + 6) % 7;  // days since Monday
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  return monday.toISOString().slice(0, 10);
}

function getWeekEnd(): string {
  const start = new Date(getWeekStart());
  start.setUTCDate(start.getUTCDate() + 7);
  return start.toISOString().slice(0, 10);
}

function getMonthStart(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function getMonthEnd(): string {
  const now = new Date();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return nextMonth.toISOString().slice(0, 10);
}

// ─── Rankings helper ──────────────────────────────────────────────────────────

function toRankings(
  rows: {
    user_id: string;
    value: number;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  }[]
): object[] {
  return rows.map((r, i) => ({
    rank: i + 1,
    user_id: r.user_id,
    display_name: r.full_name ?? r.username,
    avatar_url: r.avatar_url,
    value: r.value,
  }));
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function computeGymLeaderboards(gymId: string): Promise<void> {
  const generatedAt = new Date().toISOString();

  // ── 1. Heaviest lift (per leaderboard exercise, all_time) ──────────────────
  for (const [, exercise] of exerciseCache) {
    const { data: rows, error } = await supabase.rpc('leaderboard_heaviest_lift', {
      p_gym_id: gymId,
      p_exercise_id: exercise.id,
    });

    // Fall back to manual query if RPC not available (the spec shows raw SQL intent)
    let liftRows: { user_id: string; value: number; username: string; full_name: string | null; avatar_url: string | null }[] = [];

    if (error || !rows) {
      // Manual join via JS: fetch PRs then user info
      const { data: prData } = await supabase
        .from('personal_records')
        .select('user_id, value')
        .eq('gym_id', gymId)
        .eq('exercise_id', exercise.id)
        .eq('record_type', 'heaviest_weight');

      if (prData && prData.length > 0) {
        // Aggregate max per user
        const userMax = new Map<string, number>();
        for (const pr of prData) {
          if ((pr.value ?? 0) > (userMax.get(pr.user_id) ?? 0)) {
            userMax.set(pr.user_id, pr.value);
          }
        }

        const userIds = [...userMax.keys()];
        const { data: users } = await supabase
          .from('users')
          .select('id, username, full_name, avatar_url')
          .in('id', userIds)
          .is('deleted_at', null);

        const userMap = new Map((users ?? []).map((u) => [u.id, u]));

        liftRows = [...userMax.entries()]
          .map(([user_id, value]) => {
            const u = userMap.get(user_id);
            return u
              ? { user_id, value, username: u.username, full_name: u.full_name ?? null, avatar_url: u.avatar_url ?? null }
              : null;
          })
          .filter((r): r is NonNullable<typeof r> => r !== null)
          .sort((a, b) => b.value - a.value)
          .slice(0, 50);
      }
    } else {
      liftRows = (rows ?? []).slice(0, 50);
    }

    const rankings = toRankings(liftRows);

    await supabase.from('leaderboard_snapshots').upsert(
      {
        gym_id: gymId,
        exercise_id: exercise.id,
        category: 'heaviest_lift',
        period: 'all_time',
        period_start: '1900-01-01',
        period_end: null,
        rankings,
        generated_at: generatedAt,
      },
      { onConflict: 'gym_id,category,period,period_start,exercise_id' }
    );
  }

  // ── 2. Most Volume ─────────────────────────────────────────────────────────
  const volumePeriods: Array<{
    category: string;
    period: string;
    start: string | null;
    end: string | null;
  }> = [
    { category: 'most_volume_week',    period: 'weekly',    start: getWeekStart(),  end: getWeekEnd() },
    { category: 'most_volume_month',   period: 'monthly',   start: getMonthStart(), end: getMonthEnd() },
    { category: 'most_volume_alltime', period: 'all_time',  start: null,            end: null },
  ];

  for (const { category, period, start, end } of volumePeriods) {
    let query = supabase
      .from('workouts')
      .select('user_id, total_volume_kg, users!inner(username, full_name, avatar_url, deleted_at)')
      .eq('gym_id', gymId)
      .eq('is_completed', true)
      .is('users.deleted_at', null);

    if (start) query = query.gte('started_at', start);
    if (end)   query = query.lt('started_at', end);

    const { data: wData } = await query;

    // Aggregate by user
    const userVolume = new Map<string, { value: number; username: string; full_name: string | null; avatar_url: string | null }>();
    for (const w of wData ?? []) {
      const u = (w as any).users;
      const prev = userVolume.get(w.user_id);
      userVolume.set(w.user_id, {
        value: (prev?.value ?? 0) + (w.total_volume_kg ?? 0),
        username: u?.username ?? '',
        full_name: u?.full_name ?? null,
        avatar_url: u?.avatar_url ?? null,
      });
    }

    const volumeRows = [...userVolume.entries()]
      .map(([user_id, v]) => ({ user_id, ...v }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 50);

    const rankings = toRankings(volumeRows);

    await supabase.from('leaderboard_snapshots').upsert(
      {
        gym_id: gymId,
        exercise_id: null,
        category,
        period,
        period_start: start ?? '1900-01-01',
        period_end: end ?? null,
        rankings,
        generated_at: generatedAt,
      },
      { onConflict: 'gym_id,category,period,period_start' }
    );
  }

  // ── 3. Most Workouts ───────────────────────────────────────────────────────
  const workoutPeriods: Array<{
    category: string;
    period: string;
    start: string | null;
    end: string | null;
  }> = [
    { category: 'most_workouts_week',    period: 'weekly',   start: getWeekStart(),  end: getWeekEnd() },
    { category: 'most_workouts_month',   period: 'monthly',  start: getMonthStart(), end: getMonthEnd() },
    { category: 'most_workouts_alltime', period: 'all_time', start: null,            end: null },
  ];

  for (const { category, period, start, end } of workoutPeriods) {
    let query = supabase
      .from('workouts')
      .select('user_id, users!inner(username, full_name, avatar_url, deleted_at)')
      .eq('gym_id', gymId)
      .eq('is_completed', true)
      .is('users.deleted_at', null);

    if (start) query = query.gte('started_at', start);
    if (end)   query = query.lt('started_at', end);

    const { data: wData } = await query;

    const userCount = new Map<string, { value: number; username: string; full_name: string | null; avatar_url: string | null }>();
    for (const w of wData ?? []) {
      const u = (w as any).users;
      const prev = userCount.get(w.user_id);
      userCount.set(w.user_id, {
        value: (prev?.value ?? 0) + 1,
        username: u?.username ?? '',
        full_name: u?.full_name ?? null,
        avatar_url: u?.avatar_url ?? null,
      });
    }

    const countRows = [...userCount.entries()]
      .map(([user_id, v]) => ({ user_id, ...v }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 50);

    const rankings = toRankings(countRows);

    await supabase.from('leaderboard_snapshots').upsert(
      {
        gym_id: gymId,
        exercise_id: null,
        category,
        period,
        period_start: start ?? '1900-01-01',
        period_end: end ?? null,
        rankings,
        generated_at: generatedAt,
      },
      { onConflict: 'gym_id,category,period,period_start' }
    );
  }

  // ── 4. Longest Streak (all_time) ───────────────────────────────────────────
  const { data: streakData } = await supabase
    .from('streaks')
    .select('user_id, longest_streak_weeks, users!inner(username, full_name, avatar_url, deleted_at)')
    .eq('gym_id', gymId)
    .is('users.deleted_at', null)
    .order('longest_streak_weeks', { ascending: false })
    .limit(50);

  const streakRows = (streakData ?? []).map((s) => {
    const u = (s as any).users;
    return {
      user_id: s.user_id,
      value: s.longest_streak_weeks ?? 0,
      username: u?.username ?? '',
      full_name: u?.full_name ?? null,
      avatar_url: u?.avatar_url ?? null,
    };
  });

  const streakRankings = toRankings(streakRows);

  await supabase.from('leaderboard_snapshots').upsert(
    {
      gym_id: gymId,
      exercise_id: null,
      category: 'longest_streak',
      period: 'all_time',
      period_start: '1900-01-01',
      period_end: null,
      rankings: streakRankings,
      generated_at: generatedAt,
    },
    { onConflict: 'gym_id,category,period,period_start' }
  );
}
