import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/authStore';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: '30 Days', value: '30d' },
  { label: '3 Months', value: '3m' },
  { label: '1 Year', value: '1y' },
  { label: 'All Time', value: 'all' },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatVolume(kg: number): string {
  return kg.toLocaleString('en-US') + ' kg';
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function abbreviateMuscle(muscle: string): string {
  const map: Record<string, string> = {
    chest: 'Chest',
    back: 'Back',
    shoulders: 'Delts',
    biceps: 'Bis',
    triceps: 'Tris',
    legs: 'Legs',
    quads: 'Quads',
    hamstrings: 'Hams',
    glutes: 'Glutes',
    calves: 'Calves',
    abs: 'Abs',
    core: 'Core',
    forearms: 'Fore',
    traps: 'Traps',
    lats: 'Lats',
  };
  const key = muscle.toLowerCase();
  return map[key] ?? muscle.slice(0, 5);
}

const LEVEL_COLORS: Record<string, string> = {
  Beginner: '#3B82F6',
  Intermediate: '#22C55E',
  Advanced: '#FF6B35',
  Elite: '#A855F7',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function OverviewCard({
  emoji,
  value,
  label,
}: {
  emoji: string;
  value: string;
  label: string;
}) {
  return (
    <View className="bg-gray-900 rounded-xl p-4 flex-1 mx-1">
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text
        className="text-white font-bold mt-2"
        style={{ fontSize: 22 }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text className="text-gray-400 mt-1" style={{ fontSize: 12 }}>
        {label}
      </Text>
    </View>
  );
}

function WorkoutDayModal({
  visible,
  workoutIds,
  onClose,
}: {
  visible: boolean;
  workoutIds: string[];
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 bg-black/70 justify-end"
        onPress={onClose}
      >
        <Pressable className="bg-gray-900 rounded-t-2xl p-6">
          <Text className="text-white font-bold text-lg mb-4">
            Workouts that day
          </Text>
          {workoutIds.map((id, idx) => (
            <Pressable
              key={id}
              className="flex-row items-center py-3 border-b border-gray-800"
              onPress={() => {
                onClose();
                router.push(`/workouts/${id}`);
              }}
            >
              <Text className="text-gray-400 mr-3" style={{ fontSize: 15 }}>
                {idx + 1}.
              </Text>
              <Text className="text-white flex-1" style={{ fontSize: 15 }}>
                Workout {idx + 1}
              </Text>
              <Text className="text-gray-500" style={{ fontSize: 18 }}>
                ›
              </Text>
            </Pressable>
          ))}
          <Pressable
            className="mt-4 rounded-xl py-3 items-center"
            style={{ backgroundColor: '#FF6B35' }}
            onPress={onClose}
          >
            <Text className="text-white font-bold">Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState<Period>('30d');
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalWorkoutIds, setModalWorkoutIds] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

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

  useEffect(() => {
    fetchStats(period);
  }, [period, fetchStats]);

  // Prepare last-7-days columns aligned to Sun–Sat
  const last7Days = (() => {
    const today = new Date();
    const cols: {
      dayLabel: string;
      dateNum: number;
      entry: StatsResponse['last_7_days'][number] | null;
    }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const entry = stats?.last_7_days.find((e) => e.date === dateStr) ?? null;
      cols.push({
        dayLabel: DAY_LABELS[d.getDay()],
        dateNum: d.getDate(),
        entry,
      });
    }
    return cols;
  })();

  // Muscle sets — top 8 by count
  const topMuscles = stats
    ? [...stats.muscle_sets]
        .sort((a, b) => b.sets - a.sets)
        .slice(0, 8)
    : [];

  const chartData = topMuscles.map((m) => ({
    x: abbreviateMuscle(m.muscle),
    y: m.sets,
  }));

  const strengthWithLevel = stats?.strength_levels.filter((s) => s.level !== null) ?? [];

  function handleDayPress(entry: StatsResponse['last_7_days'][number]) {
    if (entry.workout_ids.length === 1) {
      router.push(`/workouts/${entry.workout_ids[0]}`);
    } else {
      setModalWorkoutIds(entry.workout_ids);
      setModalVisible(true);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-950"
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="px-4 pt-14 pb-4">
        <Text className="text-white font-bold" style={{ fontSize: 28 }}>
          Progress
        </Text>
      </View>

      {/* Period filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-4 mb-5"
        contentContainerStyle={{ gap: 8 }}
      >
        {PERIOD_OPTIONS.map((opt) => {
          const active = opt.value === period;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setPeriod(opt.value)}
              className="rounded-full px-4 py-2"
              style={{ backgroundColor: active ? '#FF6B35' : '#1F2937' }}
            >
              <Text
                className="font-semibold"
                style={{ color: active ? '#FFFFFF' : '#9CA3AF', fontSize: 14 }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading && (
        <View className="px-4 mb-4">
          <Text className="text-gray-500 text-center">Loading…</Text>
        </View>
      )}

      {stats && (
        <>
          {/* Overview cards 2×2 */}
          <View className="px-4 mb-4">
            <View className="flex-row mb-3">
              <OverviewCard
                emoji="🏋️"
                value={String(stats.overview.total_workouts)}
                label="Total Workouts"
              />
              <OverviewCard
                emoji="📦"
                value={formatVolume(stats.overview.total_volume_kg)}
                label="Total Volume"
              />
            </View>
            <View className="flex-row">
              <OverviewCard
                emoji="⏱️"
                value={formatDuration(stats.overview.total_duration_seconds)}
                label="Total Duration"
              />
              <OverviewCard
                emoji="🔢"
                value={String(stats.overview.total_sets)}
                label="Total Sets"
              />
            </View>
          </View>

          {/* Streak card */}
          <View
            className="mx-4 mb-4 rounded-xl p-4 bg-gray-900"
            style={{ borderWidth: 1, borderColor: '#FF6B35' }}
          >
            {stats.current_streak_weeks > 0 ? (
              <Text className="text-white font-bold text-base">
                🔥 {stats.current_streak_weeks} week streak
              </Text>
            ) : (
              <Text className="text-gray-300 font-semibold text-base">
                Start your streak this week!
              </Text>
            )}
          </View>

          {/* Volume comparison */}
          {stats.volume_comparison && (
            <View className="mx-4 mb-4 rounded-xl p-4 bg-gray-900">
              <Text className="text-white font-semibold text-base">
                You lifted as much as{' '}
                <Text style={{ color: '#FF6B35' }}>{stats.volume_comparison.label}</Text>!
              </Text>
            </View>
          )}

          {/* Last 7 Days */}
          <View className="px-4 mb-6">
            <Text className="text-white font-bold text-base mb-3">Last 7 Days</Text>
            <View className="flex-row justify-between">
              {last7Days.map(({ dayLabel, dateNum, entry }, idx) => {
                const hasWorkouts = entry && entry.workout_ids.length > 0;
                return (
                  <Pressable
                    key={idx}
                    className="items-center flex-1"
                    onPress={() => {
                      if (hasWorkouts && entry) handleDayPress(entry);
                    }}
                    disabled={!hasWorkouts}
                  >
                    <Text className="text-gray-500 mb-1" style={{ fontSize: 11 }}>
                      {dayLabel}
                    </Text>
                    <View
                      className="rounded-full items-center justify-center"
                      style={{
                        width: 38,
                        height: 38,
                        backgroundColor: hasWorkouts ? '#FF6B35' : '#1F2937',
                      }}
                    >
                      <Text
                        style={{
                          color: hasWorkouts ? '#FFFFFF' : '#6B7280',
                          fontSize: 13,
                          fontWeight: '600',
                        }}
                      >
                        {dateNum}
                      </Text>
                    </View>
                    {hasWorkouts && entry && (
                      <>
                        {entry.workout_ids.length > 1 && (
                          <View
                            className="rounded-full px-1 mt-1"
                            style={{ backgroundColor: '#7C3AED' }}
                          >
                            <Text style={{ color: '#fff', fontSize: 9 }}>
                              ×{entry.workout_ids.length}
                            </Text>
                          </View>
                        )}
                        {entry.muscles.slice(0, 2).map((m, mi) => (
                          <Text
                            key={mi}
                            className="text-gray-400 text-center"
                            style={{ fontSize: 8 }}
                            numberOfLines={1}
                          >
                            {abbreviateMuscle(m)}
                          </Text>
                        ))}
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Muscle Sets Bar Chart */}
          <View className="px-4 mb-6">
            <Text className="text-white font-bold text-base mb-3">Muscle Sets</Text>
            {topMuscles.length === 0 ? (
              <View className="bg-gray-900 rounded-xl p-6 items-center">
                <Text className="text-gray-500">No data for this period</Text>
              </View>
            ) : (
              <View className="bg-gray-900 rounded-xl p-4">
                {(() => {
                  const maxSets = Math.max(...topMuscles.map(m => m.sets), 1);
                  return topMuscles.map((m, i) => (
                    <View key={m.muscle} className="flex-row items-center mb-2">
                      <Text className="text-gray-400 text-xs w-16" numberOfLines={1}>
                        {abbreviateMuscle(m.muscle)}
                      </Text>
                      <View className="flex-1 h-5 bg-gray-800 rounded-full overflow-hidden mx-2">
                        <View
                          className="h-full rounded-full"
                          style={{ width: `${(m.sets / maxSets) * 100}%`, backgroundColor: '#FF6B35' }}
                        />
                      </View>
                      <Text className="text-gray-300 text-xs w-8 text-right">{m.sets}</Text>
                    </View>
                  ));
                })()}
              </View>
            )}
          </View>

          {/* Top Exercises */}
          {stats.top_exercises.length > 0 && (
            <View className="px-4 mb-6">
              <Text className="text-white font-bold text-base mb-3">Top Exercises</Text>
              <View className="bg-gray-900 rounded-xl overflow-hidden">
                {stats.top_exercises.slice(0, 5).map((ex, idx) => (
                  <View
                    key={ex.exercise_id}
                    className="flex-row items-center px-4 py-3"
                    style={
                      idx < Math.min(stats.top_exercises.length, 5) - 1
                        ? { borderBottomWidth: 1, borderBottomColor: '#1F2937' }
                        : undefined
                    }
                  >
                    <Text
                      className="font-bold mr-3"
                      style={{ color: '#FF6B35', fontSize: 15, width: 20 }}
                    >
                      {idx + 1}
                    </Text>
                    <Text className="text-white flex-1" style={{ fontSize: 14 }}>
                      {ex.exercise_name}
                    </Text>
                    <View className="rounded-full px-2 py-0.5 bg-gray-700">
                      <Text className="text-gray-300" style={{ fontSize: 12 }}>
                        {ex.times_logged}×
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Strength Levels */}
          {strengthWithLevel.length > 0 && (
            <View className="px-4 mb-6">
              <Text className="text-white font-bold text-base mb-3">Strength Levels</Text>
              {strengthWithLevel.every(sl => sl.level === null) ? (
                <Pressable
                  className="bg-gray-900 rounded-xl p-4"
                  onPress={() => router.push('/analytics/measurements')}
                >
                  <Text className="text-white font-semibold text-sm">
                    Add your bodyweight to unlock strength levels
                  </Text>
                  <Text className="text-gray-500 text-xs mt-1">Tap to go to measurements →</Text>
                </Pressable>
              ) : (
                <View className="bg-gray-900 rounded-xl overflow-hidden">
                  {strengthWithLevel.map((sl, idx) => {
                    const levelColor = sl.level ? (LEVEL_COLORS[sl.level] ?? '#9CA3AF') : '#9CA3AF';
                    return (
                      <View
                        key={sl.wger_id}
                        className="flex-row items-center px-4 py-3"
                        style={
                          idx < strengthWithLevel.length - 1
                            ? { borderBottomWidth: 1, borderBottomColor: '#1F2937' }
                            : undefined
                        }
                      >
                        <Text className="text-white flex-1 text-sm" numberOfLines={1}>
                          {sl.exercise_name}
                        </Text>
                        <View
                          className="rounded-full px-2 py-0.5 mr-2"
                          style={{ backgroundColor: levelColor + '33' }}
                        >
                          <Text style={{ color: levelColor, fontSize: 11, fontWeight: '600' }}>
                            {sl.level}
                          </Text>
                        </View>
                        {sl.projected_1rm_kg != null && (
                          <Text className="text-gray-400" style={{ fontSize: 12 }}>
                            1RM: {sl.projected_1rm_kg.toFixed(1)} kg
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </>
      )}

      <WorkoutDayModal
        visible={modalVisible}
        workoutIds={modalWorkoutIds}
        onClose={() => setModalVisible(false)}
      />
    </ScrollView>
  );
}
