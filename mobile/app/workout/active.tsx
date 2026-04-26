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
import { X, Plus, Timer, Check, Search, Pause, Play, RotateCcw, Minus } from 'lucide-react-native';
import { useWorkoutStore, WorkoutSet, WorkoutExercise } from '../../src/stores/workoutStore';
import { api } from '../../src/lib/api';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Button } from '../../src/components/Button';
import { Icon } from '../../src/components/Icon';
import { Pressable } from '../../src/components/Pressable';
import { Sheet } from '../../src/components/Sheet';
import { useToast } from '../../src/components/Toast';
import { haptic } from '../../src/lib/haptics';
import { colors, spacing, radii } from '../../src/theme/tokens';

const SET_TYPE_COLORS: Record<string, string> = {
  normal:  colors.setNormal,
  warmup:  colors.setWarmup,
  dropset: colors.setDropset,
  failure: colors.setFailure,
};

const SET_TYPE_LABELS: Record<string, string> = {
  normal:  'N',
  warmup:  'W',
  dropset: 'D',
  failure: 'F',
};

const SET_TYPE_OPTIONS: { key: WorkoutSet['set_type']; label: string; desc: string }[] = [
  { key: 'normal',  label: 'Normal',  desc: 'Working set' },
  { key: 'warmup',  label: 'Warm-up', desc: "Doesn't count toward stats" },
  { key: 'dropset', label: 'Drop set', desc: 'Reduce weight, continue' },
  { key: 'failure', label: 'To failure', desc: 'Rep until you can\'t' },
];

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Validation: a set is "complete-able" only if it has the right values for its logging type.
function setHasRequiredValues(set: WorkoutSet, loggingType: string): boolean {
  if (loggingType === 'weight_reps') {
    return set.weight_kg !== null && set.weight_kg > 0 && set.reps !== null && set.reps > 0;
  }
  if (loggingType === 'bodyweight_reps') {
    return set.reps !== null && set.reps > 0;
  }
  if (loggingType === 'duration') {
    return set.duration_seconds !== null && set.duration_seconds > 0;
  }
  if (loggingType === 'distance') {
    return set.distance_meters !== null && set.distance_meters > 0;
  }
  return false;
}

interface SetRowProps {
  set: WorkoutSet;
  index: number;
  loggingType: string;
  onToggleComplete: () => void;
  onUpdateSet: (updated: Partial<WorkoutSet>) => void;
  onChangeType: (type: WorkoutSet['set_type']) => void;
}

