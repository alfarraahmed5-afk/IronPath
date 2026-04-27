import { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Play, Users } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/authStore';
import { useWorkoutStore, WorkoutExercise } from '../../src/stores/workoutStore';
import { Header } from '../../src/components/Header';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Avatar } from '../../src/components/Avatar';
import { Icon } from '../../src/components/Icon';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, spacing, radii } from '../../src/theme/tokens';

interface RoutineSet {
  position: number;
  set_type: string;
  target_weight_kg: number | null;
  target_reps: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_duration_seconds: number | null;
  target_distance_meters: number | null;
}

interface RoutineExercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  logging_type: string;
  position: number;
  superset_group: number | null;
  rest_seconds: number;
  notes: string;
  sets: RoutineSet[];
}

interface RoutineDetail {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_gym_template: boolean;
  is_public?: boolean;
  copy_count?: number;
  exercises: RoutineExercise[];
  owner?: { username: string; avatar_url: string | null } | null;
}

function formatSetSummary(sets: RoutineSet[], loggingType: string): string {
  if (!sets || sets.length === 0) return '0 sets';
  const setCount = sets.length;
  const first = sets[0];
  if (loggingType === 'weight_reps' || loggingType === 'bodyweight_reps') {
    if (first.target_reps !== null && first.target_weight_kg !== null) return `${setCount} sets · ${first.target_reps} reps @ ${first.target_weight_kg} kg`;
    if (first.target_reps !== null) return `${setCount} sets · ${first.target_reps} reps`;
    if (first.target_weight_kg !== null) return `${setCount} sets · ${first.target_weight_kg} kg`;
  }
  if (loggingType === 'duration' && first.target_duration_seconds !== null) {
    const mins = Math.floor(first.target_duration_seconds / 60);
    const secs = first.target_duration_seconds % 60;
    return `${setCount} sets · ${mins}:${secs.toString().padStart(2, '0')}`;
  }
  if (loggingType === 'distance' && first.target_distance_meters !== null) return `${setCount} sets · ${first.target_distance_meters}m`;
  return `${setCount} sets`;
}

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const currentUserId = useAuthStore(s => s.user?.id);
  const { startWorkout } = useWorkoutStore();
  const [routine, setRoutine] = useState<RoutineDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/workouts');
  }

  useEffect(() => {
    if (!id) { goBack(); return; }
    api.get<{ data: { routine: RoutineDetail } }>(`/routines/${id}`)
      .then(r => setRoutine(r.data.routine))
      .catch(() => {/* show 404 below */})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleCopy() {
    if (!routine || copying) return;
    setCopying(true);
    try {
      const res = await api.post<{ data: { id: string } }>(`/routines/${routine.id}/copy`);
      const newId = res.data?.id;
      Alert.alert('Copied', 'Saved to your routines.');
      if (newId) router.replace(`/routines/${newId}` as any);
    } catch (e: any) {
      Alert.alert('Could not copy', e?.error?.message ?? 'Try again.');
    } finally {
      setCopying(false);
    }
  }

  const handleStartWorkout = () => {
    if (!routine) return;
    const workoutExercises: WorkoutExercise[] = routine.exercises.map(ex => ({
      exercise_id: ex.exercise_id,
      exercise_name: ex.exercise_name,
      logging_type: ex.logging_type as any,
      position: ex.position,
      superset_group: ex.superset_group,
      rest_seconds: ex.rest_seconds,
      notes: ex.notes,
      sets: [],
    }));
    startWorkout(routine.name, routine.id, workoutExercises);
    router.push('/workout/active');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!routine) {
    return (
      <View style={[styles.root, styles.centered]}>
        <EmptyState illustration="404" title="Routine not found" action={{ label: 'Go back', onPress: goBack }} />
      </View>
    );
  }

  const totalSets = routine.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header title={routine.name} back />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {routine.description ? (
          <View style={styles.descSection}>
            <Text variant="body" color="textSecondary">{routine.description}</Text>
          </View>
        ) : null}

        {/* Owner info if shared/non-owner */}
        {routine.owner && currentUserId && routine.user_id !== currentUserId ? (
          <View style={styles.ownerRow}>
            <Avatar username={routine.owner.username} avatarUrl={routine.owner.avatar_url} size={32} />
            <Text variant="caption" color="textSecondary" style={{ marginLeft: spacing.sm, flex: 1 }}>
              by @{routine.owner.username}
            </Text>
            {!!routine.copy_count && routine.copy_count > 0 && (
              <View style={styles.copyChip}>
                <Icon icon={Users} size={10} color={colors.brand} />
                <Text variant="overline" color="brand" style={{ marginLeft: spacing.xxs }}>
                  {routine.copy_count} copies
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Stats */}
        <View style={styles.statsRow}>
          <Text variant="caption" color="textTertiary">
            {routine.exercises.length} exercise{routine.exercises.length !== 1 ? 's' : ''}
          </Text>
          <Text variant="caption" color="textTertiary">·</Text>
          <Text variant="caption" color="textTertiary">
            {totalSets} set{totalSets !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Start / Copy buttons */}
        <View style={styles.startBar}>
          {currentUserId && routine.user_id !== currentUserId ? (
            <>
              <Button
                label="Copy to My Routines"
                onPress={handleCopy}
                variant="primary"
                size="lg"
                fullWidth
                loading={copying}
              />
              <View style={{ height: spacing.sm }} />
              <Button
                label="Start Workout"
                onPress={handleStartWorkout}
                variant="ghost"
                size="md"
                fullWidth
              />
            </>
          ) : (
            <Button
              label="Start Workout"
              onPress={handleStartWorkout}
              variant="primary"
              size="lg"
              fullWidth
            />
          )}
        </View>

        {/* Exercises */}
        <View style={styles.exerciseList}>
          {routine.exercises.map(exercise => (
            <Surface key={exercise.position} level={2} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text variant="bodyEmphasis" color="textPrimary" style={{ flex: 1 }}>
                  {exercise.exercise_name}
                </Text>
                {exercise.superset_group !== null && (
                  <View style={styles.supersetBadge}>
                    <Text variant="overline" color="textTertiary">SS</Text>
                  </View>
                )}
              </View>
              <Text variant="caption" color="textTertiary">
                {formatSetSummary(exercise.sets, exercise.logging_type)}
              </Text>
              {exercise.notes ? (
                <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xs }}>
                  {exercise.notes}
                </Text>
              ) : null}
            </Surface>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  descSection: { paddingHorizontal: spacing.base, paddingTop: spacing.base },
  statsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  startBar: { paddingHorizontal: spacing.base, marginBottom: spacing.lg },
  exerciseList: { paddingHorizontal: spacing.base, gap: spacing.sm },
  exerciseCard: { padding: spacing.base },
  exerciseHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.xs },
  supersetBadge: {
    backgroundColor: colors.surface3,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    marginLeft: spacing.sm,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
  copyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brandGlow,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
});
