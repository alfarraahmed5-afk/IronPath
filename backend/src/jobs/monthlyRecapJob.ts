/**
 * BE-E (mobile cinematic overhaul) -- monthly recap cron.
 *
 * Per lens 7 P1-1. Generates a one-row-per-user recap payload for the
 * prior calendar month. Scheduled via cron at 06:00 UTC on the 1st
 * (registered in backend/src/jobs/index.ts).
 *
 * Distinct from the legacy `monthly_reports` cron at 01:00 UTC: that
 * job feeds the analytics/reports spreadsheet view. This job feeds
 * the cinematic 6-panel mobile takeover. Both can coexist; the
 * payload shapes are intentionally different.
 *
 * Output payload shape (consumed by MonthlyRecap.tsx):
 *
 *   {
 *     period_label: "March 2026",
 *     total_workouts: number,
 *     total_volume_kg: number,
 *     total_sets: number,
 *     total_duration_seconds: number,
 *     prev_total_volume_kg: number,
 *     prev_total_workouts: number,
 *     weekly_volume: { week: 'YYYY-Www', volume_kg: number }[],
 *     top_lifts: { exercise_name: string, max_weight_kg: number, is_pr: boolean }[],
 *     dominant_muscle: { muscle: string, sets: number } | null,
 *     consistency: { sessions: number, target: number, weeks_in_a_row: number },
 *     gym_rank: { rank: number | null, total: number | null },
 *     prs: { exercise_name: string, value: number, record_type: string }[]
 *   }
 *
 * Idempotent: upserts on (user_id, period_key).
 */
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

interface UserRow {
  id: string;
  gym_id: string | null;
}

