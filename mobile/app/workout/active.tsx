import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Modal, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useWorkoutStore, WorkoutSet, WorkoutExercise } from '../../src/stores/workoutStore';
import { api } from '../../src/lib/api';

// Colors
const ORANGE = '#FF6B35';

// Set type badge colors
const SET_TYPE_COLORS: Record<string, string> = {
  normal: '#6b7280',
  warmup: '#3b82f6',
  dropset: '#8b5cf6',
  failure: '#ef4444',
};

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  return `${m}:${s.toString().padStart(2,'0')}`;
}

interface SetRowProps {
  set: WorkoutSet;
  index: number;
  loggingType: string;
  onToggleComplete: () => void;
  onUpdateSet: (updated: Partial<WorkoutSet>) => void;
}

function SetRow({ set, index, loggingType, onToggleComplete, onUpdateSet }: SetRowProps) {
  const isCompleted = set.is_completed;
  return (
    <View className="flex-row items-center py-2 border-b border-gray-800">
      {/* Set number / type toggle */}
      <TouchableOpacity
        onPress={onToggleComplete}
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: isCompleted ? ORANGE : SET_TYPE_COLORS[set.set_type] }}
      >
        <Text className="text-white text-xs font-bold">{index + 1}</Text>
      </TouchableOpacity>

      {/* Inputs */}
      {(loggingType === 'weight_reps' || loggingType === 'bodyweight_reps') && (
        <>
          <View className="flex-1 mr-2">
            <TextInput
              className="bg-gray-800 text-white text-center rounded-lg px-2 py-2"
              placeholder="kg"
              placeholderTextColor="#6b7280"
              keyboardType="decimal-pad"
              value={set.weight_kg !== null ? String(set.weight_kg) : ''}
              onChangeText={v => onUpdateSet({ weight_kg: v ? parseFloat(v) : null })}
            />
          </View>
          <View className="flex-1">
            <TextInput
              className="bg-gray-800 text-white text-center rounded-lg px-2 py-2"
              placeholder="reps"
              placeholderTextColor="#6b7280"
              keyboardType="number-pad"
              value={set.reps !== null ? String(set.reps) : ''}
              onChangeText={v => onUpdateSet({ reps: v ? parseInt(v) : null })}
            />
          </View>
        </>
      )}
      {loggingType === 'duration' && (
        <View className="flex-1">
          <TextInput
            className="bg-gray-800 text-white text-center rounded-lg px-2 py-2"
            placeholder="seconds"
            placeholderTextColor="#6b7280"
            keyboardType="number-pad"
            value={set.duration_seconds !== null ? String(set.duration_seconds) : ''}
            onChangeText={v => onUpdateSet({ duration_seconds: v ? parseInt(v) : null })}
          />
        </View>
      )}
      {loggingType === 'distance' && (
        <View className="flex-1">
          <TextInput
            className="bg-gray-800 text-white text-center rounded-lg px-2 py-2"
            placeholder="meters"
            placeholderTextColor="#6b7280"
            keyboardType="decimal-pad"
            value={set.distance_meters !== null ? String(set.distance_meters) : ''}
            onChangeText={v => onUpdateSet({ distance_meters: v ? parseFloat(v) : null })}
          />
        </View>
      )}
    </View>
  );
}

interface ExerciseCardProps {
  exercise: WorkoutExercise;
  onUpdateSets: (sets: WorkoutSet[]) => void;
  onRemove: () => void;
}

