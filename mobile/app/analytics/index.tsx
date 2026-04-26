import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Dumbbell, Weight, Clock, Hash, Flame, ChevronRight } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Icon } from '../../src/components/Icon';
import { StatCard } from '../../src/components/StatCard';
import { Pressable } from '../../src/components/Pressable';
import { Sheet } from '../../src/components/Sheet';
import { Button } from '../../src/components/Button';
import { colors, spacing, radii } from '../../src/theme/tokens';

type Period = '30d' | '3m' | '1y' | 'all';

interface StatsResponse {
  overview: {
    total_workouts: number;
    total_volume_kg: number;
    total_duration_seconds: number;
    total_sets: number;
  };
  last_7_days: {
    date: string;
    workout_ids: string[];
    muscles: string[];
  }[];
  muscle_sets: { muscle: string; sets: number }[];
  top_exercises: { exercise_id: string; exercise_name: string; times_logged: number }[];
  strength_levels: {
    exercise_name: string;
    wger_id: number;
    projected_1rm_kg: number | null;
    level: string | null;
  }[];
  current_streak_weeks: number;
  volume_comparison: { label: string; kg: number } | null;
}

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: '30 Days', value: '30d' },
  { label: '3 Months', value: '3m' },
  { label: '1 Year', value: '1y' },
  { label: 'All Time', value: 'all' },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const LEVEL_COLORS: Record<string, string> = {
  Beginner:     colors.info,
  Intermediate: colors.success,
  Advanced:     colors.brand,
  Elite:        colors.setDropset,
};

