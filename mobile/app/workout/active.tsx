/**
 * Active workout screen -- C-1 orchestrator after split.
 *
 * Slimmed-down per lens 6/8/10:
 *   - SetRow, RestTimer (Reanimated UI thread), AddExerciseSheet,
 *     ExerciseHeader, BottomBar all live in
 *     `src/features/workout/active/*`.
 *   - This file owns store wiring, PR detection, navigation, and the
 *     parent-level set-type sheet (the legacy "one Sheet per SetRow"
 *     bug).
 *   - Back-gesture intercept lives in the predictive-back wiring set
 *     up by A-2 in app.json; the discard Alert is the user-facing
 *     handle.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Check, Minus, Pause, RotateCcw } from 'lucide-react-native';
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
import {
  SetRow,
  setHasRequiredValues,
  SET_TYPE_COLORS,
  SET_TYPE_LABELS,
} from '../../src/features/workout/active/SetRow';
import { RestTimer } from '../../src/features/workout/active/RestTimer';
import { ExerciseHeader } from '../../src/features/workout/active/ExerciseHeader';
import { AddExerciseSheet, PickedExercise } from '../../src/features/workout/active/AddExerciseSheet';
import { BottomBar } from '../../src/features/workout/active/BottomBar';

const SET_TYPE_OPTIONS: { key: WorkoutSet['set_type']; label: string; desc: string }[] = [
  { key: 'normal',  label: 'Normal',  desc: 'Working set' },
  { key: 'warmup',  label: 'Warm-up', desc: "Doesn't count toward stats" },
  { key: 'dropset', label: 'Drop set', desc: 'Reduce weight, continue' },
  { key: 'failure', label: 'To failure', desc: 'Rep until you cannot' },
];

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface ExerciseCardProps {
  exercise: WorkoutExercise;
  onUpdateSets: (sets: WorkoutSet[]) => void;
  onLongPressSet: (setPosition: number) => void;
  onRemove: () => void;
  onPRCheck?: (exerciseId: string, exerciseName: string, set: WorkoutSet, loggingType: string) => void;
}

function ExerciseCard({ exercise, onUpdateSets, onLongPressSet, onRemove, onPRCheck }: ExerciseCardProps) {
  const { startRestTimer } = useWorkoutStore();

  const handleUpdateSet = (setPosition: number, updates: Partial<WorkoutSet>) => {
    const newSets = exercise.sets.map(s => s.position === setPosition ? { ...s, ...updates } : s);
    onUpdateSets(newSets);
  };

  const handleToggleComplete = (setPosition: number) => {
    const target = exercise.sets.find(s => s.position === setPosition);
    if (!target) return;
    if (!target.is_completed && !setHasRequiredValues(target, exercise.logging_type)) {
      haptic.setBlocked();
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
      haptic.setComplete();
      startRestTimer(exercise.rest_seconds);
      if (onPRCheck) onPRCheck(exercise.exercise_id, exercise.exercise_name, s, exercise.logging_type);
    } else if (s?.is_completed) {
      haptic.setComplete();
    }
  };

  const addSet = () => {
    haptic.setAdd();
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
    <Surface level={2} style={styles.exerciseCard}>
      <ExerciseHeader exercise={exercise} onRemove={onRemove} />

      <View style={styles.setHeaderRow}>
        <View style={styles.setHeaderSpacer} />
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

      {exercise.sets.map((s, i) => (
        <SetRow
          key={s.position}
          set={s}
          index={i}
          loggingType={exercise.logging_type}
          onToggleComplete={() => handleToggleComplete(s.position)}
          onUpdateSet={(updates) => handleUpdateSet(s.position, updates)}
          onLongPress={() => onLongPressSet(s.position)}
        />
      ))}

      <Pressable onPress={addSet} style={styles.addSetBtn} accessibilityLabel="Add set">
        <Icon icon={Plus} size={14} color={colors.textTertiary} />
        <Text variant="label" color="textTertiary" style={{ marginLeft: spacing.xs }}>Add Set</Text>
      </Pressable>
    </Surface>
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
    updateExerciseSets,
    setSetType,
    removeExercise,
    discardWorkout,
    tickElapsed,
    addExercise,
    pauseTimer,
    resumeTimer,
    setElapsed,
  } = useWorkoutStore();
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showTimerSheet, setShowTimerSheet] = useState(false);
  const [typeCtx, setTypeCtx] = useState<{ exercisePos: number; setPos: number; currentType: WorkoutSet['set_type'] } | null>(null);
  const [prMap, setPrMap] = useState<Record<string, Record<string, number>>>({});
  const toast = useToast();

  useEffect(() => {
    if (!active) router.replace('/(tabs)/train');
  }, [active]);

  useEffect(() => {
    const interval = setInterval(tickElapsed, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!active || active.exercises.length === 0) return;
    const ids = [...new Set(active.exercises.map(e => e.exercise_id))].join(',');
    api.get<{ data: { records: Record<string, Record<string, number>> } }>(
      `/workouts/active/personal-records?exercise_ids=${encodeURIComponent(ids)}`
    )
      .then(r => setPrMap(r.data?.records ?? {}))
      .catch(() => {});
  }, [active?.exercises.map(e => e.exercise_id).join(',')]);

  const handlePRCheck = useCallback((exerciseId: string, exerciseName: string, set: WorkoutSet, loggingType: string) => {
    const existing = prMap[exerciseId] ?? {};
    const checks: Array<{ type: string; value: number; label: string }> = [];

    if (loggingType === 'weight_reps' && set.weight_kg && set.reps) {
      const w = set.weight_kg;
      if (w > (existing.heaviest_weight ?? 0)) checks.push({ type: 'heaviest_weight', value: w, label: `${w} kg` });
      const vol = w * set.reps;
      if (vol > (existing.best_volume_set ?? 0)) checks.push({ type: 'best_volume_set', value: vol, label: `${w}x${set.reps}` });
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
    const pr = checks[0];
    haptic.success();
    toast.show(`PR! ${exerciseName} -- ${pr.label}`, 'success');
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
    pauseTimer();
    router.push('/workout/finish');
  };

  const handleDiscard = () => {
    haptic.workoutDiscard();
    Alert.alert('Discard Workout', 'This will delete your current workout. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard', style: 'destructive', onPress: () => {
          discardWorkout();
          router.replace('/(tabs)/train');
        }
      },
    ]);
  };

  const handleAddMany = useCallback((exs: PickedExercise[]) => {
    const startPosition = useWorkoutStore.getState().active?.exercises.length ?? 0;
    exs.forEach((ex, idx) => {
      addExercise({
        exercise_id: ex.id,
        exercise_name: ex.name,
        logging_type: (ex.logging_type as any) || 'weight_reps',
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

      <RestTimer />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {active.exercises.map(ex => (
          <ExerciseCard
            key={ex.exercise_id + ex.position}
            exercise={ex}
            onUpdateSets={(sets) => updateExerciseSets(ex.position, sets)}
            onLongPressSet={(setPos) => {
              const target = ex.sets.find(s => s.position === setPos);
              setTypeCtx({ exercisePos: ex.position, setPos, currentType: target?.set_type ?? 'normal' });
            }}
            onPRCheck={handlePRCheck}
            onRemove={() => {
              Alert.alert('Remove Exercise', `Remove ${ex.exercise_name}?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => removeExercise(ex.position) },
              ]);
            }}
          />
        ))}

        <BottomBar onAddExercise={() => setShowExercisePicker(true)} />

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>

      <AddExerciseSheet
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

      <Sheet visible={typeCtx !== null} onClose={() => setTypeCtx(null)} snapPoint={0.55}>
        <Text variant="title3" color="textPrimary" style={{ marginBottom: spacing.base }}>Set Type</Text>
        {SET_TYPE_OPTIONS.map((opt) => {
          const selected = typeCtx?.currentType === opt.key;
          const c = SET_TYPE_COLORS[opt.key];
          return (
            <Pressable
              key={opt.key}
              onPress={() => {
                if (typeCtx) {
                  setSetType(typeCtx.exercisePos, typeCtx.setPos, opt.key);
                  haptic.setTypeSelect();
                }
                setTypeCtx(null);
              }}
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
  scrollContent: { paddingTop: spacing.base },
  exerciseCard: { marginHorizontal: spacing.base, marginBottom: spacing.base, padding: spacing.base },
  setHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  setHeaderSpacer: { width: SETNUM_SIZE, height: SETNUM_SIZE },
  setColHeader: { flex: 1, textAlign: 'center' },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surface3,
  },
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
});