function SetRow({ set, index, loggingType, onToggleComplete, onUpdateSet, onChangeType }: SetRowProps) {
  const isCompleted = set.is_completed;
  const typeColor = SET_TYPE_COLORS[set.set_type] ?? colors.setNormal;
  const canComplete = setHasRequiredValues(set, loggingType);
  const [showTypePicker, setShowTypePicker] = useState(false);

  return (
    <View style={[styles.setRow, isCompleted && styles.setRowComplete]}>
      {/* Set number + type long-press */}
      <Pressable
        onPress={() => {
          if (!isCompleted && !canComplete) {
            haptic.warning();
            return;
          }
          onToggleComplete();
        }}
        onLongPress={() => setShowTypePicker(true)}
        style={[styles.setNumBtn, {
          backgroundColor: isCompleted ? colors.success : typeColor + '30',
          borderColor: isCompleted ? colors.success : typeColor,
          opacity: !isCompleted && !canComplete ? 0.45 : 1,
        }]}
        accessibilityLabel={`Set ${index + 1}, ${set.set_type}, ${isCompleted ? 'completed' : 'incomplete'}, long-press to change type`}
      >
        {isCompleted
          ? <Icon icon={Check} size={14} color={colors.textPrimary} strokeWidth={2.5} />
          : set.set_type === 'normal'
            ? <Text variant="label" style={{ color: typeColor }}>{index + 1}</Text>
            : <Text variant="label" style={{ color: typeColor, fontSize: 14 }}>{SET_TYPE_LABELS[set.set_type]}</Text>
        }
      </Pressable>

      {/* Inputs */}
      {(loggingType === 'weight_reps' || loggingType === 'bodyweight_reps') && (
        <>
          {loggingType === 'weight_reps' ? (
            <TextInput
              style={[styles.setInput, isCompleted && styles.setInputComplete]}
              placeholder="kg"
              placeholderTextColor={colors.textDisabled}
              keyboardType="decimal-pad"
              value={set.weight_kg !== null ? String(set.weight_kg) : ''}
              onChangeText={v => onUpdateSet({ weight_kg: v ? parseFloat(v) : null })}
              editable={!isCompleted}
            />
          ) : (
            <View style={[styles.setInput, { justifyContent: 'center' }]}>
              <Text variant="caption" color="textTertiary" style={{ textAlign: 'center' }}>BW</Text>
            </View>
          )}
          <TextInput
            style={[styles.setInput, isCompleted && styles.setInputComplete]}
            placeholder="reps"
            placeholderTextColor={colors.textDisabled}
            keyboardType="number-pad"
            value={set.reps !== null ? String(set.reps) : ''}
            onChangeText={v => onUpdateSet({ reps: v ? parseInt(v) : null })}
            editable={!isCompleted}
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
          editable={!isCompleted}
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
          editable={!isCompleted}
        />
      )}

      {/* Set type picker sheet */}
      <Sheet visible={showTypePicker} onClose={() => setShowTypePicker(false)} snapPoint={0.5}>
        <Text variant="title3" color="textPrimary" style={{ marginBottom: spacing.base }}>Set Type</Text>
        {SET_TYPE_OPTIONS.map((opt) => {
          const selected = set.set_type === opt.key;
          const c = SET_TYPE_COLORS[opt.key];
          return (
            <Pressable
              key={opt.key}
              onPress={() => { onChangeType(opt.key); setShowTypePicker(false); }}
              style={[styles.typePickerRow, selected && { backgroundColor: c + '15', borderColor: c }]}
              accessibilityLabel={opt.label}
            >
              <View style={[styles.typeBadge, { backgroundColor: c + '30', borderColor: c }]}>
                <Text variant="label" style={{ color: c }}>{SET_TYPE_LABELS[opt.key]}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text variant="bodyEmphasis" color={selected ? 'textPrimary' : 'textSecondary'}>{opt.label}</Text>
                <Text variant="caption" color="textTertiary">{opt.desc}</Text>
              </View>
              {selected && <Icon icon={Check} size={16} color={c} />}
            </Pressable>
          );
        })}
      </Sheet>
    </View>
  );
}

interface ExerciseCardProps {
  exercise: WorkoutExercise;
  onUpdateSets: (sets: WorkoutSet[]) => void;
  onChangeSetType: (setPosition: number, type: WorkoutSet['set_type']) => void;
  onRemove: () => void;
  onPRCheck?: (exerciseId: string, exerciseName: string, set: WorkoutSet, loggingType: string) => void;
}

