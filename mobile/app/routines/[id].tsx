import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useWorkoutStore, WorkoutExercise } from '../../src/stores/workoutStore';

const ORANGE = '#FF6B35';

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
    if (first.target_reps !== null && first.target_weight_kg !== null) {
      return `${setCount} sets · ${first.target_reps} reps @ ${first.target_weight_kg} kg`;
    }
    if (first.target_reps !== null) {
      return `${setCount} sets · ${first.target_reps} reps`;
    }
    if (first.target_weight_kg !== null) {
      return `${setCount} sets · ${first.target_weight_kg} kg`;
    }
  }

  if (loggingType === 'duration') {
    if (first.target_duration_seconds !== null) {
      const mins = Math.floor(first.target_duration_seconds / 60);
      const secs = first.target_duration_seconds % 60;
      return `${setCount} sets · ${mins}:${secs.toString().padStart(2, '0')}`;
    }
  }

  if (loggingType === 'distance') {
    if (first.target_distance_meters !== null) {
      return `${setCount} sets · ${first.target_distance_meters}m`;
    }
  }

  return `${setCount} sets`;
}

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { startWorkout } = useWorkoutStore();
  const [routine, setRoutine] = useState<RoutineDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      router.back();
      return;
    }

    const fetchRoutine = async () => {
      try {
        const response = await api.get<{ data: { routine: RoutineDetail } }>(`/routines/${id}`);
        setRoutine(response.data.routine);
      } catch (error) {
        console.error('Failed to fetch routine:', error);
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchRoutine();
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
      <View className="flex-1 bg-gray-950 items-center justify-center">
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  if (!routine) {
    return (
      <View className="flex-1 bg-gray-950 items-center justify-center">
        <Text className="text-gray-400">Routine not found</Text>
      </View>
    );
  }

  const totalSets = routine.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <ScrollView className="flex-1 bg-gray-950" contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header */}
      <View className="flex-row items-center px-4 pt-12 pb-4 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2">
          <Text className="text-gray-400 text-xl">←</Text>
        </TouchableOpacity>
        <Text className="text-white font-bold text-2xl flex-1">{routine.name}</Text>
      </View>

      {/* Description */}
      {routine.description && (
        <View className="px-4 pt-4 pb-2">
          <Text className="text-gray-300 text-sm">{routine.description}</Text>
        </View>
      )}

      {/* Stats */}
      <View className="px-4 py-4 flex-row items-center gap-4">
        <Text className="text-gray-400 text-sm">
          {routine.exercises.length} exercise{routine.exercises.length !== 1 ? 's' : ''}
        </Text>
        <Text className="text-gray-400 text-sm">·</Text>
        <Text className="text-gray-400 text-sm">
          {totalSets} set{totalSets !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Start Workout Button */}
      <TouchableOpacity
        onPress={handleStartWorkout}
        className="mx-4 py-4 rounded-2xl items-center justify-center mb-6"
        style={{ backgroundColor: ORANGE }}
      >
        <Text className="text-white font-bold text-base">Start Workout</Text>
      </TouchableOpacity>

      {/* Exercises */}
      <View className="px-4 gap-3">
        {routine.exercises.map(exercise => (
          <View key={exercise.position} className="bg-gray-900 px-4 py-4 rounded-xl">
            <View className="flex-row items-start justify-between mb-2">
              <Text className="text-white font-bold text-base flex-1">
                {exercise.exercise_name}
              </Text>
              {exercise.superset_group !== null && (
                <View className="ml-2 px-2 py-1 rounded-full bg-gray-800">
                  <Text className="text-gray-400 text-xs font-semibold">SS</Text>
                </View>
              )}
            </View>
            <Text className="text-gray-400 text-sm">
              {formatSetSummary(exercise.sets, exercise.logging_type)}
            </Text>
            {exercise.notes && (
              <Text className="text-gray-500 text-xs mt-2">{exercise.notes}</Text>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
