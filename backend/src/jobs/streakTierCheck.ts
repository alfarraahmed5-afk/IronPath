/**
 * BE-N (mobile cinematic overhaul) -- streak tier ladder cron.
 *
 * Founder Q6 lock: replace the old iron_month / iron_quarter pair
 * with a denser ladder anchored on DAYS:
 *
 *   iron_streak_2w   14 days
 *   iron_streak_1m   30 days
 *   iron_streak_3m   90 days
 *   iron_streak_6m  180 days
 *   iron_streak_1y  365 days
 *   iron_streak_2y  730 days
 *   iron_streak_5y 1825 days
 *
 * The cron runs nightly. For each streak row whose
 * `current_streak_days` >= the lowest threshold (14), we walk the
 * ladder, insert a `user_badges` row for any newly-crossed tier, and
 * emit a corresponding `gym_milestones` entry + push notification on
 * the `pr-and-streak` channel.
 *
 * Idempotent by design: the unique (user_id, badge_key) constraint
 * on user_badges and (gym_id, milestone_key) on gym_milestones means
 * re-running the cron on the same data inserts zero rows. Even if a
 * tier threshold is loosened or the ordering rules change, the cron
 * just emits any newly-eligible rows.
 *
 * The job is registered in `jobs/index.ts` to run at 02:00 UTC. Push
 * notifications honor the user's `notif_streak_milestones` setting.
 */
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { sendPushToUser } from '../lib/push';

interface StreakTierRow {
  badge_key: string;
  threshold_days: number;
  label: string;
  ordinal: number;
  is_deprecated: boolean;
}

interface StreakRow {
  user_id: string;
  gym_id: string | null;
  current_streak_days: number;
}

/**
 * Run the streak-tier-check pass. Returns counters for the cron's
 * log line.
 */
