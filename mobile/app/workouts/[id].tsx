import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, SectionList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/lib/api';

const ORANGE = '#FF6B35';

interface CompletedSet {
  position: number;
  set_type: string;
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  rpe: number | null;
  is_completed: boolean;
}

interface WorkoutExercise {
  exercise_id: string;
  exercise: { id: string; name: string; equipment?: string; logging_type: string; image_url?: string | null } | null;
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
  visibility: string;
  exercises: WorkoutExercise[];
  personal_records: PersonalRecord[];
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  };
  return date.toLocaleDateString('en-US', options);
}

function getRecordTypeLabel(recordType: string): string {
  const labels: Record<string, string> = {
    weight: 'Max Weight',
    reps: 'Max Reps',
    volume: 'Max Volume',
    distance: 'Max Distance',
    duration: 'Max Duration',
  };
  return labels[recordType] || recordType;
}

function formatSetDisplay(set: CompletedSet, loggingType: string): string {
  if (loggingType === 'weight_reps' || loggingType === 'bodyweight_reps') {
    if (set.weight_kg !== null && set.reps !== null) {
      return `${set.weight_kg} kg × ${set.reps}`;
    }
    if (set.reps !== null) {
      return `${set.reps} reps`;
    }
    if (set.weight_kg !== null) {
      return `${set.weight_kg} kg`;
    }
  }

  if (loggingType === 'duration') {
    if (set.duration_seconds !== null) {
      const mins = Math.floor(set.duration_seconds / 60);
      const secs = set.duration_seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  }

  if (loggingType === 'distance') {
    if (set.distance_meters !== null) {
      return `${set.distance_meters}m`;
    }
  }

  return '—';
}

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      router.back();
      return;
    }

    const fetchWorkout = async () => {
      try {
        // Backend returns the workout fields flat under `data` (no `data.workout`
        // wrapper) — see GET /api/v1/workouts/:id.
        const response = await api.get<{ data: WorkoutDetail }>(`/workouts/${id}`);
        setWorkout(response.data);
      } catch (error) {
        console.error('Failed to fetch workout:', error);
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchWorkout();
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 bg-gray-950 items-center justify-center">
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  if (!workout) {
    return (
      <View className="flex-1 bg-gray-950 items-center justify-center">
        <Text className="text-gray-400">Workout not found</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-950" contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-12 pb-4 border-b border-gray-800">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2">
            <Text className="text-gray-400 text-xl">←</Text>
          </TouchableOpacity>
          <Text className="text-white font-bold text-2xl flex-1">{workout.name}</Text>
        </View>
        <TouchableOpacity className="p-2">
          <Text className="text-gray-400 text-lg">✎</Text>
        </TouchableOpacity>
      </View>

      {/* Date and Duration */}
      <View className="px-4 pt-4 pb-3 gap-1">
        <Text className="text-gray-400 text-sm">{formatDate(workout.started_at)}</Text>
        <Text className="text-gray-400 text-sm">{formatDuration(workout.duration_seconds)}</Text>
      </View>

      {/* Stats Row */}
      <View className="px-4 py-4 flex-row items-center gap-4 border-b border-gray-800 pb-4">
        <Text className="text-gray-400 text-sm">
          {workout.total_volume_kg} kg total
        </Text>
        <Text className="text-gray-400 text-sm">·</Text>
        <Text className="text-gray-400 text-sm">
          {workout.total_sets} set{workout.total_sets !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Personal Records Section */}
      {workout.personal_records && workout.personal_records.length > 0 && (
        <View className="px-4 pt-4 mb-4">
          <View className="border-2 rounded-2xl overflow-hidden" style={{ borderColor: ORANGE }}>
            <View className="bg-gray-900 px-4 py-4">
              <Text className="text-white font-bold text-base mb-3">🏆 Personal Records</Text>
              {workout.personal_records.map((pr, idx) => {
                const exName = workout.exercises.find(e => e.exercise_id === pr.exercise_id)?.exercise?.name ?? '';
                return (
                  <View key={idx} className={`py-2 ${idx < workout.personal_records.length - 1 ? 'border-b border-gray-800' : ''}`}>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-gray-300 text-sm">{exName}</Text>
                      <Text className="text-orange-400 font-semibold text-sm">
                        {getRecordTypeLabel(pr.record_type)}: {pr.value}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Exercises and Sets */}
      <View className="px-4 gap-4">
        {workout.exercises.map((exercise) => {
          const completedSets = exercise.sets.filter(s => s.is_completed);

          if (completedSets.length === 0) return null;

          return (
            <View key={exercise.position} className="bg-gray-900 rounded-2xl overflow-hidden">
              {/* Exercise Header */}
              <View className="px-4 pt-4 pb-3 border-b border-gray-800">
                <Text className="text-white font-bold text-base">{exercise.exercise?.name ?? 'Exercise'}</Text>
              </View>

              {/* Set Table */}
              <View className="px-4 py-3">
                {/* Column Headers */}
                <View className="flex-row items-center mb-2">
                  <View className="w-12">
                    <Text className="text-gray-500 text-xs font-semibold">Set</Text>
                  </View>
                  <View className="flex-1 ml-2">
                    <Text className="text-gray-500 text-xs font-semibold">Type</Text>
                  </View>
                  <View className="flex-2">
                    <Text className="text-gray-500 text-xs font-semibold text-right">Result</Text>
                  </View>
                </View>

                {/* Rows */}
                {completedSets.map((set, idx) => (
                  <View key={set.position} className="flex-row items-center py-2 border-b border-gray-800">
                    <View className="w-12">
                      <Text className="text-gray-400 text-sm">{idx + 1}</Text>
                    </View>
                    <View className="flex-1 ml-2">
                      <View className="bg-gray-800 rounded-lg px-2 py-1 self-start">
                        <Text className="text-gray-300 text-xs capitalize font-medium">
                          {set.set_type}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-2">
                      <Text className="text-white text-sm text-right">
                        {formatSetDisplay(set, exercise.exercise?.logging_type ?? 'weight_reps')}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </View>

      {/* Description */}
      {workout.description && (
        <View className="px-4 pt-6 mt-6 border-t border-gray-800">
          <Text className="text-gray-300 text-sm">{workout.description}</Text>
        </View>
      )}
    </ScrollView>
  );
}