function ExerciseCard({ exercise, onUpdateSets, onChangeSetType, onRemove, onPRCheck }: ExerciseCardProps) {
  const { startRestTimer } = useWorkoutStore();

  const handleUpdateSet = (setPosition: number, updates: Partial<WorkoutSet>) => {
    const newSets = exercise.sets.map(s => s.position === setPosition ? { ...s, ...updates } : s);
    onUpdateSets(newSets);
  };

  const handleToggleComplete = (setPosition: number) => {
    const target = exercise.sets.find(s => s.position === setPosition);
    if (!target) return;

    // Block toggling complete on a set with no values
    if (!target.is_completed && !setHasRequiredValues(target, exercise.logging_type)) {
      haptic.warning();
      Alert.alert(
        'Empty set',
        exercise.logging_type === 'weight_reps' ? 'Enter weight and reps before completing the set.' :
        exercise.logging_type === 'bodyweight_reps' ? 'Enter reps before completing the set.' :
        exercise.logging_type === 'duration' ? 'Enter duration before completing the set.' :
        'Enter distance before completing the set.'
      );
      return;
    }

    const newSets = exercise.sets.map(s => {
      if (s.position !== setPosition) return s;
      const completing = !s.is_completed;
      return { ...s, is_completed: completing, completed_at: completing ? new Date().toISOString() : null };
    });
    onUpdateSets(newSets);
    const s = newSets.find(s => s.position === setPosition);
    if (s?.is_completed && s.set_type !== 'warmup') {
      haptic.light();
      startRestTimer(exercise.rest_seconds);
      // Live PR check for working sets
      if (onPRCheck) onPRCheck(exercise.exercise_id, exercise.exercise_name, s, exercise.logging_type);
    } else if (s?.is_completed) {
      haptic.light();
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
            {completedCount}/{totalCount} sets · {exercise.rest_seconds}s rest
          </Text>
        </View>
        <Pressable onPress={onRemove} style={styles.removeBtn} accessibilityLabel="Remove exercise">
          <Icon icon={X} size={16} color={colors.textTertiary} />
        </Pressable>
      </View>

      {/* Column headers */}
      <View style={styles.setHeaderRow}>
        <View style={styles.setNumBtn} />
        {exercise.logging_type === 'weight_reps' && (
          <>
            <Text variant="overline" color="textTertiary" style={styles.setColHeader}>KG</Text>
            <Text variant="overline" color="textTertiary" style={styles.setColHeader}>REPS</Text>
          </>
        )}
        {exercise.logging_type === 'bodyweight_reps' && (
          <>
            <Text variant="overline" color="textTertiary" style={styles.setColHeader}>BODY</Text>
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
          onChangeType={(type) => onChangeSetType(s.position, type)}
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
  onAddMany,
}: {
  visible: boolean;
  onClose: () => void;
  onAddMany: (exs: any[]) => void;
}) {
  const [exercises, setExercises] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [equipment, setEquipment] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ limit: '50' });
      if (searchText) params.set('search', searchText);
      if (equipment) params.set('equipment', equipment);
      api.get<any>(`/exercises?${params.toString()}`)
        .then(r => setExercises(r.data.exercises || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);
  }, [visible, searchText, equipment]);

  function handleClose() {
    setSearchText('');
    setSelectedIds([]);
    setEquipment('');
    onClose();
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function handleAddSelected() {
    const picks = exercises.filter(e => selectedIds.includes(e.id));
    if (picks.length === 0) return;
    onAddMany(picks);
    handleClose();
  }

  const EQUIPMENT_PILLS = ['', 'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.pickerRoot} edges={['top']}>
        <View style={styles.pickerHeader}>
          <Text variant="title3" color="textPrimary" style={{ flex: 1 }}>
            Add Exercises{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
          </Text>
          <Pressable onPress={handleClose} accessibilityLabel="Close" style={{ paddingHorizontal: spacing.sm }}>
            <Text variant="label" color="textSecondary">Cancel</Text>
          </Pressable>
        </View>

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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.equipScroll}>
          {EQUIPMENT_PILLS.map((eq) => {
            const active = equipment === eq;
            return (
              <Pressable
                key={eq || 'all'}
                onPress={() => setEquipment(eq)}
                style={[styles.equipPill, active && { backgroundColor: colors.brand }]}
                accessibilityLabel={eq || 'All equipment'}
              >
                <Text variant="label" color={active ? 'textOnBrand' : 'textTertiary'}>
                  {eq ? eq.charAt(0).toUpperCase() + eq.slice(1) : 'All'}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.pickerLoading}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : (
          <FlatList
            data={exercises}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const selected = selectedIds.includes(item.id);
              return (
                <Pressable
                  onPress={() => toggleSelect(item.id)}
                  style={[styles.pickerRow, selected && { backgroundColor: colors.brandGlow }]}
                  accessibilityLabel={item.name}
                >
                  <View style={[styles.pickerCheck, selected && { backgroundColor: colors.brand, borderColor: colors.brand }]}>
                    {selected ? <Icon icon={Check} size={12} color={colors.textPrimary} strokeWidth={3} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyEmphasis" color="textPrimary" numberOfLines={1}>{item.name}</Text>
                    <Text variant="caption" color="textTertiary" numberOfLines={1} style={{ marginTop: spacing.xxs }}>
                      {(item.equipment || 'Other').replace(/_/g, ' ')}
                      {item.primary_muscles?.length ? ' · ' + item.primary_muscles[0] : ''}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.pickerEmpty}>
                <Text variant="body" color="textTertiary">No exercises found</Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.base }} />}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Sticky add button */}
        {selectedIds.length > 0 && (
          <View style={styles.pickerFooter}>
            <Button
              label={`Add ${selectedIds.length} exercise${selectedIds.length > 1 ? 's' : ''}`}
              onPress={handleAddSelected}
              variant="primary"
              size="lg"
              fullWidth
            />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function TimerControlSheet({
  visible,
  onClose,
  elapsedSeconds,
  isPaused,
  onPause,
  onResume,
  onReset,
  onSetElapsed,
}: {
  visible: boolean;
  onClose: () => void;
  elapsedSeconds: number;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSetElapsed: (s: number) => void;
}) {
  const adjust = (delta: number) => onSetElapsed(elapsedSeconds + delta);

  return (
    <Sheet visible={visible} onClose={onClose} snapPoint={0.45}>
      <Text variant="title3" color="textPrimary" style={{ marginBottom: spacing.base }}>Workout Timer</Text>

      <View style={styles.timerDisplay}>
        <Text variant="display3" color="brand" style={{ fontVariant: ['tabular-nums'] }}>{formatTime(elapsedSeconds)}</Text>
        <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xs }}>
          {isPaused ? 'Paused' : 'Running'}
        </Text>
      </View>

      {/* Adjust controls */}
      <View style={styles.adjustRow}>
        <Pressable onPress={() => adjust(-60)} style={styles.adjustBtn} accessibilityLabel="Subtract 1 minute">
          <Icon icon={Minus} size={14} color={colors.textPrimary} />
          <Text variant="label" color="textPrimary" style={{ marginLeft: spacing.xxs }}>1m</Text>
        </Pressable>
        <Pressable onPress={() => adjust(-10)} style={styles.adjustBtn} accessibilityLabel="Subtract 10 seconds">
          <Icon icon={Minus} size={14} color={colors.textPrimary} />
          <Text variant="label" color="textPrimary" style={{ marginLeft: spacing.xxs }}>10s</Text>
        </Pressable>
        <Pressable onPress={() => adjust(10)} style={styles.adjustBtn} accessibilityLabel="Add 10 seconds">
          <Icon icon={Plus} size={14} color={colors.textPrimary} />
          <Text variant="label" color="textPrimary" style={{ marginLeft: spacing.xxs }}>10s</Text>
        </Pressable>
        <Pressable onPress={() => adjust(60)} style={styles.adjustBtn} accessibilityLabel="Add 1 minute">
          <Icon icon={Plus} size={14} color={colors.textPrimary} />
          <Text variant="label" color="textPrimary" style={{ marginLeft: spacing.xxs }}>1m</Text>
        </Pressable>
      </View>

      {/* Action buttons */}
      <View style={styles.timerActions}>
        {isPaused ? (
          <Button label="Resume" onPress={() => { onResume(); onClose(); }} variant="primary" size="md" fullWidth />
        ) : (
          <Button label="Pause" onPress={onPause} variant="secondary" size="md" fullWidth />
        )}
        <View style={{ height: spacing.sm }} />
        <Pressable
          onPress={() => {
            Alert.alert('Reset Timer', 'Set elapsed time back to zero?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Reset', style: 'destructive', onPress: () => { onReset(); onClose(); } },
            ]);
          }}
          style={styles.resetBtn}
          accessibilityLabel="Reset timer"
        >
          <Icon icon={RotateCcw} size={14} color={colors.danger} />
          <Text variant="label" color="danger" style={{ marginLeft: spacing.xs }}>Reset to 0:00</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const {
    active,
    isPaused,
    restTimer,
    updateExerciseSets,
    setSetType,
    removeExercise,
    discardWorkout,
    tickElapsed,
    clearRestTimer,
    adjustRestTimer,
    addExercise,
    pauseTimer,
    resumeTimer,
    setElapsed,
  } = useWorkoutStore();
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showTimerSheet, setShowTimerSheet] = useState(false);
  // Live PR map: exercise_id -> { record_type -> max_value }
  const [prMap, setPrMap] = useState<Record<string, Record<string, number>>>({});
  const toast = useToast();

  useEffect(() => {
    if (!active) router.replace('/(tabs)/workouts');
  }, [active]);

  useEffect(() => {
    const interval = setInterval(tickElapsed, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch existing PRs for the active workout's exercises (one shot on mount/change of exercise list)
  useEffect(() => {
    if (!active || active.exercises.length === 0) return;
    const ids = [...new Set(active.exercises.map(e => e.exercise_id))].join(',');
    api.get<{ data: { records: Record<string, Record<string, number>> } }>(
      `/workouts/active/personal-records?exercise_ids=${encodeURIComponent(ids)}`
    )
      .then(r => setPrMap(r.data?.records ?? {}))
      .catch(() => {});
  }, [active?.exercises.map(e => e.exercise_id).join(',')]);

  // Live PR check: called when a working set is completed
  const handlePRCheck = useCallback((exerciseId: string, exerciseName: string, set: WorkoutSet, loggingType: string) => {
    const existing = prMap[exerciseId] ?? {};
    const checks: Array<{ type: string; value: number; label: string }> = [];

    if (loggingType === 'weight_reps' && set.weight_kg && set.reps) {
      const w = set.weight_kg;
      if (w > (existing.heaviest_weight ?? 0)) checks.push({ type: 'heaviest_weight', value: w, label: `${w} kg` });
      const vol = w * set.reps;
      if (vol > (existing.best_volume_set ?? 0)) checks.push({ type: 'best_volume_set', value: vol, label: `${w}×${set.reps}` });
    } else if (loggingType === 'bodyweight_reps' && set.reps) {
      if (set.reps > (existing.most_reps ?? 0)) checks.push({ type: 'most_reps', value: set.reps, label: `${set.reps} reps` });
    } else if (loggingType === 'duration' && set.duration_seconds) {
      if (set.duration_seconds > (existing.longest_duration ?? 0)) {
        const m = Math.floor(set.duration_seconds / 60), s = set.duration_seconds % 60;
        checks.push({ type: 'longest_duration', value: set.duration_seconds, label: `${m}:${String(s).padStart(2,'0')}` });
      }
    } else if (loggingType === 'distance' && set.distance_meters) {
      if (set.distance_meters > (existing.longest_distance ?? 0)) checks.push({ type: 'longest_distance', value: set.distance_meters, label: `${set.distance_meters} m` });
    }

    if (checks.length === 0) return;
    // Take the highest-priority PR (first one)
    const pr = checks[0];
    haptic.success();
    toast.show(`PR! ${exerciseName} · ${pr.label}`, 'success');
    // Update local map so subsequent sets compare to the new high
    setPrMap(prev => ({
      ...prev,
      [exerciseId]: { ...(prev[exerciseId] ?? {}), ...checks.reduce((a, c) => ({ ...a, [c.type]: c.value }), {}) },
    }));
  }, [prMap, toast]);

  const handleFinish = () => {
    if (!active) return;
    const completedSets = active.exercises.flatMap(ex => ex.sets.filter(s => s.is_completed));
    if (completedSets.length === 0) {
      Alert.alert('No completed sets', 'Complete at least one set before finishing.');
      return;
    }
    pauseTimer(); // Pause elapsed timer when entering finish screen
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

  const handleAddMany = useCallback((exs: any[]) => {
    const startPosition = useWorkoutStore.getState().active?.exercises.length ?? 0;
    exs.forEach((ex, idx) => {
      addExercise({
        exercise_id: ex.id,
        exercise_name: ex.name,
        logging_type: ex.logging_type || 'weight_reps',
        position: startPosition + idx,
        superset_group: null,
        rest_seconds: 90,
        notes: '',
        sets: [{
          position: 0, set_type: 'normal',
          weight_kg: null, reps: null, duration_seconds: null,
          distance_meters: null, rpe: null, is_completed: false, completed_at: null,
        }],
      });
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
            <Pressable onPress={() => setShowTimerSheet(true)} accessibilityLabel="Workout timer controls">
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xxs }}>
                <Text variant="numeric" color="brand" style={styles.timer}>{formatTime(active.elapsed_seconds)}</Text>
                {isPaused && (
                  <View style={styles.pausedBadge}>
                    <Icon icon={Pause} size={10} color={colors.warning} />
                    <Text variant="overline" style={{ color: colors.warning, marginLeft: 4 }}>PAUSED</Text>
                  </View>
                )}
              </View>
            </Pressable>
          </View>
          <Button label="Discard" onPress={handleDiscard} variant="ghost" size="sm" style={{ marginRight: spacing.sm } as any} />
          <Button label="Finish" onPress={handleFinish} variant="primary" size="sm" />
        </View>
      </SafeAreaView>

      {/* Rest timer */}
      {restTimer !== null && (
        <View style={styles.restTimer}>
          <Icon icon={Timer} size={16} color={colors.brand} />
          <Text variant="bodyEmphasis" color="textPrimary" style={{ marginLeft: spacing.sm, flex: 1 }}>Rest</Text>
          <Pressable onPress={() => adjustRestTimer(-15)} style={styles.restAdjust} accessibilityLabel="Subtract 15s">
            <Icon icon={Minus} size={14} color={colors.textSecondary} />
          </Pressable>
          <Text variant="numeric" color="brand" style={styles.restTime}>{formatTime(restTimer)}</Text>
          <Pressable onPress={() => adjustRestTimer(15)} style={styles.restAdjust} accessibilityLabel="Add 15s">
            <Icon icon={Plus} size={14} color={colors.textSecondary} />
          </Pressable>
          <Pressable onPress={clearRestTimer} style={{ marginLeft: spacing.sm }} accessibilityLabel="Skip rest">
            <Text variant="caption" color="textTertiary">Skip</Text>
          </Pressable>
        </View>
      )}

      {/* Exercise list */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {active.exercises.map(ex => (
          <ExerciseCard
            key={ex.exercise_id + ex.position}
            exercise={ex}
            onUpdateSets={(sets) => updateExerciseSets(ex.position, sets)}
            onChangeSetType={(setPos, type) => setSetType(ex.position, setPos, type)}
            onPRCheck={handlePRCheck}
            onRemove={() => {
              Alert.alert('Remove Exercise', `Remove ${ex.exercise_name}?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => removeExercise(ex.position) },
              ]);
            }}
          />
        ))}

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
        onAddMany={handleAddMany}
      />

      <TimerControlSheet
        visible={showTimerSheet}
        onClose={() => setShowTimerSheet(false)}
        elapsedSeconds={active.elapsed_seconds}
        isPaused={isPaused}
        onPause={() => { pauseTimer(); }}
        onResume={() => { resumeTimer(); }}
        onReset={() => { setElapsed(0); }}
        onSetElapsed={setElapsed}
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
  timer: { fontSize: 20, lineHeight: 24 },
  pausedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    backgroundColor: colors.warning + '20',
    borderRadius: radii.sm,
  },
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
  restAdjust: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xs,
  },
  restTime: { fontSize: 22, lineHeight: 26, minWidth: 64, textAlign: 'center' },
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
  setRowComplete: {},
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
  // Type picker
  typePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: spacing.xs,
  },
  typeBadge: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Timer sheet
  timerDisplay: { alignItems: 'center', paddingVertical: spacing.xl },
  adjustRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.lg },
  adjustBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface3,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  timerActions: { paddingTop: spacing.sm },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md },
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
  equipScroll: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, gap: spacing.sm },
  equipPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.surface2,
  },
  pickerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  pickerCheck: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerEmpty: { paddingVertical: spacing['3xl'], alignItems: 'center' },
  pickerFooter: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
