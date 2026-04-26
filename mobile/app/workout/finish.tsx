import { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { CheckCircle2, AlertTriangle } from 'lucide-react-native';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { api } from '../../src/lib/api';
import { Header } from '../../src/components/Header';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Icon } from '../../src/components/Icon';
import { colors, spacing, radii } from '../../src/theme/tokens';

type Visibility = 'public' | 'followers' | 'private';

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

async function requestPushPermission(): Promise<void> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return;
    await new Promise<void>(resolve => {
      Alert.alert(
        'Stay in the Loop',
        'Enable notifications to get PR alerts, badge unlocks, and rest timer reminders.',
        [
          { text: 'Not Now', style: 'cancel', onPress: () => resolve() },
          {
            text: 'Enable',
            onPress: async () => {
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
            },
          },
        ]
      );
    });
  } catch {}
}

const VISIBILITY_OPTIONS: { key: Visibility; label: string; desc: string }[] = [
  { key: 'public', label: 'Public', desc: 'Everyone' },
  { key: 'followers', label: 'Followers', desc: 'Followers only' },
  { key: 'private', label: 'Private', desc: 'Only you' },
];

export default function FinishWorkoutScreen() {
  const router = useRouter();
  const workout = useWorkoutStore(s => s.active);
  const idempotency_key = useWorkoutStore(s => s.idempotency_key);
  const finishWorkout = useWorkoutStore(s => s.finishWorkout);
  const resumeTimer = useWorkoutStore(s => s.resumeTimer);

  const [workoutName, setWorkoutName] = useState(workout?.workout_name ?? '');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [saving, setSaving] = useState(false);

  // Resume the workout timer when navigating back without saving.
  // (active.tsx pauses on entering this screen.)
  useEffect(() => {
    return () => {
      // If the workout still exists when this screen unmounts, the user backed
      // out without finishing — resume timer.
      if (useWorkoutStore.getState().active) {
        resumeTimer();
      }
    };
  }, [resumeTimer]);

  if (!workout) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Text variant="body" color="textSecondary">No active workout.</Text>
      </View>
    );
  }

  const completedNonWarmupSets = workout.exercises
    .flatMap(ex => ex.sets.filter(s => s.is_completed && s.set_type !== 'warmup')).length;
  const incompleteCount = workout.exercises
    .flatMap(ex => ex.sets.filter(s => !s.is_completed)).length;

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const body = {
        idempotency_key,
        client_upload_uuid: workout!.client_upload_uuid,
        media_filenames: [],
        name: workoutName.trim() || workout!.workout_name,
        description,
        visibility,
        started_at: workout!.started_at,
        duration_seconds: workout!.elapsed_seconds,
        routine_id: workout!.routine_id,
        exercises: workout!.exercises.map(ex => ({
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
        '/workouts', body
      );

      finishWorkout();

      const prs = result.data?.prs_detected ?? [];
      if (result.data?.workout?.ordinal_number === 1) {
        await requestPushPermission();
      }

      if (prs.length > 0) {
        router.replace({ pathname: '/workout/celebrate', params: { prs: prs.join(',') } } as any);
      } else {
        router.replace('/(tabs)/workouts');
      }
    } catch {
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      <Header title="Finish Workout" back />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Incomplete sets warning */}
        {incompleteCount > 0 && (
          <Surface level={3} style={[styles.warningBanner, { borderColor: colors.warning }]}>
            <Icon icon={AlertTriangle} size={18} color={colors.warning} />
            <Text variant="label" style={{ color: colors.warning, flex: 1, marginLeft: spacing.sm }}>
              {incompleteCount} set{incompleteCount > 1 ? 's' : ''} unfinished — they won't count toward your stats.
            </Text>
          </Surface>
        )}

        {/* Summary */}
        <Surface level={2} style={styles.summaryCard}>
          <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.md }}>Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCell}>
              <Text variant="numeric" color="textPrimary">{completedNonWarmupSets}</Text>
              <Text variant="overline" color="textTertiary">Sets</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCell}>
              <Text variant="numeric" color="textPrimary">{workout.exercises.length}</Text>
              <Text variant="overline" color="textTertiary">Exercises</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCell}>
              <Text variant="numeric" color="textPrimary">{formatDuration(workout.elapsed_seconds)}</Text>
              <Text variant="overline" color="textTertiary">Duration</Text>
            </View>
          </View>
        </Surface>

        {/* Workout name */}
        <Input
          label="Workout Name"
          value={workoutName}
          onChangeText={setWorkoutName}
          placeholder="Name your workout"
          returnKeyType="done"
        />
        <View style={{ height: spacing.base }} />

        {/* Description */}
        <Input
          label="Notes"
          value={description}
          onChangeText={setDescription}
          placeholder="Optional notes"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          style={{ minHeight: 72, paddingTop: spacing.md }}
        />
        <View style={{ height: spacing.base }} />

        {/* Visibility */}
        <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.sm }}>Visibility</Text>
        <Surface level={2} style={styles.visRow}>
          {VISIBILITY_OPTIONS.map((opt, i) => {
            const selected = visibility === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setVisibility(opt.key)}
                style={[
                  styles.visCell,
                  i < VISIBILITY_OPTIONS.length - 1 && styles.visCellBorder,
                  selected && styles.visCellSelected,
                ]}
              >
                <Text variant="label" color={selected ? 'brand' : 'textSecondary'}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </Surface>
        <View style={{ height: spacing.xl }} />

        {/* Exercise list */}
        <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.sm }}>Exercises</Text>
        <Surface level={2}>
          {workout.exercises.length === 0 ? (
            <View style={styles.emptyEx}>
              <Text variant="body" color="textTertiary">No exercises logged</Text>
            </View>
          ) : workout.exercises.map((ex, idx) => {
            const completed = ex.sets.filter(s => s.is_completed).length;
            const total = ex.sets.length;
            const allDone = completed === total;
            return (
              <View
                key={ex.exercise_id + ex.position}
                style={[styles.exRow, idx < workout.exercises.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
              >
                <Text variant="bodyEmphasis" color="textPrimary" numberOfLines={1} style={{ flex: 1 }}>{ex.exercise_name}</Text>
                <View style={[styles.setBadge, { backgroundColor: allDone ? colors.successDim : colors.surface3 }]}>
                  {allDone && <CheckCircle2 size={12} color={colors.success} strokeWidth={2} />}
                  <Text variant="caption" color={allDone ? 'success' : 'textTertiary'}>{completed}/{total}</Text>
                </View>
              </View>
            );
          })}
        </Surface>
      </ScrollView>

      {/* Save */}
      <View style={styles.saveBar}>
        <Button
          label="Save Workout"
          onPress={handleSave}
          variant="primary"
          size="lg"
          loading={saving}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: spacing.base, paddingBottom: 24, gap: spacing.base },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  summaryCard: { padding: spacing.base },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryCell: { flex: 1, alignItems: 'center', gap: spacing.xxs },
  summaryDivider: { width: StyleSheet.hairlineWidth, height: 40, backgroundColor: colors.border },
  visRow: { flexDirection: 'row' },
  visCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  visCellBorder: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
  visCellSelected: {
    backgroundColor: colors.brandGlow,
  },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  setBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.sm,
  },
  emptyEx: { padding: spacing.base },
  saveBar: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['2xl'],
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