function formatVolume(kg: number): string {
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)}k` : kg.toLocaleString('en-US');
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function abbreviateMuscle(muscle: string): string {
  const map: Record<string, string> = {
    chest: 'Chest', back: 'Back', shoulders: 'Delts', biceps: 'Bis',
    triceps: 'Tris', legs: 'Legs', quads: 'Quads', hamstrings: 'Hams',
    glutes: 'Glutes', calves: 'Calves', abs: 'Abs', core: 'Core',
    forearms: 'Fore', traps: 'Traps', lats: 'Lats',
  };
  return map[muscle.toLowerCase()] ?? muscle.slice(0, 5);
}

export default function AnalyticsScreen() {
  const [period, setPeriod] = useState<Period>('30d');
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [sheetWorkoutIds, setSheetWorkoutIds] = useState<string[]>([]);
  const [sheetVisible, setSheetVisible] = useState(false);

  const fetchStats = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const res = await api.get<{ data: StatsResponse }>(`/analytics/stats?period=${p}`);
      setStats(res.data);
    } catch {
      Alert.alert('Error', 'Could not load analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(period); }, [period, fetchStats]);

  const last7Days = (() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const dateStr = d.toISOString().slice(0, 10);
      const entry = stats?.last_7_days.find((e) => e.date === dateStr) ?? null;
      return { dayLabel: DAY_LABELS[d.getDay()], dateNum: d.getDate(), entry };
    });
  })();

  const topMuscles = stats
    ? [...stats.muscle_sets].sort((a, b) => b.sets - a.sets).slice(0, 8)
    : [];

  const strengthWithLevel = stats?.strength_levels.filter((s) => s.level !== null) ?? [];

  function handleDayPress(entry: StatsResponse['last_7_days'][number]) {
    if (entry.workout_ids.length === 1) {
      router.push(`/workouts/${entry.workout_ids[0]}`);
    } else {
      setSheetWorkoutIds(entry.workout_ids);
      setSheetVisible(true);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="title1" color="textPrimary">Progress</Text>
          <Pressable
            onPress={() => router.push('/analytics/measurements')}
            style={styles.measureBtn}
            accessibilityLabel="Body measurements"
          >
            <Icon icon={Weight} size={16} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Period filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.periodScroll}
          contentContainerStyle={styles.periodContent}
        >
          {PERIOD_OPTIONS.map((opt) => {
            const active = opt.value === period;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setPeriod(opt.value)}
                style={[styles.periodChip, active && styles.periodChipActive]}
                accessibilityLabel={opt.label}
              >
                <Text variant="label" color={active ? 'textPrimary' : 'textTertiary'}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {stats && (
          <>
            {/* Overview 2×2 */}
            <View style={styles.section}>
              <View style={styles.overviewGrid}>
                <StatCard label="Workouts" value={stats.overview.total_workouts} icon={Dumbbell} compact />
                <StatCard label="Volume" value={formatVolume(stats.overview.total_volume_kg)} unit="kg" icon={Weight} compact />
              </View>
              <View style={[styles.overviewGrid, { marginTop: spacing.sm }]}>
                <StatCard label="Duration" value={formatDuration(stats.overview.total_duration_seconds)} icon={Clock} compact />
                <StatCard label="Sets" value={stats.overview.total_sets} icon={Hash} compact />
              </View>
            </View>

            {/* Streak */}
            <View style={styles.section}>
              <Surface level={2} style={[styles.streakCard, stats.current_streak_weeks > 0 && { borderColor: colors.brand, borderWidth: 1 }]}>
                <View style={styles.streakRow}>
                  <Icon icon={Flame} size={20} color={stats.current_streak_weeks > 0 ? colors.brand : colors.textTertiary} />
                  <Text variant="bodyEmphasis" color={stats.current_streak_weeks > 0 ? 'textPrimary' : 'textTertiary'} style={{ marginLeft: spacing.sm }}>
                    {stats.current_streak_weeks > 0
                      ? `${stats.current_streak_weeks} week streak`
                      : 'Start your streak this week'}
                  </Text>
                </View>
              </Surface>
            </View>

            {/* Volume comparison */}
            {stats.volume_comparison && (
              <View style={styles.section}>
                <Surface level={2} style={styles.compCard}>
                  <Text variant="body" color="textSecondary">
                    You lifted as much as{' '}
                    <Text variant="bodyEmphasis" color="brand">{stats.volume_comparison.label}</Text>
                  </Text>
                </Surface>
              </View>
            )}

            {/* Last 7 Days */}
            <View style={styles.section}>
              <Text variant="overline" color="textTertiary" style={styles.sectionLabel}>Last 7 Days</Text>
              <View style={styles.daysRow}>
                {last7Days.map(({ dayLabel, dateNum, entry }, idx) => {
                  const hasWorkouts = !!(entry && entry.workout_ids.length > 0);
                  return (
                    <Pressable
                      key={idx}
                      style={styles.dayCol}
                      onPress={() => { if (hasWorkouts && entry) handleDayPress(entry); }}
                      accessibilityLabel={`${dayLabel} ${dateNum}${hasWorkouts ? ', has workouts' : ''}`}
                    >
                      <Text variant="overline" color="textTertiary" style={styles.dayLabel}>{dayLabel}</Text>
                      <View style={[styles.dayDot, hasWorkouts ? styles.dayDotActive : styles.dayDotEmpty]}>
                        <Text variant="label" color={hasWorkouts ? 'textPrimary' : 'textDisabled'}>{dateNum}</Text>
                      </View>
                      {hasWorkouts && entry && entry.muscles.slice(0, 1).map((m, mi) => (
                        <Text key={mi} variant="overline" color="textTertiary" style={styles.muscleLabel} numberOfLines={1}>
                          {abbreviateMuscle(m)}
                        </Text>
                      ))}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Muscle Sets */}
            <View style={styles.section}>
              <Text variant="overline" color="textTertiary" style={styles.sectionLabel}>Muscle Sets</Text>
              {topMuscles.length === 0 ? (
                <Surface level={2} style={styles.emptyCard}>
                  <Text variant="body" color="textTertiary">No data for this period</Text>
                </Surface>
              ) : (
                <Surface level={2} style={styles.barsCard}>
                  {(() => {
                    const maxSets = Math.max(...topMuscles.map(m => m.sets), 1);
                    return topMuscles.map((m) => (
                      <View key={m.muscle} style={styles.barRow}>
                        <Text variant="caption" color="textTertiary" style={styles.barLabel} numberOfLines={1}>
                          {abbreviateMuscle(m.muscle)}
                        </Text>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: `${(m.sets / maxSets) * 100}%` as any }]} />
                        </View>
                        <Text variant="caption" color="textSecondary" style={styles.barCount}>{m.sets}</Text>
                      </View>
                    ));
                  })()}
                </Surface>
              )}
            </View>

            {/* Top Exercises */}
            {stats.top_exercises.length > 0 && (
              <View style={styles.section}>
                <Text variant="overline" color="textTertiary" style={styles.sectionLabel}>Top Exercises</Text>
                <Surface level={2}>
                  {stats.top_exercises.slice(0, 5).map((ex, idx) => (
                    <View
                      key={ex.exercise_id}
                      style={[styles.exRow, idx < Math.min(stats.top_exercises.length, 5) - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                    >
                      <Text variant="bodyEmphasis" color="brand" style={styles.exRank}>{idx + 1}</Text>
                      <Text variant="body" color="textPrimary" style={{ flex: 1 }} numberOfLines={1}>{ex.exercise_name}</Text>
                      <View style={styles.exBadge}>
                        <Text variant="caption" color="textTertiary">{ex.times_logged}×</Text>
                      </View>
                    </View>
                  ))}
                </Surface>
              </View>
            )}

            {/* Strength Levels */}
            {strengthWithLevel.length > 0 && (
              <View style={styles.section}>
                <Text variant="overline" color="textTertiary" style={styles.sectionLabel}>Strength Levels</Text>
                <Surface level={2}>
                  {strengthWithLevel.map((sl, idx) => {
                    const levelColor = sl.level ? (LEVEL_COLORS[sl.level] ?? colors.textTertiary) : colors.textTertiary;
                    return (
                      <View
                        key={sl.wger_id}
                        style={[styles.levelRow, idx < strengthWithLevel.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                      >
                        <Text variant="body" color="textPrimary" style={{ flex: 1 }} numberOfLines={1}>{sl.exercise_name}</Text>
                        <View style={[styles.levelBadge, { backgroundColor: levelColor + '33' }]}>
                          <Text variant="overline" style={{ color: levelColor }}>{sl.level}</Text>
                        </View>
                        {sl.projected_1rm_kg != null && (
                          <Text variant="caption" color="textTertiary" style={{ marginLeft: spacing.sm }}>
                            1RM: {sl.projected_1rm_kg.toFixed(1)} kg
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </Surface>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Workout day sheet */}
      <Sheet visible={sheetVisible} onClose={() => setSheetVisible(false)}>
        <Text variant="title3" color="textPrimary" style={{ marginBottom: spacing.base }}>Workouts that day</Text>
        {sheetWorkoutIds.map((id, idx) => (
          <Pressable
            key={id}
            style={[styles.sheetRow, idx < sheetWorkoutIds.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
            onPress={() => { setSheetVisible(false); router.push(`/workouts/${id}`); }}
            accessibilityLabel={`Workout ${idx + 1}`}
          >
            <Text variant="body" color="textPrimary" style={{ flex: 1 }}>Workout {idx + 1}</Text>
            <Icon icon={ChevronRight} size={16} color={colors.textTertiary} />
          </Pressable>
        ))}
        <View style={{ marginTop: spacing.base }}>
          <Button label="Close" onPress={() => setSheetVisible(false)} variant="secondary" size="md" fullWidth />
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  measureBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodScroll: { marginBottom: spacing.lg },
  periodContent: { paddingHorizontal: spacing.base, gap: spacing.sm },
  periodChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.surface2,
  },
  periodChipActive: { backgroundColor: colors.brand },
  section: { paddingHorizontal: spacing.base, marginBottom: spacing.lg },
  sectionLabel: { marginBottom: spacing.sm },
  overviewGrid: { flexDirection: 'row', gap: spacing.sm },
  streakCard: { padding: spacing.base },
  streakRow: { flexDirection: 'row', alignItems: 'center' },
  compCard: { padding: spacing.base },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', flex: 1 },
  dayLabel: { marginBottom: spacing.xs, fontSize: 10 },
  dayDot: { width: 36, height: 36, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  dayDotActive: { backgroundColor: colors.brand },
  dayDotEmpty: { backgroundColor: colors.surface2 },
  muscleLabel: { fontSize: 8, marginTop: 2 },
  emptyCard: { padding: spacing.xl, alignItems: 'center' },
  barsCard: { padding: spacing.base, gap: spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center' },
  barLabel: { width: 48 },
  barTrack: { flex: 1, height: 6, backgroundColor: colors.surface3, borderRadius: radii.full, overflow: 'hidden', marginHorizontal: spacing.sm },
  barFill: { height: '100%', backgroundColor: colors.brand, borderRadius: radii.full },
  barCount: { width: 24, textAlign: 'right' },
  exRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.md, gap: spacing.md },
  exRank: { width: 20 },
  exBadge: {
    backgroundColor: colors.surface3,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  levelRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  levelBadge: { borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  sheetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
});
