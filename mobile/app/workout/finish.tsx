import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { api } from '../../src/lib/api';

const ORANGE = '#FF6B35';

type Visibility = 'public' | 'followers' | 'private';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function requestPushPermission(): Promise<void> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return;
    await new Promise<void>((resolve) => {
      const handleDismiss = () => resolve();
      const handleEnable = async () => {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
              name: 'default',
              importance: Notifications.AndroidImportance.MAX,
            });
          }
          const tokenData = await Notifications.getExpoPushTokenAsync();
          await api.post('/push-tokens', { token: tokenData.data });
        }
        resolve();
      };
      Alert.alert(
        'Stay in the Loop',
        'Enable notifications to get PR alerts, badge unlocks, and rest timer reminders.',
        [
          { text: 'Not Now', style: 'cancel', onPress: handleDismiss },
          { text: 'Enable', onPress: handleEnable },
        ]
      );
    });
  } catch {
    // Non-critical — silently ignore push permission errors
  }
}

export default function FinishWorkoutScreen() {
  const router = useRouter();
  const workout = useWorkoutStore(s => s.active);
  const idempotency_key = useWorkoutStore(s => s.idempotency_key);
  const finishWorkout = useWorkoutStore(s => s.finishWorkout);

  const [workoutName, setWorkoutName] = useState(workout?.workout_name ?? '');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [saving, setSaving] = useState(false);

  if (!workout) {
    return (
      <View className="flex-1 bg-gray-950 items-center justify-center">
        <Text className="text-gray-400">No active workout.</Text>
      </View>
    );
  }

  const completedNonWarmupSets = workout.exercises.flatMap(ex =>
    ex.sets.filter(s => s.is_completed && s.set_type !== 'warmup')
  ).length;

  const exerciseCount = workout.exercises.length;

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const body = {
        idempotency_key,
        client_upload_uuid: workout.client_upload_uuid,
        media_filenames: [],
        name: workoutName.trim() || workout.workout_name,
        description,
        visibility,
        started_at: workout.started_at,
        duration_seconds: workout.elapsed_seconds,
        routine_id: workout.routine_id,
        exercises: workout.exercises.map(ex => ({
          exercise_id: ex.exercise_id,
          position: ex.position,
          superset_group: ex.superset_group,
          rest_seconds: ex.rest_seconds,
          notes: ex.notes,
          sets: ex.sets.map(s => ({
            position: s.position,
            set_type: s.set_type,
            weight_kg: s.weight_kg,
            reps: s.reps,
            duration_seconds: s.duration_seconds,
            distance_meters: s.distance_meters,
            rpe: s.rpe,
            is_completed: s.is_completed,
            completed_at: s.completed_at,
          })),
        })),
      };

      const result = await api.post<{ data: { workout: { id: string; ordinal_number: number }; prs_detected: string[] } }>(
        '/workouts',
        body
      );

      finishWorkout();

      const savedWorkout = result.data?.workout;
      const prs = result.data?.prs_detected ?? [];
      if (prs.length > 0) {
        Alert.alert('New PRs! 🏆', prs.join(', '));
      }

      // Request push permission contextually on first completed workout
      if (savedWorkout?.ordinal_number === 1) {
        await requestPushPermission();
      }

      router.replace('/(tabs)/workouts');
    } catch {
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const VISIBILITY_OPTIONS: { key: Visibility; label: string }[] = [
    { key: 'public', label: 'Public' },
    { key: 'followers', label: 'Followers' },
    { key: 'private', label: 'Private' },
  ];

  return (
    <View className="flex-1 bg-gray-950">
      {/* Header */}
      <View className="flex-row items-center px-4 pt-14 pb-4 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Text className="text-white text-xl">←</Text>
        </TouchableOpacity>
        <Text className="text-white font-bold text-xl flex-1">Finish Workout</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        {/* Workout name */}
        <View className="mb-4">
          <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
            Workout Name
          </Text>
          <TextInput
            className="bg-gray-900 text-white rounded-xl px-4 py-3 text-base"
            value={workoutName}
            onChangeText={setWorkoutName}
            placeholderTextColor="#6b7280"
            placeholder="Workout name"
            returnKeyType="done"
          />
        </View>

        {/* Description */}
        <View className="mb-4">
          <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
            Description
          </Text>
          <TextInput
            className="bg-gray-900 text-white rounded-xl px-4 py-3 text-base"
            value={description}
            onChangeText={setDescription}
            placeholder="Notes (optional)"
            placeholderTextColor="#6b7280"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ minHeight: 80 }}
          />
        </View>

        {/* Visibility picker */}
        <View className="mb-6">
          <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
            Visibility
          </Text>
          <View className="flex-row gap-3">
            {VISIBILITY_OPTIONS.map(opt => {
              const isSelected = visibility === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setVisibility(opt.key)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-900 items-center border-2"
                  style={{ borderColor: isSelected ? ORANGE : 'transparent' }}
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: isSelected ? ORANGE : '#9ca3af' }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Summary stats */}
        <View className="bg-gray-900 rounded-2xl p-4 mb-6">
          <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Summary
          </Text>
          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-white font-bold text-2xl">{completedNonWarmupSets}</Text>
              <Text className="text-gray-400 text-xs mt-1">Sets</Text>
            </View>
            <View className="w-px bg-gray-800" />
            <View className="items-center">
              <Text className="text-white font-bold text-2xl">{exerciseCount}</Text>
              <Text className="text-gray-400 text-xs mt-1">Exercises</Text>
            </View>
            <View className="w-px bg-gray-800" />
            <View className="items-center">
              <Text className="text-white font-bold text-2xl">{formatDuration(workout.elapsed_seconds)}</Text>
              <Text className="text-gray-400 text-xs mt-1">Duration</Text>
            </View>
          </View>
        </View>

        {/* Exercise list */}
        <View className="mb-6">
          <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Exercises
          </Text>
          <View className="bg-gray-900 rounded-2xl overflow-hidden">
            {workout.exercises.map((ex, idx) => {
              const completedSets = ex.sets.filter(s => s.is_completed).length;
              const totalSets = ex.sets.length;
              const isLast = idx === workout.exercises.length - 1;
              return (
                <View
                  key={ex.exercise_id + ex.position}
                  className={`flex-row items-center px-4 py-3 ${!isLast ? 'border-b border-gray-800' : ''}`}
                >
                  <Text className="text-white font-medium flex-1" numberOfLines={1}>
                    {ex.exercise_name}
                  </Text>
                  <Text className="text-gray-400 text-sm">
                    {completedSets}/{totalSets} sets
                  </Text>
                </View>
              );
            })}
            {workout.exercises.length === 0 && (
              <View className="px-4 py-3">
                <Text className="text-gray-500 text-sm">No exercises logged</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Save button */}
      <View className="px-4 pb-10 pt-4 border-t border-gray-800">
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="rounded-xl py-4 items-center justify-center"
          style={{ backgroundColor: ORANGE, opacity: saving ? 0.7 : 1 }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">Save Workout</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
