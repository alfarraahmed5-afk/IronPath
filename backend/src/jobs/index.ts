import cron from 'node-cron';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { computeGymLeaderboards, resolveLeaderboardExercises } from '../lib/leaderboardCompute';

export async function initJobs(): Promise<void> {
  await resolveLeaderboardExercises();
}

export function startJobs(): void {
  // Leaderboard refresh — every 15 min
  cron.schedule('*/15 * * * *', async () => {
    try {
      logger.info('Leaderboard refresh job started');
      const { data: gyms } = await supabase.from('gyms').select('id').eq('is_active', true);
      const gymList = gyms ?? [];
      for (let i = 0; i < gymList.length; i += 10) {
        const batch = gymList.slice(i, i + 10);
        await Promise.all(batch.map(g => computeGymLeaderboards(g.id)));
        if (i + 10 < gymList.length) await new Promise(r => setTimeout(r, 2000));
      }
      logger.info({ gyms: gymList.length }, 'Leaderboard refresh job complete');
    } catch (err) { logger.error({ err }, 'Leaderboard refresh job failed'); }
  }, { timezone: 'UTC' });

  // Weekly leaderboard reset — Mon 00:00
  cron.schedule('0 0 * * 1', async () => {
    try {
      logger.info('Weekly leaderboard reset started');
      // Phase 4: archive weekly snapshots, insert new period
      logger.info('Weekly leaderboard reset complete');
    } catch (err) { logger.error({ err }, 'Weekly leaderboard reset failed'); }
  }, { timezone: 'UTC' });

  // Monthly leaderboard reset — 1st 00:00
  cron.schedule('0 0 1 * *', async () => {
    try {
      logger.info('Monthly leaderboard reset started');
      logger.info('Monthly leaderboard reset complete');
    } catch (err) { logger.error({ err }, 'Monthly leaderboard reset failed'); }
  }, { timezone: 'UTC' });

  // Monthly report generation — 1st 01:00
  cron.schedule('0 1 1 * *', async () => {
    try {
      logger.info('Monthly report generation started');

      const now = new Date();
      const priorMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const priorMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const prevPrevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
      const priorMonthLabel = priorMonthStart.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      const periodStart = priorMonthStart.toISOString().split('T')[0];

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, gym_id, sex, bodyweight_kg')
        .is('deleted_at', null)
        .eq('is_active', true);
      if (usersError) throw usersError;

      const total = users?.length ?? 0;
      let generated = 0;
      let skipped = 0;
      const batchSize = 20;

      for (let i = 0; i < total; i += batchSize) {
        const batch = users!.slice(i, i + batchSize);
        await Promise.all(batch.map(async (user) => {
          const uid = user.id;

          // a. Prior month workouts
          const { data: workouts, error: wErr } = await supabase
            .from('workouts')
            .select('id, name, started_at, duration_seconds, total_volume_kg, total_sets')
            .eq('user_id', uid)
            .eq('is_completed', true)
            .gte('started_at', priorMonthStart.toISOString())
            .lt('started_at', priorMonthEnd.toISOString())
            .order('started_at', { ascending: true });
          if (wErr) throw wErr;
          if (!workouts || workouts.length === 0) { skipped++; return; }

          // b. Prior-prior month totals
          const { data: prevData, error: prevErr } = await supabase
            .from('workouts')
            .select('total_volume_kg, total_sets')
            .eq('user_id', uid)
            .eq('is_completed', true)
            .gte('started_at', prevPrevMonthStart.toISOString())
            .lt('started_at', priorMonthStart.toISOString());
          if (prevErr) throw prevErr;
          const totalVolumePrev = prevData?.reduce((s, r) => s + (r.total_volume_kg ?? 0), 0) ?? 0;
          const totalSetsPrev = prevData?.reduce((s, r) => s + (r.total_sets ?? 0), 0) ?? 0;
          const totalWorkoutsPrev = prevData?.length ?? 0;

          // c. PRs achieved in prior month
          const { data: prs, error: prErr } = await supabase
            .from('personal_records')
            .select('*, exercises(name), workouts(name)')
            .eq('user_id', uid)
            .gte('achieved_at', priorMonthStart.toISOString())
            .lt('achieved_at', priorMonthEnd.toISOString())
            .order('achieved_at', { ascending: true });
          if (prErr) throw prErr;

          // d. Muscle distribution via workout_exercises + exercises
          const workoutIds = workouts.map((w) => w.id);
          const { data: weRows, error: weErr } = await supabase
            .from('workout_exercises')
            .select('id, exercise_id, exercises(primary_muscles)')
            .in('workout_id', workoutIds);
          if (weErr) throw weErr;

          const weIds = weRows?.map((we) => we.id) ?? [];
          let completedSetCount: Record<string, number> = {};
          if (weIds.length > 0) {
            const { data: sets, error: setsErr } = await supabase
              .from('workout_sets')
              .select('workout_exercise_id')
              .in('workout_exercise_id', weIds)
              .eq('is_completed', true)
              .eq('is_warmup', false);
            if (setsErr) throw setsErr;
            for (const s of sets ?? []) {
              completedSetCount[s.workout_exercise_id] = (completedSetCount[s.workout_exercise_id] ?? 0) + 1;
            }
          }

          const muscleSetCounts: Record<string, number> = {};
          let totalMuscleSets = 0;
          for (const we of weRows ?? []) {
            const muscles: string[] = (we.exercises as any)?.primary_muscles ?? [];
            const sets = completedSetCount[we.id] ?? 0;
            for (const muscle of muscles) {
              muscleSetCounts[muscle] = (muscleSetCounts[muscle] ?? 0) + sets;
              totalMuscleSets += sets;
            }
          }
          const muscleDistribution = Object.entries(muscleSetCounts).map(([muscle, sets]) => ({
            muscle,
            sets,
            percentage: totalMuscleSets > 0 ? Math.round((sets / totalMuscleSets) * 1000) / 10 : 0,
          }));

          // e. Top exercises (top 5 by times_logged)
          const exerciseCount: Record<string, number> = {};
          for (const we of weRows ?? []) {
            const name: string = (we.exercises as any)?.name ?? we.exercise_id;
            exerciseCount[name] = (exerciseCount[name] ?? 0) + 1;
          }
          const topExercises = Object.entries(exerciseCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([exercise_name, times_logged]) => ({ exercise_name, times_logged }));

          // f. Streak at end of month
          const { data: streakRow } = await supabase
            .from('streaks')
            .select('current_streak_weeks')
            .eq('user_id', uid)
            .maybeSingle();
          const streakAtEnd = streakRow?.current_streak_weeks ?? 0;

          // g. Training days, weeks, calendar days
          const training_days = workouts.length;
          const isoWeekMondaySet = new Set<string>();
          const calendarDays: string[] = [];
          for (const w of workouts) {
            const d = new Date(w.started_at);
            const day = d.getUTCDay(); // 0=Sun
            const diff = day === 0 ? -6 : 1 - day;
            const monday = new Date(d);
            monday.setUTCDate(d.getUTCDate() + diff);
            isoWeekMondaySet.add(monday.toISOString().split('T')[0]);
            calendarDays.push(d.toISOString().split('T')[0]);
          }
          const weeks_with_workout = isoWeekMondaySet.size;
          const totalVolume = workouts.reduce((s, w) => s + (w.total_volume_kg ?? 0), 0);
          const totalSets = workouts.reduce((s, w) => s + (w.total_sets ?? 0), 0);
          const totalDuration = workouts.reduce((s, w) => s + (w.duration_seconds ?? 0), 0);

          // h. Build report_data
          const reportData = {
            month_label: priorMonthLabel,
            total_workouts: workouts.length,
            total_workouts_prev_month: totalWorkoutsPrev,
            total_volume_kg: totalVolume,
            total_volume_prev_month_kg: totalVolumePrev,
            total_sets: totalSets,
            total_sets_prev_month: totalSetsPrev,
            total_duration_seconds: totalDuration,
            training_days,
            weeks_with_workout,
            streak_at_end_of_month: streakAtEnd,
            calendar_training_days: calendarDays,
            personal_records: (prs ?? []).map((pr) => ({
              exercise_name: (pr.exercises as any)?.name ?? null,
              record_type: pr.record_type,
              value_kg: pr.value_kg,
              achieved_at: pr.achieved_at,
              workout_id: pr.workout_id ?? null,
              workout_name: (pr.workouts as any)?.name ?? null,
            })),
            muscle_distribution: muscleDistribution,
            top_exercises: topExercises,
          };

          // i. Upsert into monthly_reports
          const { data: upserted, error: upsertErr } = await supabase
            .from('monthly_reports')
            .upsert(
              {
                user_id: uid,
                gym_id: user.gym_id,
                report_period_start: periodStart,
                report_type: 'monthly',
                report_data: reportData,
              },
              { onConflict: 'user_id,report_period_start,report_type' }
            )
            .select('id')
            .maybeSingle();
          if (upsertErr) throw upsertErr;

          // j. Push notification
          await supabase.from('notifications').insert({
            user_id: uid,
            gym_id: user.gym_id,
            type: 'monthly_report_ready',
            title: 'Your Monthly Report is Ready',
            body: `Your ${priorMonthLabel} training summary is ready to view.`,
            data: { report_id: upserted?.id ?? null, period: periodStart },
          });

          generated++;
        }));
      }

      logger.info({ generated, skipped }, `Processed ${generated + skipped}/${total} users, ${generated} reports generated`);
      logger.info('Monthly report generation complete');
    } catch (err) { logger.error({ err }, 'Monthly report generation failed'); }
  }, { timezone: 'UTC' });

  // Year in Review — Jan 1st 02:00
  cron.schedule('0 2 1 1 *', async () => {
    try {
      logger.info('Year in review generation started');

      const now = new Date();
      const priorYear = now.getUTCFullYear() - 1;
      const yearStart = new Date(Date.UTC(priorYear, 0, 1));
      const yearEnd = new Date(Date.UTC(priorYear + 1, 0, 1));
      const prevYearStart = new Date(Date.UTC(priorYear - 1, 0, 1));
      const yearLabel = `Year in Review ${priorYear}`;
      const periodStart = `${priorYear}-01-01`;

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, gym_id, sex, bodyweight_kg')
        .is('deleted_at', null)
        .eq('is_active', true);
      if (usersError) throw usersError;

      const total = users?.length ?? 0;
      let generated = 0;
      let skipped = 0;
      const batchSize = 20;

      for (let i = 0; i < total; i += batchSize) {
        const batch = users!.slice(i, i + batchSize);
        await Promise.all(batch.map(async (user) => {
          const uid = user.id;

          // a. Year workouts
          const { data: workouts, error: wErr } = await supabase
            .from('workouts')
            .select('id, name, started_at, duration_seconds, total_volume_kg, total_sets')
            .eq('user_id', uid)
            .eq('is_completed', true)
            .gte('started_at', yearStart.toISOString())
            .lt('started_at', yearEnd.toISOString())
            .order('started_at', { ascending: true });
          if (wErr) throw wErr;
          if (!workouts || workouts.length === 0) { skipped++; return; }

          // b. Prior year totals (no comparison needed per spec — set to 0)
          const { data: prevData, error: prevErr } = await supabase
            .from('workouts')
            .select('total_volume_kg, total_sets')
            .eq('user_id', uid)
            .eq('is_completed', true)
            .gte('started_at', prevYearStart.toISOString())
            .lt('started_at', yearStart.toISOString());
          if (prevErr) throw prevErr;
          const totalVolumePrev = prevData?.reduce((s, r) => s + (r.total_volume_kg ?? 0), 0) ?? 0;
          const totalSetsPrev = prevData?.reduce((s, r) => s + (r.total_sets ?? 0), 0) ?? 0;
          const totalWorkoutsPrev = prevData?.length ?? 0;

          // c. PRs achieved in the year
          const { data: prs, error: prErr } = await supabase
            .from('personal_records')
            .select('*, exercises(name), workouts(name)')
            .eq('user_id', uid)
            .gte('achieved_at', yearStart.toISOString())
            .lt('achieved_at', yearEnd.toISOString())
            .order('achieved_at', { ascending: true });
          if (prErr) throw prErr;

          // d. Muscle distribution
          const workoutIds = workouts.map((w) => w.id);
          const { data: weRows, error: weErr } = await supabase
            .from('workout_exercises')
            .select('id, exercise_id, exercises(primary_muscles)')
            .in('workout_id', workoutIds);
          if (weErr) throw weErr;

          const weIds = weRows?.map((we) => we.id) ?? [];
          let completedSetCount: Record<string, number> = {};
          if (weIds.length > 0) {
            const { data: sets, error: setsErr } = await supabase
              .from('workout_sets')
              .select('workout_exercise_id')
              .in('workout_exercise_id', weIds)
              .eq('is_completed', true)
              .eq('is_warmup', false);
            if (setsErr) throw setsErr;
            for (const s of sets ?? []) {
              completedSetCount[s.workout_exercise_id] = (completedSetCount[s.workout_exercise_id] ?? 0) + 1;
            }
          }

          const muscleSetCounts: Record<string, number> = {};
          let totalMuscleSets = 0;
          for (const we of weRows ?? []) {
            const muscles: string[] = (we.exercises as any)?.primary_muscles ?? [];
            const sets = completedSetCount[we.id] ?? 0;
            for (const muscle of muscles) {
              muscleSetCounts[muscle] = (muscleSetCounts[muscle] ?? 0) + sets;
              totalMuscleSets += sets;
            }
          }
          const muscleDistribution = Object.entries(muscleSetCounts).map(([muscle, sets]) => ({
            muscle,
            sets,
            percentage: totalMuscleSets > 0 ? Math.round((sets / totalMuscleSets) * 1000) / 10 : 0,
          }));

          // e. Top exercises
          const exerciseCount: Record<string, number> = {};
          for (const we of weRows ?? []) {
            const name: string = (we.exercises as any)?.name ?? we.exercise_id;
            exerciseCount[name] = (exerciseCount[name] ?? 0) + 1;
          }
          const topExercises = Object.entries(exerciseCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([exercise_name, times_logged]) => ({ exercise_name, times_logged }));

          // f. Streak at end of year
          const { data: streakRow } = await supabase
            .from('streaks')
            .select('current_streak_weeks')
            .eq('user_id', uid)
            .maybeSingle();
          const streakAtEnd = streakRow?.current_streak_weeks ?? 0;

          // g. Training days, weeks (distinct ISO weeks across year), calendar days
          const training_days = workouts.length;
          const isoWeekSet = new Set<string>();
          const calendarDays: string[] = [];
          for (const w of workouts) {
            const d = new Date(w.started_at);
            const day = d.getUTCDay();
            const diff = day === 0 ? -6 : 1 - day;
            const monday = new Date(d);
            monday.setUTCDate(d.getUTCDate() + diff);
            isoWeekSet.add(monday.toISOString().split('T')[0]);
            calendarDays.push(d.toISOString().split('T')[0]);
          }
          const weeks_with_workout = isoWeekSet.size;
          const totalVolume = workouts.reduce((s, w) => s + (w.total_volume_kg ?? 0), 0);
          const totalSets = workouts.reduce((s, w) => s + (w.total_sets ?? 0), 0);
          const totalDuration = workouts.reduce((s, w) => s + (w.duration_seconds ?? 0), 0);

          // h. Build report_data
          const reportData = {
            month_label: yearLabel,
            total_workouts: workouts.length,
            total_workouts_prev_month: totalWorkoutsPrev,
            total_volume_kg: totalVolume,
            total_volume_prev_month_kg: totalVolumePrev,
            total_sets: totalSets,
            total_sets_prev_month: totalSetsPrev,
            total_duration_seconds: totalDuration,
            training_days,
            weeks_with_workout,
            streak_at_end_of_month: streakAtEnd,
            calendar_training_days: calendarDays,
            personal_records: (prs ?? []).map((pr) => ({
              exercise_name: (pr.exercises as any)?.name ?? null,
              record_type: pr.record_type,
              value_kg: pr.value_kg,
              achieved_at: pr.achieved_at,
              workout_id: pr.workout_id ?? null,
              workout_name: (pr.workouts as any)?.name ?? null,
            })),
            muscle_distribution: muscleDistribution,
            top_exercises: topExercises,
          };

          // i. Upsert into monthly_reports
          const { data: upserted, error: upsertErr } = await supabase
            .from('monthly_reports')
            .upsert(
              {
                user_id: uid,
                gym_id: user.gym_id,
                report_period_start: periodStart,
                report_type: 'yearly',
                report_data: reportData,
              },
              { onConflict: 'user_id,report_period_start,report_type' }
            )
            .select('id')
            .maybeSingle();
          if (upsertErr) throw upsertErr;

          // j. Push notification
          await supabase.from('notifications').insert({
            user_id: uid,
            gym_id: user.gym_id,
            type: 'monthly_report_ready',
            title: 'Your Year in Review is Ready',
            body: `Your ${yearLabel} training summary is ready to view.`,
            data: { report_id: upserted?.id ?? null, period: periodStart },
          });

          generated++;
        }));
      }

      logger.info({ generated, skipped }, `Processed ${generated + skipped}/${total} users, ${generated} year-in-review reports generated`);
      logger.info('Year in review generation complete');
    } catch (err) { logger.error({ err }, 'Year in review failed'); }
  }, { timezone: 'UTC' });

  // Weekly nudge notifications — Mon 09:00
  cron.schedule('0 9 * * 1', async () => {
    try {
      logger.info('Weekly nudge job started');
      // Phase 6: find users with no workout last week, send push
      logger.info('Weekly nudge job complete');
    } catch (err) { logger.error({ err }, 'Weekly nudge job failed'); }
  }, { timezone: 'UTC' });

  // Streak broken check — Mon 00:05
  cron.schedule('5 0 * * 1', async () => {
    try {
      logger.info('Streak broken check started');
      // Compute previous week Monday (YYYY-MM-DD)
      const now = new Date();
      const dayOfWeek = now.getUTCDay(); // 0 = Sunday
      const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const thisMonday = new Date(now);
      thisMonday.setUTCDate(now.getUTCDate() - daysToLastMonday);
      thisMonday.setUTCHours(0, 0, 0, 0);
      const prevMonday = new Date(thisMonday);
      prevMonday.setUTCDate(thisMonday.getUTCDate() - 7);
      const prevMondayStr = prevMonday.toISOString().split('T')[0];

      const { error } = await supabase.from('streaks')
        .update({ current_streak_weeks: 0 })
        .lt('last_workout_week', prevMondayStr)
        .gt('current_streak_weeks', 0);
      if (error) throw error;
      logger.info('Streak broken check complete');
    } catch (err) { logger.error({ err }, 'Streak broken check failed'); }
  }, { timezone: 'UTC' });

  // Notification cleanup — Daily 03:00 (batched)
  cron.schedule('0 3 * * *', async () => {
    try {
      logger.info('Notification cleanup started');
      let deleted = 1;
      while (deleted > 0) {
        const { data, error } = await supabase.from('notifications')
          .delete()
          .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
          .select('id');
        if (error) throw error;
        deleted = data?.length || 0;
      }
      logger.info('Notification cleanup complete');
    } catch (err) { logger.error({ err }, 'Notification cleanup failed'); }
  }, { timezone: 'UTC' });

  // Leaderboard snapshot cleanup — 1st 04:00
  cron.schedule('0 4 1 * *', async () => {
    try {
      logger.info('Leaderboard snapshot cleanup started');
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      await supabase.from('leaderboard_snapshots').delete().lt('generated_at', cutoff.toISOString());
      logger.info('Leaderboard snapshot cleanup complete');
    } catch (err) { logger.error({ err }, 'Leaderboard snapshot cleanup failed'); }
  }, { timezone: 'UTC' });

  // Challenge update + results — every 5 min
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date().toISOString();
      await supabase.from('leaderboard_challenges').update({ status: 'active' }).eq('status', 'upcoming').lte('starts_at', now);
      await supabase.from('leaderboard_challenges').update({ status: 'completed' }).eq('status', 'active').lt('ends_at', now);
    } catch (err) { logger.error({ err }, 'Challenge update job failed'); }
  }, { timezone: 'UTC' });

  // Pending media cleanup — Daily 05:00
  cron.schedule('0 5 * * *', async () => {
    try {
      logger.info('Pending media cleanup started');
      // Supabase Storage file listing needed to enumerate /pending/ files > 24h
      // Phase 2 stub: implement with Storage list() in full pass
      logger.info('Pending media cleanup complete (stub)');
    } catch (err) { logger.error({ err }, 'Pending media cleanup failed'); }
  }, { timezone: 'UTC' });

  // Daily badge awards — runs at 06:00 UTC after the leaderboard cron has
  // populated snapshots. Awards Top-10 badges in each leaderboard category
  // and a generic "challenge_winner" badge for completed gym challenges.
  cron.schedule('0 6 * * *', async () => {
    try {
      logger.info('Badge award job started');
      const { data: snaps } = await supabase
        .from('leaderboard_snapshots')
        .select('gym_id, category, period, exercise_id, rankings, generated_at')
        .in('category', ['heaviest_lift', 'most_volume_alltime', 'most_workouts_alltime', 'longest_streak'])
        .gte('generated_at', new Date(Date.now() - 36 * 3600 * 1000).toISOString());

      const BADGE_LABELS: Record<string, string> = {
        heaviest_lift: 'Top 10 · Lift',
        most_volume_alltime: 'Top 10 · Volume',
        most_workouts_alltime: 'Top 10 · Workouts',
        longest_streak: 'Top 10 · Streak',
      };
      const BADGE_TYPES: Record<string, string> = {
        heaviest_lift: 'top10_lifts',
        most_volume_alltime: 'top10_volume',
        most_workouts_alltime: 'top10_workouts',
        longest_streak: 'top10_streak',
      };

      const awards: any[] = [];
      const expiresAt = new Date(Date.now() + 30 * 86400 * 1000).toISOString();
      for (const snap of snaps || []) {
        const rankings = (snap.rankings as any[]) || [];
        const top10 = rankings.slice(0, 10);
        for (const r of top10) {
          if (!r.user_id) continue;
          awards.push({
            user_id: r.user_id,
            gym_id: snap.gym_id,
            badge_type: BADGE_TYPES[snap.category],
            badge_label: BADGE_LABELS[snap.category],
            badge_color: r.rank === 1 ? '#FFD700' : r.rank <= 3 ? '#C0C0C0' : '#CD7F32',
            ref_id: snap.exercise_id || null,
            metadata: { rank: r.rank, period: snap.period },
            expires_at: expiresAt,
          });
        }
      }

      // Challenge winners
      const { data: completedChallenges } = await supabase
        .from('leaderboard_challenges')
        .select('id, gym_id, name, enrolled_user_ids')
        .eq('status', 'completed')
        .gte('ends_at', new Date(Date.now() - 36 * 3600 * 1000).toISOString());
      for (const ch of completedChallenges || []) {
        // A real winner needs the rankings — pull current snapshot (or use enrolled[0] as a placeholder)
        const enrolled = Array.isArray(ch.enrolled_user_ids) ? ch.enrolled_user_ids : [];
        if (enrolled.length === 0) continue;
        awards.push({
          user_id: enrolled[0],
          gym_id: ch.gym_id,
          badge_type: 'challenge_winner',
          badge_label: `Won: ${ch.name}`,
          badge_color: '#FFD700',
          ref_id: ch.id,
          metadata: { challenge_name: ch.name },
        });
      }

      if (awards.length > 0) {
        await supabase.from('user_achievements').upsert(awards, { onConflict: 'user_id,badge_type,ref_id' });
      }
      logger.info({ awarded: awards.length }, 'Badge award job complete');
    } catch (err) { logger.error({ err }, 'Badge award job failed'); }
  }, { timezone: 'UTC' });

  logger.info('All background jobs registered');
}
