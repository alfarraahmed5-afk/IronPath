import { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trophy, Calendar, Clock, Weight, Hash } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { Header } from '../../src/components/Header';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Icon } from '../../src/components/Icon';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, spacing, radii } from '../../src/theme/tokens';

interface CompletedSet {
  position: number;
  set_type: string;
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  is_completed: boolean;
}

interface WorkoutExercise {
  exercise_id: string;
  exercise: { id: string; name: string; logging_type: string; image_url?: string | null } | null;
  position: number;
  sets: CompletedSet[];
}

interface PersonalRecord {
  exercise_id: string;
  record_type: string;
  value: number;
}

interface WorkoutDetail {
  id: string;
  name: string;
  description: string | null;
  started_at: string;
  duration_seconds: number;
  total_volume_kg: number;
  total_sets: number;
  exercises: WorkoutExercise[];
  personal_records: PersonalRecord[];
}

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

const RECORD_LABELS: Record<string, string> = {
  weight: 'Max Weight', reps: 'Max Reps', volume: 'Max Volume',
  distance: 'Max Distance', duration: 'Max Duration',
};

const SET_TYPE_COLORS: Record<string, string> = {
  normal:  colors.textTertiary,
  warmup:  colors.info,
  dropset: '#8B5CF6',
  failure: colors.danger,
};

function formatSetDisplay(set: CompletedSet, loggingType: string): string {
  if (loggingType === 'weight_reps' || loggingType === 'bodyweight_reps') {
    if (set.weight_kg !== null && set.reps !== null) return `${set.weight_kg} kg × ${set.reps}`;
    if (set.reps !== null) return `${set.reps} reps`;
    if (set.weight_kg !== null) return `${set.weight_kg} kg`;
  }
  if (loggingType === 'duration' && set.duration_seconds !== null) {
    const m = Math.floor(set.duration_seconds / 60);
    const s = set.duration_seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  if (loggingType === 'distance' && set.distance_meters !== null) return `${set.distance_meters}m`;
  return '—';
}

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/workouts');
  }

  useEffect(() => {
    if (!id) {
      router.replace('/(tabs)/workouts');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    api.get<{ data: WorkoutDetail }>(`/workouts/${id}`)
      .then(r => {
        if (r?.data) setWorkout(r.data);
        else setErrorMsg('Empty response from server');
      })
      .catch((e: any) => {
        // Don't auto-navigate. Show the error so the user can act on it.
        setErrorMsg(e?.error?.message ?? e?.message ?? 'Could not load workout');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={[styles.root, styles.centered]}>
        <EmptyState
          illustration="404"
          title={errorMsg ?? 'Workout not found'}
          description={errorMsg ? 'The workout could not be loaded.' : undefined}
          action={{ label: 'Go back', onPress: goBack }}
        />
      </View>
    );
  }

  const prs = workout.personal_records ?? [];

  return (
    <View style={styles.root}>
      <Header title={workout.name} back />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Date + duration */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Icon icon={Calendar} size={14} color={colors.textTertiary} />
            <Text variant="caption" color="textSecondary">{formatDate(workout.started_at)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Icon icon={Clock} size={14} color={colors.textTertiary} />
            <Text variant="caption" color="textSecondary">{formatDuration(workout.duration_seconds)}</Text>
          </View>
        </View>

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          <Surface level={2} style={styles.statCell}>
            <Text variant="numeric" color="textPrimary">{workout.total_volume_kg.toLocaleString()}</Text>
            <Text variant="overline" color="textTertiary">kg volume</Text>
          </Surface>
          <Surface level={2} style={styles.statCell}>
            <Text variant="numeric" color="textPrimary">{workout.total_sets}</Text>
            <Text variant="overline" color="textTertiary">sets</Text>
          </Surface>
        </View>

        {/* PRs */}
        {prs.length > 0 && (
          <View style={styles.section}>
            <Surface level={2} style={[styles.prCard, { borderColor: colors.brand }]}>
              <View style={styles.prHeader}>
                <Icon icon={Trophy} size={18} color={colors.brand} />
                <Text variant="title3" color="brand" style={{ marginLeft: spacing.sm }}>Personal Records</Text>
              </View>
              {prs.map((pr, i) => {
                const exName = workout.exercises.find(e => e.exercise_id === pr.exercise_id)?.exercise?.name ?? '';
                return (
                  <View key={i} style={[styles.prRow, i < prs.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                    <Text variant="body" color="textSecondary">{exName}</Text>
                    <Text variant="bodyEmphasis" color="brand">{RECORD_LABELS[pr.record_type] ?? pr.record_type}: {pr.value}</Text>
                  </View>
                );
              })}
            </Surface>
          </View>
        )}

        {/* Exercises */}
        <View style={styles.section}>
          {workout.exercises.map(exercise => {
            const completedSets = exercise.sets.filter(s => s.is_completed);
            if (completedSets.length === 0) return null;
            const loggingType = exercise.exercise?.logging_type ?? 'weight_reps';

            return (
              <Surface key={exercise.position} level={2} style={styles.exerciseCard}>
                <Text variant="title3" color="textPrimary" style={styles.exerciseName}>
                  {exercise.exercise?.name ?? 'Exercise'}
                </Text>

                {/* Column headers */}
                <View style={styles.setHeaderRow}>
                  <Text variant="overline" color="textTertiary" style={{ width: 32 }}>SET</Text>
                  <Text variant="overline" color="textTertiary" style={{ width: 64 }}>TYPE</Text>
                  <Text variant="overline" color="textTertiary" style={{ flex: 1, textAlign: 'right' }}>RESULT</Text>
                </View>

                {completedSets.map((set, idx) => (
                  <View key={set.position} style={[styles.setRow, idx < completedSets.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                    <Text variant="label" color="textTertiary" style={{ width: 32 }}>{idx + 1}</Text>
                    <View style={[styles.typePill, { backgroundColor: (SET_TYPE_COLORS[set.set_type] ?? colors.textTertiary) + '20', width: 64 }]}>
                      <Text variant="overline" style={{ color: SET_TYPE_COLORS[set.set_type] ?? colors.textTertiary, fontSize: 9 }}>
                        {set.set_type.toUpperCase()}
                      </Text>
                    </View>
                    <Text variant="bodyEmphasis" color="textPrimary" style={{ flex: 1, textAlign: 'right' }}>
                      {formatSetDisplay(set, loggingType)}
                    </Text>
                  </View>
                ))}
              </Surface>
            );
          })}
        </View>

        {workout.description ? (
          <View style={styles.section}>
            <Text variant="caption" color="textSecondary">{workout.description}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', gap: spacing.lg, paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statsStrip: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.base, marginBottom: spacing.base },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: spacing.base, gap: spacing.xxs },
  section: { paddingHorizontal: spacing.base, marginBottom: spacing.base },
  prCard: { padding: spacing.base, borderWidth: 1, borderRadius: radii.lg },
  prHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  prRow: { paddingVertical: spacing.sm, gap: spacing.xxs },
  exerciseCard: { padding: spacing.base, marginBottom: spacing.sm },
  exerciseName: { marginBottom: spacing.md },
  setHeaderRow: { flexDirection: 'row', marginBottom: spacing.xs },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  typePill: { borderRadius: radii.sm, paddingHorizontal: spacing.xs, paddingVertical: 2, alignItems: 'center' },
});
