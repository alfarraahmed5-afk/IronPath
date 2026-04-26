import { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Play } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { useWorkoutStore, WorkoutExercise } from '../../src/stores/workoutStore';
import { Header } from '../../src/components/Header';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
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
  name: string;
  description: string | null;
  is_gym_template: boolean;
  exercises: RoutineExercise[];
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
  const { startWorkout } = useWorkoutStore();
  const [routine, setRoutine] = useState<RoutineDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { router.back(); return; }
    api.get<{ data: { routine: RoutineDetail } }>(`/routines/${id}`)
      .then(r => setRoutine(r.data.routine))
      .catch(() => router.back())
      .finally(() => setLoading(false));
  }, [id]);

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
        <EmptyState illustration="404" title="Routine not found" action={{ label: 'Go back', onPress: () => router.back() }} />
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

        {/* Start button */}
        <View style={styles.startBar}>
          <Button
            label="Start Workout"
            onPress={handleStartWorkout}
            variant="primary"
            size="lg"
            fullWidth
          />
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
});