function ExerciseCard({ exercise, onUpdateSets, onRemove }: ExerciseCardProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { startRestTimer } = useWorkoutStore();

  const handleUpdateSet = (setPosition: number, updates: Partial<WorkoutSet>) => {
    const newSets = exercise.sets.map(s => s.position === setPosition ? { ...s, ...updates } : s);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onUpdateSets(newSets), 500);
    onUpdateSets(newSets);
  };

  const handleToggleComplete = (setPosition: number) => {
    const newSets = exercise.sets.map(s => {
      if (s.position !== setPosition) return s;
      const completing = !s.is_completed;
      return { ...s, is_completed: completing, completed_at: completing ? new Date().toISOString() : null };
    });
    onUpdateSets(newSets);
    // Start rest timer after completing a set
    const s = newSets.find(s => s.position === setPosition);
    if (s?.is_completed) {
      startRestTimer(exercise.rest_seconds);
    }
  };

  const addSet = () => {
    const last = exercise.sets[exercise.sets.length - 1];
    const newSet: WorkoutSet = {
      position: exercise.sets.length,
      set_type: 'normal',
      weight_kg: last?.weight_kg ?? null,
      reps: last?.reps ?? null,
      duration_seconds: last?.duration_seconds ?? null,
      distance_meters: last?.distance_meters ?? null,
      rpe: null,
      is_completed: false,
      completed_at: null,
    };
    onUpdateSets([...exercise.sets, newSet]);
  };

  return (
    <View className="bg-gray-900 rounded-2xl mx-4 mb-4 overflow-hidden">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
        <Text className="text-white font-bold text-base flex-1" numberOfLines={1}>{exercise.exercise_name}</Text>
        <TouchableOpacity onPress={onRemove} className="ml-2 p-1">
          <Text className="text-gray-500 text-lg">✕</Text>
        </TouchableOpacity>
      </View>

      {/* Column headers */}
      <View className="flex-row items-center px-4 pb-1">
        <View className="w-10 mr-3" />
        {(exercise.logging_type === 'weight_reps' || exercise.logging_type === 'bodyweight_reps') && (
          <>
            <Text className="flex-1 text-gray-500 text-xs text-center mr-2">KG</Text>
            <Text className="flex-1 text-gray-500 text-xs text-center">REPS</Text>
          </>
        )}
        {exercise.logging_type === 'duration' && <Text className="flex-1 text-gray-500 text-xs text-center">SECONDS</Text>}
        {exercise.logging_type === 'distance' && <Text className="flex-1 text-gray-500 text-xs text-center">METERS</Text>}
      </View>

      {/* Sets */}
      <View className="px-4">
        {exercise.sets.map((s, i) => (
          <SetRow
            key={s.position}
            set={s}
            index={i}
            loggingType={exercise.logging_type}
            onToggleComplete={() => handleToggleComplete(s.position)}
            onUpdateSet={(updates) => handleUpdateSet(s.position, updates)}
          />
        ))}
      </View>

      {/* Add set */}
      <TouchableOpacity onPress={addSet} className="mx-4 my-3 py-2 rounded-xl bg-gray-800 items-center">
        <Text className="text-gray-400 text-sm">+ Add Set</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const { active, idempotency_key, restTimer, updateExerciseSets, removeExercise, discardWorkout, tickElapsed, clearRestTimer } = useWorkoutStore();
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exercises, setExercises] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');

  // Redirect if no active workout
  useEffect(() => {
    if (!active) router.replace('/(tabs)/workouts');
  }, [active]);

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(tickElapsed, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load exercises for picker
  useEffect(() => {
    if (showExercisePicker) {
      api.get<any>(`/exercises?limit=50${searchText ? '&search=' + searchText : ''}`)
        .then(r => setExercises(r.data.exercises || []))
        .catch(() => {});
    }
  }, [showExercisePicker, searchText]);

  const handleFinish = () => {
    if (!active) return;
    const completedSets = active.exercises.flatMap(ex => ex.sets.filter(s => s.is_completed));
    if (completedSets.length === 0) {
      Alert.alert('No completed sets', 'Complete at least one set before finishing.');
      return;
    }
    router.push('/workout/finish');
  };

  const handleDiscard = () => {
    Alert.alert('Discard Workout', 'This will delete your current workout. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { discardWorkout(); router.replace('/(tabs)/workouts'); } },
    ]);
  };

  const addExerciseToWorkout = (ex: any) => {
    const { addExercise, active } = useWorkoutStore.getState();
    const position = active?.exercises.length ?? 0;
    addExercise({
      exercise_id: ex.id,
      exercise_name: ex.name,
      logging_type: ex.logging_type || 'weight_reps',
      position,
      superset_group: null,
      rest_seconds: 90,
      notes: '',
      sets: [{ position: 0, set_type: 'normal', weight_kg: null, reps: null, duration_seconds: null, distance_meters: null, rpe: null, is_completed: false, completed_at: null }],
    });
    setShowExercisePicker(false);
    setSearchText('');
  };

  if (!active) return null;

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-4 border-b border-gray-800">
        <View className="flex-1">
          <Text className="text-white font-bold text-lg" numberOfLines={1}>{active.workout_name}</Text>
          <Text className="text-orange-400 text-sm mt-0.5">{formatTime(active.elapsed_seconds)}</Text>
        </View>
        <TouchableOpacity onPress={handleDiscard} className="mr-3 px-3 py-1.5 rounded-lg bg-gray-800">
          <Text className="text-red-400 text-sm">Discard</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleFinish} className="px-4 py-1.5 rounded-lg" style={{ backgroundColor: ORANGE }}>
          <Text className="text-white font-bold text-sm">Finish</Text>
        </TouchableOpacity>
      </View>

      {/* Rest timer bar */}
      {restTimer !== null && (
        <TouchableOpacity onPress={clearRestTimer} className="mx-4 mt-3 px-4 py-3 rounded-xl bg-gray-800 flex-row items-center justify-between">
          <Text className="text-white font-semibold">Rest Timer</Text>
          <Text className="text-orange-400 font-bold text-lg">{formatTime(restTimer)}</Text>
          <Text className="text-gray-500 text-sm">Tap to skip</Text>
        </TouchableOpacity>
      )}

      {/* Exercise list */}
      <ScrollView className="flex-1 pt-4" keyboardShouldPersistTaps="handled">
        {active.exercises.map(ex => (
          <ExerciseCard
            key={ex.position}
            exercise={ex}
            onUpdateSets={(sets) => updateExerciseSets(ex.position, sets)}
            onRemove={() => removeExercise(ex.position)}
          />
        ))}

        {/* Add exercise button */}
        <TouchableOpacity
          onPress={() => setShowExercisePicker(true)}
          className="mx-4 mb-8 py-4 rounded-2xl border border-gray-700 items-center"
        >
          <Text className="text-gray-400 font-semibold">+ Add Exercise</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Exercise picker modal */}
      <Modal visible={showExercisePicker} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-black">
          <View className="flex-row items-center px-4 pt-6 pb-4 border-b border-gray-800">
            <Text className="text-white font-bold text-lg flex-1">Add Exercise</Text>
            <TouchableOpacity onPress={() => { setShowExercisePicker(false); setSearchText(''); }}>
              <Text className="text-orange-400 font-semibold">Done</Text>
            </TouchableOpacity>
          </View>
          <View className="px-4 py-3">
            <TextInput
              className="bg-gray-800 text-white rounded-xl px-4 py-3"
              placeholder="Search exercises..."
              placeholderTextColor="#6b7280"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
          <FlatList
            data={exercises}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable onPress={() => addExerciseToWorkout(item)} className="flex-row items-center px-4 py-3 border-b border-gray-800">
                <View className="flex-1">
                  <Text className="text-white font-medium">{item.name}</Text>
                  <Text className="text-gray-500 text-xs mt-0.5 capitalize">{(item.equipment || 'other').replace('_', ' ')} · {(item.primary_muscles || []).join(', ')}</Text>
                </View>
                <Text className="text-orange-400 text-lg">+</Text>
              </Pressable>
            )}
            ListEmptyComponent={<View className="items-center py-12"><Text className="text-gray-500">No exercises found</Text></View>}
          />
        </View>
      </Modal>
    </View>
  );
}
