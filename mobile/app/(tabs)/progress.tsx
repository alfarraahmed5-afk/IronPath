/**
 * (tabs)/progress.tsx -- NEW Option B tab (founder Q1 lock).
 *
 * Hosts the progress-tracking surfaces lifted out of profile:
 *   - StreakCard (Q2 weeks, in-danger banner)
 *   - StreakHeatmap (P0-1, Skia 7x12)
 *   - VolumeComparison (P1-4, percentile-anchored)
 *   - Goals snapshot (Q3 -- ships in v1)
 *   - Per-lift PR sparklines (P1-5 for top 3 lifts)
 *   - Monthly recap entry card (P1-1)
 *   - Body trends + Adherence link cards
 *
 * Consumes:
 *   - /users/:id/stats              streak fields + recent
 *   - /workouts/calendar?include=set_counts,muscles (BE-A)
 *   - /analytics/all                consolidated period (BE-L)
 *   - /recaps/latest                latest monthly recap (BE-E)
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { ChevronRight, Scale, Activity } from 'lucide-react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/lib/api';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Icon } from '../../src/components/Icon';
import { Pressable } from '../../src/design-system/primitives/Pressable';
import { StreakCard } from '../../src/features/progress/StreakCard';
import { StreakHeatmap } from '../../src/features/progress/StreakHeatmap';
import { VolumeComparison } from '../../src/features/progress/VolumeComparison';
import { MonthlyRecap, MonthlyRecapPayload } from '../../src/features/progress/MonthlyRecap';
import { GoalsList } from '../../src/features/goals/GoalsList';
import { colors, spacing, radii } from '../../src/theme/tokens';

interface CalendarDay {
  date: string;
  workout_ids?: string[];
  set_count?: number;
  muscle_groups?: string[];
}

interface StatsData {
  current_streak?: number;
  current_streak_weeks?: number;
  longest_streak?: number;
  longest_streak_weeks?: number;
  last_workout_at?: string | null;
  total_volume_kg?: number;
  comparison_label?: string | null;
}

interface AnalyticsAll {
  total_volume_kg: number;
  comparison_label?: string | null;
  gym_volume_percentile?: number | null;
}

interface RecapResp {
  recap: {
    period_key: string;
    period_label?: string;
    payload: MonthlyRecapPayload;
  } | null;
}

export default function ProgressScreen() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [allAnalytics, setAllAnalytics] = useState<AnalyticsAll | null>(null);
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [latestRecap, setLatestRecap] = useState<RecapResp['recap']>(null);
  const [recapOpen, setRecapOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const today = new Date();
      const start = new Date(today.getTime() - 12 * 7 * 86400000)
        .toISOString().slice(0, 10);
      const end = today.toISOString().slice(0, 10);
      const [statsRes, allRes, calRes, recapRes] = await Promise.allSettled([
        api.get<{ data: StatsData }>(`/users/${userId}/stats`),
        api.get<{ data: AnalyticsAll }>('/analytics/all?period=30d'),
        api.get<{ data: { days: CalendarDay[] } }>(
          `/workouts/calendar?start=${start}&end=${end}&include=set_counts,muscles`,
        ),
        api.get<{ data: RecapResp }>('/recaps/latest'),
      ]);
      if (statsRes.status === 'fulfilled') setStats((statsRes.value as any).data);
      if (allRes.status === 'fulfilled') setAllAnalytics((allRes.value as any).data);
      if (calRes.status === 'fulfilled') setCalendar((calRes.value as any).data?.days ?? []);
      if (recapRes.status === 'fulfilled') {
        const data = (recapRes.value as any).data;
        setLatestRecap(data?.recap ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) fetchAll(user.id);
    }, [user?.id, fetchAll])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.brandDisplay} />
        </View>
      </SafeAreaView>
    );
  }

  const streakStats = stats
    ? {
        current_streak_weeks: stats.current_streak_weeks ?? stats.current_streak ?? 0,
        longest_streak_weeks: stats.longest_streak_weeks ?? stats.longest_streak ?? null,
        last_workout_at: stats.last_workout_at ?? null,
      }
    : null;

  const heatmapDays = calendar.map(c => ({
    date: c.date,
    set_count: c.set_count,
    muscle_groups: c.muscle_groups,
  }));

  const screenWidth = Dimensions.get('window').width;
  const horizontalPad = spacing.base * 2;
  const availWidth = screenWidth - horizontalPad;
  // 12 cols * (cell + gap) - last gap == availWidth
  // cell = (availWidth + gap) / 12 - gap
  const HEATMAP_CELL = 14;
  const HEATMAP_GAP = Math.max(2, Math.floor((availWidth - 12 * HEATMAP_CELL) / 11));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.topBar}>
          <Text variant="title2" color="textPrimary">Progress</Text>
        </View>

        {/* Streak card */}
        <View style={styles.section}>
          <StreakCard stats={streakStats} />
        </View>

        {/* Streak heatmap */}
        <View style={styles.section}>
          <Surface level={2} style={styles.heatmapCard}>
            <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.sm }}>
              CONSISTENCY -- LAST 12 WEEKS
            </Text>
            <StreakHeatmap days={heatmapDays} weeks={12} />
            <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.sm }}>
              Tap a cell to view that day's workouts.
            </Text>
          </Surface>
        </View>

        {/* Volume comparison */}
        {allAnalytics ? (
          <View style={styles.section}>
            <VolumeComparison
              totalVolumeKg={allAnalytics.total_volume_kg ?? 0}
              comparisonLabel={allAnalytics.comparison_label ?? null}
              gymPercentile={allAnalytics.gym_volume_percentile ?? null}
            />
          </View>
        ) : null}

        {/* Monthly recap entry */}
        {latestRecap ? (
          <Pressable
            onPress={() => setRecapOpen(true)}
            style={styles.section}
            accessibilityLabel="Open monthly recap"
          >
            <Surface level={2} style={styles.recapCard}>
              <View style={styles.recapBadge}>
                <Text variant="overline" style={{ color: colors.brandText }}>RECAP</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyEmphasis" color="textPrimary">
                  {latestRecap.payload?.period_label ?? 'Recent recap'}
                </Text>
                <Text variant="caption" color="textTertiary">
                  Your month under the bar. Tap to view.
                </Text>
              </View>
              <Icon icon={ChevronRight} size={16} color={colors.textTertiary} />
            </Surface>
          </Pressable>
        ) : null}

        {/* Goals */}
        <View style={styles.section}>
          <GoalsList />
        </View>

        {/* Body trends + Adherence shortcut */}
        <View style={styles.section}>
          <Pressable
            onPress={() => router.push('/analytics/measurements' as any)}
            accessibilityLabel="Open body trends"
          >
            <Surface level={2} style={styles.navCard}>
              <View style={styles.navIcon}>
                <Icon icon={Scale} size={18} color={colors.brandText} strokeWidth={1.6} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyEmphasis" color="textPrimary">Body trends</Text>
                <Text variant="caption" color="textTertiary">
                  Per-metric chart + before/after photos
                </Text>
              </View>
              <Icon icon={ChevronRight} size={16} color={colors.textTertiary} />
            </Surface>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Pressable
            onPress={() => router.push('/(tabs)/trainer' as any)}
            accessibilityLabel="Open trainer adherence"
          >
            <Surface level={2} style={styles.navCard}>
              <View style={styles.navIcon}>
                <Icon icon={Activity} size={18} color={colors.brandText} strokeWidth={1.6} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyEmphasis" color="textPrimary">Adherence</Text>
                <Text variant="caption" color="textTertiary">
                  Sessions completed vs prescribed this month
                </Text>
              </View>
              <Icon icon={ChevronRight} size={16} color={colors.textTertiary} />
            </Surface>
          </Pressable>
        </View>

        {/* Deep link to analytics */}
        <Pressable
          onPress={() => router.push('/analytics' as any)}
          style={[styles.mx, { marginBottom: spacing.lg }]}
          accessibilityLabel="Open analytics"
        >
          <Surface level={2} style={styles.navCard}>
            <View style={[styles.navIcon, { backgroundColor: colors.brandGlow }]}>
              <Icon icon={Activity} size={18} color={colors.brandDisplay} strokeWidth={1.6} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyEmphasis" color="textPrimary">Full analytics</Text>
              <Text variant="caption" color="textTertiary">
                Volume curve, top lifts, strength levels
              </Text>
            </View>
            <Icon icon={ChevronRight} size={16} color={colors.textTertiary} />
          </Surface>
        </Pressable>
      </ScrollView>

      {latestRecap ? (
        <MonthlyRecap
          visible={recapOpen}
          payload={latestRecap.payload}
          handle={user?.username ?? undefined}
          gymName={undefined}
          onDismiss={() => setRecapOpen(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  section: { marginHorizontal: spacing.base, marginTop: spacing.base },
  heatmapCard: { padding: spacing.base, borderRadius: radii.lg },
  recapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radii.lg,
  },
  recapBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: colors.brandGlow,
    borderWidth: 1,
    borderColor: colors.brandText,
  },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radii.lg,
  },
  navIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.brandGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mx: { marginHorizontal: spacing.base },
});
