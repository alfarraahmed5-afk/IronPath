/**
 * StreakCard -- "X weeks strong" hero card.
 *
 * Founder Q2 lock: WEEKS as the displayed unit (current_streak_weeks).
 * The daily heatmap is the visual companion; here we surface the
 * weekly cadence + the in-danger warning.
 *
 * Visual:
 *   - 24 px Flame icon, brand-flame WARM ORANGE exception (Q6 lock).
 *   - Numeric value rolled in via the design-system Numeric primitive.
 *   - "Best: N weeks" caption when longest_streak_weeks > 0.
 *   - Amber "in danger" banner when last workout was 5+ days ago AND
 *     the current week ends within 2 days.
 *   - Empty state: "Start your streak today" + CTA.
 */
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Flame, Clock } from 'lucide-react-native';
import { Text } from '../../components/Text';
import { Surface } from '../../components/Surface';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Numeric } from '../../design-system/primitives/Numeric';
import { Pressable } from '../../design-system/primitives/Pressable';
import { colors, spacing, radii } from '../../theme/tokens';

export interface StreakCardStats {
  current_streak_weeks: number;
  longest_streak_weeks?: number | null;
  current_streak_days?: number | null;
  last_workout_at?: string | null;
}

export interface StreakCardProps {
  stats?: StreakCardStats | null;
  /** When tapping the card. Default routes to /workout/active flow. */
  onPress?: () => void;
  /** Allow embedding without margins. */
  compact?: boolean;
}

const FIVE_DAYS = 5 * 24 * 3600 * 1000;
const TWO_DAYS = 2 * 24 * 3600 * 1000;

function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

function daysUntilEndOfWeek(): number {
  // ISO week ends Sunday. Return days until Sunday end-of-day, inclusive.
  const now = new Date();
  const day = now.getUTCDay(); // 0..6, Sun..Sat
  const remaining = (7 - day) % 7;
  return remaining;
}

export function StreakCard({ stats, onPress, compact }: StreakCardProps) {
  const weeks = stats?.current_streak_weeks ?? 0;
  const longest = stats?.longest_streak_weeks ?? 0;
  const lastDaysAgo = daysSince(stats?.last_workout_at);
  const inDanger = useMemo(() => {
    if (weeks <= 0) return false;
    if (lastDaysAgo == null) return false;
    if (lastDaysAgo < 5) return false;
    // Also require the week to be ending soon.
    return daysUntilEndOfWeek() <= 2;
  }, [weeks, lastDaysAgo]);

  const handlePress =
    onPress ?? (() => router.push('/(tabs)/train' as any));

  // Empty state
  if (weeks === 0) {
    return (
      <Surface level={2} style={[styles.card, compact ? styles.compact : null]}>
        <View style={styles.row}>
          <Icon icon={Flame} size={24} color={colors.flame} strokeWidth={1.5} />
          <Text variant="title3" color="textPrimary" style={{ flex: 1 }}>
            Start your streak today
          </Text>
        </View>
        <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.xs }}>
          One workout this week kicks it off.
        </Text>
        <View style={{ marginTop: spacing.md }}>
          <Button label="Start workout" onPress={handlePress} variant="primary" size="md" />
        </View>
      </Surface>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.card, compact ? styles.compact : null]}
      accessibilityRole="button"
      accessibilityLabel={`${weeks} week streak.${longest > 0 ? ` Best ${longest} weeks.` : ''}${inDanger ? ' In danger.' : ''}`}
    >
      <View style={styles.row}>
        <Icon icon={Flame} size={28} color={colors.flame} strokeWidth={1.5} />
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flex: 1 }}>
          <Numeric value={weeks} variant="numericLarge" color="textPrimary" />
          <Text variant="title3" color="textSecondary">
            {weeks === 1 ? 'week strong' : 'weeks strong'}
          </Text>
        </View>
      </View>
      {longest > 0 ? (
        <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xs }}>
          Best: {longest} {longest === 1 ? 'week' : 'weeks'}
        </Text>
      ) : null}
      {inDanger ? (
        <View style={[styles.dangerBanner]}>
          <Icon icon={Clock} size={14} color={colors.warning} strokeWidth={2} />
          <Text variant="caption" style={{ color: colors.warning, flex: 1 }}>
            Your streak ends soon. Log a quick workout to save it.
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface2,
    padding: spacing.base,
    borderRadius: radii.lg,
    gap: spacing.xs,
  },
  compact: { padding: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dangerBanner: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.warningDim,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
