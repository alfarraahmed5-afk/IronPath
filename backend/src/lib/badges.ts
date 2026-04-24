import { DateTime } from 'luxon';
import { supabase } from './supabase';
import { logger } from './logger';
import { sendPushToUser } from './push';

const BADGE_LABELS: Record<string, string> = {
  first_rep: 'First Rep',
  ten_strong: 'Ten Strong',
  half_century: 'Half Century',
  century: 'Century Club',
  iron_month: 'Iron Month',
  iron_quarter: 'Iron Quarter',
  pr_machine: 'PR Machine',
  heavy_lifter: 'Heavy Lifter',
  consistent: 'Consistent',
  early_bird: 'Early Bird',
  night_owl: 'Night Owl',
};

export interface BadgeContext {
  workoutId: string;
  userId: string;
  gymId: string;
  ordinalNumber: number;
  startedAt: string;
}

export async function checkAndAwardBadges(ctx: BadgeContext): Promise<void> {
  try {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('timezone, notif_badge_unlocked')
      .eq('user_id', ctx.userId)
      .single();
    const timezone = settings?.timezone || 'UTC';
    const notifEnabled = settings?.notif_badge_unlocked ?? true;

    const earned: string[] = [];

    // first_rep
    if (ctx.ordinalNumber === 1) earned.push('first_rep');

    // workout count badges
    const { count: workoutCount } = await supabase
      .from('workouts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.userId)
      .eq('is_completed', true);
    const wc = workoutCount || 0;
    if (wc >= 10) earned.push('ten_strong');
    if (wc >= 50) earned.push('half_century');
    if (wc >= 100) earned.push('century');

    // streak badges
    const { data: streakRow } = await supabase
      .from('streaks')
      .select('current_streak_weeks')
      .eq('user_id', ctx.userId)
      .single();
    const currentWeeks = streakRow?.current_streak_weeks || 0;
    if (currentWeeks >= 4) earned.push('iron_month');
    if (currentWeeks >= 12) earned.push('iron_quarter');

    // pr_machine
    const { count: prCount } = await supabase
      .from('personal_records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.userId);
    if ((prCount || 0) >= 10) earned.push('pr_machine');

    // heavy_lifter — sum total_volume_kg across all completed workouts
    const { data: volRows } = await supabase
      .from('workouts')
      .select('total_volume_kg')
      .eq('user_id', ctx.userId)
      .eq('is_completed', true);
    const totalVol = (volRows || []).reduce((sum, r) => sum + (r.total_volume_kg || 0), 0);
    if (totalVol >= 10000) earned.push('heavy_lifter');

    // consistent — 4+ workouts in the ISO week of this workout
    const workoutDt = DateTime.fromISO(ctx.startedAt, { zone: 'UTC' });
    const weekStart = workoutDt.startOf('week').toISO()!;
    const weekEnd = workoutDt.endOf('week').toISO()!;
    const { count: weekCount } = await supabase
      .from('workouts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.userId)
      .eq('is_completed', true)
      .gte('started_at', weekStart)
      .lte('started_at', weekEnd);
    if ((weekCount || 0) >= 4) earned.push('consistent');

    // early_bird / night_owl
    const localDt = DateTime.fromISO(ctx.startedAt, { zone: timezone });
    if (localDt.hour < 7) earned.push('early_bird');
    if (localDt.hour >= 22) earned.push('night_owl');

    for (const badge of earned) {
      const { data: inserted, error } = await supabase
        .from('user_badges')
        .insert({
          user_id: ctx.userId,
          gym_id: ctx.gymId,
          badge_type: badge,
          workout_id: ctx.workoutId,
        })
        .select('id')
        .single();

      if (error) {
        // 23505 = unique_violation — badge already awarded, skip silently
        if (error.code !== '23505') logger.warn({ error, badge }, 'Badge insert error');
        continue;
      }

      const label = BADGE_LABELS[badge] || badge;
      await supabase.from('notifications').insert({
        user_id: ctx.userId,
        gym_id: ctx.gymId,
        type: 'badge_unlocked',
        title: 'Badge Unlocked!',
        body: `You earned the ${label} badge`,
        data: { badge_type: badge, badge_id: inserted.id },
      });

      if (notifEnabled) {
        await sendPushToUser(ctx.userId, {
          title: 'Badge Unlocked!',
          body: `You earned the ${label} badge`,
          data: { type: 'badge_unlocked', badge_type: badge },
          sound: 'default',
        });
      }
    }
  } catch (err) {
    logger.error({ err }, 'Badge check failed');
  }
}