export async function runStreakTierCheck(): Promise<{
  scanned: number;
  badgesAwarded: number;
  milestonesInserted: number;
  pushesSent: number;
}> {
  // Pull active (non-deprecated) tier definitions from the DB so the
  // thresholds can be tuned without a code deploy.
  const { data: tierRows, error: tierErr } = await supabase
    .from('streak_tier_thresholds')
    .select('badge_key, threshold_days, label, ordinal, is_deprecated')
    .eq('is_deprecated', false)
    .order('threshold_days', { ascending: true });
  if (tierErr) {
    logger.error({ err: tierErr }, 'Failed to load streak_tier_thresholds');
    return { scanned: 0, badgesAwarded: 0, milestonesInserted: 0, pushesSent: 0 };
  }
  const tiers = (tierRows ?? []) as StreakTierRow[];
  if (tiers.length === 0) {
    return { scanned: 0, badgesAwarded: 0, milestonesInserted: 0, pushesSent: 0 };
  }
  const minThreshold = tiers[0].threshold_days;

  // Scan eligible streaks. Index `idx_streaks_high_current_days`
  // (created in migration 050) makes this near-free even at scale.
  const { data: streakRows, error: streakErr } = await supabase
    .from('streaks')
    .select('user_id, gym_id, current_streak_days')
    .gte('current_streak_days', minThreshold);
  if (streakErr) {
    logger.error({ err: streakErr }, 'Failed to load eligible streaks');
    return { scanned: 0, badgesAwarded: 0, milestonesInserted: 0, pushesSent: 0 };
  }
  const streaks = (streakRows ?? []) as StreakRow[];
  if (streaks.length === 0) {
    return { scanned: 0, badgesAwarded: 0, milestonesInserted: 0, pushesSent: 0 };
  }

  let badgesAwarded = 0;
  let milestonesInserted = 0;
  let pushesSent = 0;

  // Look up which badges each user already has so we don't probe one
  // row at a time. Filter by tier badge_keys to keep the result small.
  const userIds = streaks.map(s => s.user_id);
  const tierKeys = tiers.map(t => t.badge_key);
  const { data: existingBadgeRows } = await supabase
    .from('user_badges')
    .select('user_id, badge_key')
    .in('user_id', userIds)
    .in('badge_key', tierKeys);
  const userToBadges = new Map<string, Set<string>>();
  for (const row of existingBadgeRows ?? []) {
    let set = userToBadges.get(row.user_id);
    if (!set) {
      set = new Set();
      userToBadges.set(row.user_id, set);
    }
    set.add(row.badge_key);
  }

  // Look up notification preference per user. One round-trip is
  // cheaper than per-user fan-out when n is large.
  // We read `notif_streak_milestones` which is the semantically
  // correct toggle for the streak ladder per migration 022.
  const { data: settingsRows } = await supabase
    .from('user_settings')
    .select('user_id, notif_streak_milestones')
    .in('user_id', userIds);
  const userToNotif = new Map<string, boolean>();
  for (const row of settingsRows ?? []) {
    userToNotif.set(row.user_id, (row as any).notif_streak_milestones ?? true);
  }

  for (const streak of streaks) {
    const have = userToBadges.get(streak.user_id) ?? new Set<string>();
    // Tiers are sorted ascending; emit each crossed tier the user
    // doesn't yet have. A user who jumps from 0->90 (data backfill)
    // gets all three intermediate tiers in one nightly run.
    const crossed = tiers.filter(t => streak.current_streak_days >= t.threshold_days && !have.has(t.badge_key));
    if (crossed.length === 0) continue;

    for (const tier of crossed) {
      // Insert user_badges row -- unique constraint absorbs races.
      const { error: badgeErr } = await supabase
        .from('user_badges')
        .insert({ user_id: streak.user_id, badge_key: tier.badge_key });
      if (badgeErr) {
        if (badgeErr.code !== '23505') {
          logger.warn({ err: badgeErr, badge: tier.badge_key, user: streak.user_id }, 'Streak badge insert failed');
        }
        continue;
      }
      badgesAwarded++;

      // Insert gym_milestone row when the user has a gym. Unique
      // (gym_id, milestone_key) absorbs duplicates.
      if (streak.gym_id) {
        const milestoneKey = `streak_${tier.badge_key}_${streak.user_id}`;
        const { error: msErr } = await supabase
          .from('gym_milestones')
          .insert({
            gym_id: streak.gym_id,
            milestone_key: milestoneKey,
            metadata: {
              user_id: streak.user_id,
              badge_key: tier.badge_key,
              label: tier.label,
              days: streak.current_streak_days,
            },
          });
        if (!msErr) {
          milestonesInserted++;
        } else if (msErr.code !== '23505') {
          logger.warn({ err: msErr, milestoneKey }, 'gym_milestones insert failed');
        }
      }

      // In-app notification + push (gated on user's settings).
      await supabase.from('notifications').insert({
        user_id: streak.user_id,
        gym_id: streak.gym_id,
        type: 'badge_unlocked',
        title: 'Streak Badge Unlocked!',
        body: `You hit a ${tier.label} -- nice run.`,
        data: { badge_type: tier.badge_key, days: streak.current_streak_days },
      });

      const notifEnabled = userToNotif.get(streak.user_id) ?? true;
      if (notifEnabled) {
        try {
          await sendPushToUser(streak.user_id, {
            title: 'Streak Badge Unlocked!',
            body: `You hit a ${tier.label} -- nice run.`,
            channelId: 'pr-and-streak',
            data: { type: 'badge_unlocked', badge_type: tier.badge_key, days: streak.current_streak_days },
            sound: 'default',
          });
          pushesSent++;
        } catch (err) {
          logger.warn({ err, user: streak.user_id, badge: tier.badge_key }, 'Streak push send failed');
        }
      }
    }
  }

  return { scanned: streaks.length, badgesAwarded, milestonesInserted, pushesSent };
}