function isoWeekKey(date: Date): string {
  // Returns 'YYYY-Www' (ISO week). Monday-anchored, UTC.
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayOfWeek = (tmp.getUTCDay() + 6) % 7;
  tmp.setUTCDate(tmp.getUTCDate() - dayOfWeek + 3);
  const firstThursday = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
  const diff = (tmp.getTime() - firstThursday.getTime()) / 86400000;
  const week = 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export async function runMonthlyRecapJob(): Promise<{ scanned: number; generated: number; skipped: number }> {
  const now = new Date();
  const priorStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const priorEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const prevPrevStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
  const periodKey = `${priorStart.getUTCFullYear()}-${String(priorStart.getUTCMonth() + 1).padStart(2, '0')}`;
  const periodLabel = priorStart.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const periodStartDate = priorStart.toISOString().slice(0, 10);
  const periodEndDate = new Date(priorEnd.getTime() - 86400000).toISOString().slice(0, 10);

  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, gym_id')
    .is('deleted_at', null)
    .eq('is_active', true);
  if (usersErr) throw usersErr;
  const total = users?.length ?? 0;

  let generated = 0;
  let skipped = 0;
  const BATCH = 20;

  for (let i = 0; i < total; i += BATCH) {
    const batch = (users as UserRow[]).slice(i, i + BATCH);
    await Promise.all(batch.map(async (user) => {
      const uid = user.id;

      // 1. Workouts in the period.
      const { data: workouts } = await supabase
        .from('workouts')
        .select('id, started_at, duration_seconds, total_volume_kg, total_sets')
        .eq('user_id', uid)
        .eq('is_completed', true)
        .gte('started_at', priorStart.toISOString())
        .lt('started_at', priorEnd.toISOString())
        .order('started_at', { ascending: true });
      if (!workouts || workouts.length === 0) { skipped++; return; }

      // 2. Previous month aggregate (for delta panel).
      const { data: prev } = await supabase
        .from('workouts')
        .select('total_volume_kg, total_sets')
        .eq('user_id', uid)
        .eq('is_completed', true)
        .gte('started_at', prevPrevStart.toISOString())
        .lt('started_at', priorStart.toISOString());
      const prev_total_volume_kg = (prev ?? []).reduce((s, w) => s + Number(w.total_volume_kg ?? 0), 0);
      const prev_total_workouts = prev?.length ?? 0;

      // 3. Weekly volume bucket
      const weeklyMap = new Map<string, number>();
      for (const w of workouts) {
        const key = isoWeekKey(new Date(w.started_at));
        weeklyMap.set(key, (weeklyMap.get(key) ?? 0) + Number(w.total_volume_kg ?? 0));
      }
      const weekly_volume = [...weeklyMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, v]) => ({ week, volume_kg: Math.round(v * 10) / 10 }));

      // 4. PRs in the period.
      const { data: prs } = await supabase
        .from('personal_records')
        .select('value, record_type, exercise_id, exercises(name)')
        .eq('user_id', uid)
        .gte('achieved_at', priorStart.toISOString())
        .lt('achieved_at', priorEnd.toISOString())
        .order('achieved_at', { ascending: true });
      const prList = (prs ?? []).map((p: any) => ({
        exercise_name: (p.exercises as any)?.name ?? null,
        value: Number(p.value),
        record_type: p.record_type as string,
      }));

      // 5. Top 3 lifts by max weight in the period.
      const workoutIds = workouts.map(w => w.id);
      const topLifts: { exercise_name: string; max_weight_kg: number; is_pr: boolean }[] = [];
      const prKeySet = new Set(prList.map(p => `${p.exercise_name}::${p.record_type}`));
      if (workoutIds.length > 0) {
        // Pull workout_exercises + sets so we can compute per-exercise max weight.
        const { data: weRows } = await supabase
          .from('workout_exercises')
          .select('id, exercise_id, exercises(name)')
          .in('workout_id', workoutIds);
        const weIds = (weRows ?? []).map(we => we.id);
        const { data: sets } = weIds.length > 0
          ? await supabase
            .from('workout_sets')
            .select('workout_exercise_id, weight_kg')
            .in('workout_exercise_id', weIds)
            .eq('is_completed', true)
            .eq('is_warmup', false)
          : { data: [] as any[] };

        const maxByEx = new Map<string, { name: string; max: number }>();
        const weIdToExName = new Map<string, string>();
        for (const we of weRows ?? []) {
          const name = (we.exercises as any)?.name ?? we.exercise_id;
          weIdToExName.set(we.id, name);
        }
        for (const s of sets ?? []) {
          const name = weIdToExName.get(s.workout_exercise_id) ?? 'Unknown';
          const w = Number(s.weight_kg ?? 0);
          const prev = maxByEx.get(name);
          if (!prev || w > prev.max) maxByEx.set(name, { name, max: w });
        }
        const sortedTop = [...maxByEx.values()].sort((a, b) => b.max - a.max).slice(0, 3);
        for (const t of sortedTop) {
          topLifts.push({
            exercise_name: t.name,
            max_weight_kg: Math.round(t.max * 100) / 100,
            is_pr: prKeySet.has(`${t.name}::max_weight`) || prKeySet.has(`${t.name}::one_rep_max`),
          });
        }
      }

      // 6. Dominant muscle.
      const muscleCount: Record<string, number> = {};
      if (workoutIds.length > 0) {
        const { data: weRows } = await supabase
          .from('workout_exercises')
          .select('id, exercises(primary_muscles)')
          .in('workout_id', workoutIds);
        for (const we of weRows ?? []) {
          const muscles: string[] = (we.exercises as any)?.primary_muscles ?? [];
          for (const m of muscles) {
            muscleCount[m] = (muscleCount[m] ?? 0) + 1;
          }
        }
      }
      const dominant = Object.entries(muscleCount).sort(([, a], [, b]) => b - a)[0];
      const dominant_muscle = dominant ? { muscle: dominant[0], sets: dominant[1] } : null;

      // 7. Consistency.
      const isoWeeks = new Set<string>();
      for (const w of workouts) isoWeeks.add(isoWeekKey(new Date(w.started_at)));
      const consistency = {
        sessions: workouts.length,
        target: 4 * 4,  // a soft "4/wk for ~4wks" anchor; mobile clamps display
        weeks_in_a_row: isoWeeks.size,
      };

      // 8. Gym rank (best-effort from latest leaderboard snapshot).
      let gymRank: { rank: number | null; total: number | null } = { rank: null, total: null };
      if (user.gym_id) {
        const { data: snap } = await supabase
          .from('leaderboard_snapshots')
          .select('rankings')
          .eq('gym_id', user.gym_id)
          .eq('category', 'most_volume_alltime')
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (snap?.rankings && Array.isArray(snap.rankings)) {
          const rankings = snap.rankings as { user_id: string; rank: number }[];
          const me = rankings.find(r => r.user_id === uid);
          gymRank = { rank: me?.rank ?? null, total: rankings.length };
        }
      }

      // 9. Aggregate totals.
      const total_volume_kg = workouts.reduce((s, w) => s + Number(w.total_volume_kg ?? 0), 0);
      const total_sets = workouts.reduce((s, w) => s + Number(w.total_sets ?? 0), 0);
      const total_duration_seconds = workouts.reduce((s, w) => s + Number(w.duration_seconds ?? 0), 0);

      const payload = {
        period_label: periodLabel,
        total_workouts: workouts.length,
        total_volume_kg: Math.round(total_volume_kg * 10) / 10,
        total_sets,
        total_duration_seconds,
        prev_total_volume_kg: Math.round(prev_total_volume_kg * 10) / 10,
        prev_total_workouts,
        weekly_volume,
        top_lifts: topLifts,
        dominant_muscle,
        consistency,
        gym_rank: gymRank,
        prs: prList,
      };

      const { error: upErr } = await supabase
        .from('monthly_recaps')
        .upsert({
          user_id: uid,
          gym_id: user.gym_id,
          period_key: periodKey,
          period_start: periodStartDate,
          period_end: periodEndDate,
          payload,
        }, { onConflict: 'user_id,period_key' });
      if (upErr) { logger.warn({ err: upErr, uid }, 'monthly recap upsert failed'); return; }

      // Push notification on the pr-and-streak channel (mobile maps
      // this to the cinematic recap entry on Progress + Home).
      await supabase.from('notifications').insert({
        user_id: uid,
        gym_id: user.gym_id,
        type: 'monthly_recap_ready',
        title: `Your ${periodLabel} recap is ready`,
        body: 'Open IronPath to see your month under the bar.',
        data: { period_key: periodKey },
      });

      generated++;
    }));
  }

  return { scanned: total, generated, skipped };
}
