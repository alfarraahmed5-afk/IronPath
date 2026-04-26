import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Plus, Timer, Check, Search } from 'lucide-react-native';
import { useWorkoutStore, WorkoutSet, WorkoutExercise } from '../../src/stores/workoutStore';
import { api } from '../../src/lib/api';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Button } from '../../src/components/Button';
import { Icon } from '../../src/components/Icon';
import { Pressable } from '../../src/components/Pressable';
import { haptic } from '../../src/lib/haptics';
import { colors, spacing, radii } from '../../src/theme/tokens';

const SET_TYPE_COLORS: Record<string, string> = {
  normal:  colors.setNormal,
  warmup:  colors.setWarmup,
  dropset: colors.setDropset,
  failure: colors.setFailure,
};

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
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
  const typeColor = SET_TYPE_COLORS[set.set_type] ?? colors.setNormal;

  return (
    <View style={[styles.setRow, isCompleted && styles.setRowComplete]}>
      {/* Set number / complete toggle */}
      <Pressable
        onPress={onToggleComplete}
        style={[styles.setNumBtn, { backgroundColor: isCompleted ? colors.success : typeColor + '30', borderColor: isCompleted ? colors.success : typeColor }]}
        accessibilityLabel={`Set ${index + 1}, ${isCompleted ? 'completed' : 'incomplete'}`}
      >
        {isCompleted
          ? <Icon icon={Check} size={14} color={colors.textPrimary} strokeWidth={2.5} />
          : <Text variant="label" style={{ color: typeColor }}>{index + 1}</Text>
        }
      </Pressable>

      {/* Inputs */}
      {(loggingType === 'weight_reps' || loggingType === 'bodyweight_reps') && (
        <>
          <TextInput
            style={[styles.setInput, isCompleted && styles.setInputComplete]}
            placeholder="kg"
            placeholderTextColor={colors.textDisabled}
            keyboardType="decimal-pad"
            value={set.weight_kg !== null ? String(set.weight_kg) : ''}
            onChangeText={v => onUpdateSet({ weight_kg: v ? parseFloat(v) : null })}
          />
          <TextInput
            style={[styles.setInput, isCompleted && styles.setInputComplete]}
            placeholder="reps"
            placeholderTextColor={colors.textDisabled}
            keyboardType="number-pad"
            value={set.reps !== null ? String(set.reps) : ''}
            onChangeText={v => onUpdateSet({ reps: v ? parseInt(v) : null })}
          />
        </>
      )}
      {loggingType === 'duration' && (
        <TextInput
          style={[styles.setInput, styles.setInputFull, isCompleted && styles.setInputComplete]}
          placeholder="seconds"
          placeholderTextColor={colors.textDisabled}
          keyboardType="number-pad"
          value={set.duration_seconds !== null ? String(set.duration_seconds) : ''}
          onChangeText={v => onUpdateSet({ duration_seconds: v ? parseInt(v) : null })}
        />
      )}
      {loggingType === 'distance' && (
        <TextInput
          style={[styles.setInput, styles.setInputFull, isCompleted && styles.setInputComplete]}
          placeholder="meters"
          placeholderTextColor={colors.textDisabled}
          keyboardType="decimal-pad"
          value={set.distance_meters !== null ? String(set.distance_meters) : ''}
          onChangeText={v => onUpdateSet({ distance_meters: v ? parseFloat(v) : null })}
        />
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
  const { startRestTimer } = useWorkoutStore();

  const handleUpdateSet = (setPosition: number, updates: Partial<WorkoutSet>) => {
    const newSets = exercise.sets.map(s => s.position === setPosition ? { ...s, ...updates } : s);
    onUpdateSets(newSets);
  };

  const handleToggleComplete = (setPosition: number) => {
    const newSets = exercise.sets.map(s => {
      if (s.position !== setPosition) return s;
      const completing = !s.is_completed;
      return { ...s, is_completed: completing, completed_at: completing ? new Date().toISOString() : null };
    });
    onUpdateSets(newSets);
    const s = newSets.find(s => s.position === setPosition);
    if (s?.is_completed) {
      haptic.light();
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

  const completedCount = exercise.sets.filter(s => s.is_completed).length;
  const totalCount = exercise.sets.length;

  return (
    <Surface level={2} style={styles.exerciseCard}>
      {/* Header */}
      <View style={styles.exerciseHeader}>
        <View style={{ flex: 1 }}>
          <Text variant="title3" color="textPrimary" numberOfLines={1}>{exercise.exercise_name}</Text>
          <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xxs }}>
            {completedCount}/{totalCount} sets completed
          </Text>
        </View>
        <Pressable onPress={onRemove} style={styles.removeBtn} accessibilityLabel="Remove exercise">
          <Icon icon={X} size={16} color={colors.textTertiary} />
        </Pressable>
      </View>

      {/* Column headers */}
      <View style={styles.setHeaderRow}>
        <View style={styles.setNumBtn} />
        {(exercise.logging_type === 'weight_reps' || exercise.logging_type === 'bodyweight_reps') && (
          <>
            <Text variant="overline" color="textTertiary" style={styles.setColHeader}>KG</Text>
            <Text variant="overline" color="textTertiary" style={styles.setColHeader}>REPS</Text>
          </>
        )}
        {exercise.logging_type === 'duration' && (
          <Text variant="overline" color="textTertiary" style={[styles.setColHeader, { flex: 1 }]}>SECONDS</Text>
        )}
        {exercise.logging_type === 'distance' && (
          <Text variant="overline" color="textTertiary" style={[styles.setColHeader, { flex: 1 }]}>METERS</Text>
        )}
      </View>

      {/* Sets */}
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

      {/* Add set */}
      <Pressable onPress={addSet} style={styles.addSetBtn} accessibilityLabel="Add set">
        <Icon icon={Plus} size={14} color={colors.textTertiary} />
        <Text variant="label" color="textTertiary" style={{ marginLeft: spacing.xs }}>Add Set</Text>
      </Pressable>
    </Surface>
  );
}

function ExercisePickerModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (ex: any) => void;
}) {
  const [exercises, setExercises] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      api.get<any>(`/exercises?limit=50${searchText ? '&search=' + encodeURIComponent(searchText) : ''}`)
        .then(r => setExercises(r.data.exercises || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);
  }, [visible, searchText]);

  function handleClose() {
    setSearchText('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.pickerRoot} edges={['top']}>
        {/* Header */}
        <View style={styles.pickerHeader}>
          <Text variant="title3" color="textPrimary" style={{ flex: 1 }}>Add Exercise</Text>
          <Pressable onPress={handleClose} accessibilityLabel="Close">
            <Text variant="label" color="brand">Done</Text>
          </Pressable>
        </View>

        {/* Search */}
        <View style={styles.pickerSearch}>
          <Surface level={2} style={styles.searchBar}>
            <Icon icon={Search} size={16} color={colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises…"
              placeholderTextColor={colors.textTertiary}
              value={searchText}
              onChangeText={setSearchText}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchText.length > 0 && (
              <Pressable onPress={() => setSearchText('')} accessibilityLabel="Clear">
                <Icon icon={X} size={14} color={colors.textTertiary} />
              </Pressable>
            )}
          </Surface>
        </View>

        {loading ? (
          <View style={styles.pickerLoading}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : (
          <FlatList
            data={exercises}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onAdd(item)}
                style={styles.pickerRow}
                accessibilityLabel={item.name}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="bodyEmphasis" color="textPrimary" numberOfLines={1}>{item.name}</Text>
                  <Text variant="caption" color="textTertiary" numberOfLines={1} style={{ marginTop: spacing.xxs }}>
                    {(item.equipment || 'Other').replace(/_/g, ' ')}
                    {item.primary_muscles?.length ? ' · ' + item.primary_muscles[0] : ''}
                  </Text>
                </View>
                <Icon icon={Plus} size={18} color={colors.brand} />
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.pickerEmpty}>
                <Text variant="body" color="textTertiary">No exercises found</Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.base }} />}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const { active, restTimer, updateExerciseSets, removeExercise, discardWorkout, tickElapsed, clearRestTimer, addExercise } = useWorkoutStore();
  const [showExercisePicker, setShowExercisePicker] = useState(false);

  useEffect(() => {
    if (!active) router.replace('/(tabs)/workouts');
  }, [active]);

  useEffect(() => {
    const interval = setInterval(tickElapsed, 1000);
    return () => clearInterval(interval);
  }, []);

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
    haptic.warning();
    Alert.alert('Discard Workout', 'This will delete your current workout. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard', style: 'destructive', onPress: () => {
          discardWorkout();
          router.replace('/(tabs)/workouts');
        }
      },
    ]);
  };

  const handleAddExercise = useCallback((ex: any) => {
    const position = useWorkoutStore.getState().active?.exercises.length ?? 0;
    addExercise({
      exercise_id: ex.id,
      exercise_name: ex.name,
      logging_type: ex.logging_type || 'weight_reps',
      position,
      superset_group: null,
      rest_seconds: 90,
      notes: '',
      sets: [{
        position: 0, set_type: 'normal',
        weight_kg: null, reps: null, duration_seconds: null,
        distance_meters: null, rpe: null, is_completed: false, completed_at: null,
      }],
    });
    setShowExercisePicker(false);
  }, [addExercise]);

  if (!active) return null;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: spacing.md }}>
            <Text variant="title3" color="textPrimary" numberOfLines={1}>{active.workout_name}</Text>
            <Text variant="numeric" color="brand" style={styles.timer}>{formatTime(active.elapsed_seconds)}</Text>
          </View>
          <Button label="Discard" onPress={handleDiscard} variant="ghost" size="sm" style={{ marginRight: spacing.sm } as any} />
          <Button label="Finish" onPress={handleFinish} variant="primary" size="sm" />
        </View>
      </SafeAreaView>

      {/* Rest timer */}
      {restTimer !== null && (
        <Pressable onPress={clearRestTimer} style={styles.restTimer} accessibilityLabel="Rest timer, tap to skip">
          <Icon icon={Timer} size={16} color={colors.brand} />
          <Text variant="bodyEmphasis" color="textPrimary" style={{ marginLeft: spacing.sm, flex: 1 }}>Rest</Text>
          <Text variant="numeric" color="brand" style={styles.restTime}>{formatTime(restTimer)}</Text>
          <Text variant="caption" color="textTertiary" style={{ marginLeft: spacing.md }}>Skip</Text>
        </Pressable>
      )}

      {/* Exercise list */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {active.exercises.map(ex => (
          <ExerciseCard
            key={ex.exercise_id + ex.position}
            exercise={ex}
            onUpdateSets={(sets) => updateExerciseSets(ex.position, sets)}
            onRemove={() => {
              Alert.alert('Remove Exercise', `Remove ${ex.exercise_name}?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => removeExercise(ex.position) },
              ]);
            }}
          />
        ))}

        {/* Add exercise */}
        <Pressable
          onPress={() => setShowExercisePicker(true)}
          style={styles.addExerciseBtn}
          accessibilityLabel="Add exercise"
        >
          <Icon icon={Plus} size={18} color={colors.textSecondary} />
          <Text variant="bodyEmphasis" color="textSecondary" style={{ marginLeft: spacing.sm }}>Add Exercise</Text>
        </Pressable>

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>

      <ExercisePickerModal
        visible={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        onAdd={handleAddExercise}
      />
    </View>
  );
}

const SETNUM_SIZE = 36;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  timer: { fontSize: 20, lineHeight: 24, marginTop: spacing.xxs },
  restTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.brandGlow,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.brand + '40',
  },
  restTime: { fontSize: 22, lineHeight: 26 },
  scrollContent: { paddingTop: spacing.base },
  exerciseCard: { marginHorizontal: spacing.base, marginBottom: spacing.base, padding: spacing.base },
  exerciseHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  setHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  setColHeader: { flex: 1, textAlign: 'center' },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  setRowComplete: { opacity: 0.7 },
  setNumBtn: {
    width: SETNUM_SIZE,
    height: SETNUM_SIZE,
    borderRadius: SETNUM_SIZE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.textTertiary,
    backgroundColor: 'transparent',
  },
  setInput: {
    flex: 1,
    backgroundColor: colors.surface3,
    color: colors.textPrimary,
    fontFamily: 'Barlow_400Regular',
    fontSize: 15,
    textAlign: 'center',
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  setInputFull: { flex: 2 },
  setInputComplete: { backgroundColor: colors.successDim },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surface3,
  },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.base,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  // Picker modal
  pickerRoot: { flex: 1, backgroundColor: colors.bg },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pickerSearch: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderRadius: radii.md,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: 'Barlow_400Regular',
    fontSize: 15,
  },
  pickerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  pickerEmpty: { paddingVertical: spacing['3xl'], alignItems: 'center' },
});
