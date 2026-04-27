import { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pause, Play, TrendingUp, Minus, TrendingDown } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { useWorkoutStore, WorkoutExercise } from '../../src/stores/workoutStore';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, spacing } from '../../src/theme/tokens';

interface NextSession {
  session_label: string;
  session_number: number;
  template_name: string;
  is_paused: boolean;
  exercises: Array<{
    exercise_id: string;
    exercise_name: string;
    sets: number;
    reps: number | null;
    reps_min: number | null;
    reps_max: number | null;
    target_duration_seconds: number | null;
    prescribed_weight_kg: number | null;
    rest_seconds: number;
    is_lower_body: boolean;
  }>;
}

interface ProgressExercise {
  exercise_id: string;
  exercise_name: string;
  trend: 'trending_up' | 'stalled' | 'deloaded';
  current_weight_kg: number;
  sessions_logged: number;
  consecutive_failures: number;
  consecutive_successes: number;
}

interface Progress {
  program_name: string;
  total_sessions: number;
  increment_multiplier: number;
  exercises: ProgressExercise[];
}

function formatPrescription(ex: NextSession['exercises'][number]): string {
  if (ex.target_duration_seconds) {
    const m = Math.floor(ex.target_duration_seconds / 60);
    const s = ex.target_duration_seconds % 60;
    return `${ex.sets} × ${m > 0 ? `${m}m ` : ''}${s > 0 ? `${s}s` : ''}`;
  }
  if (ex.reps_min !== null && ex.reps_max !== null) return `${ex.sets} × ${ex.reps_min}–${ex.reps_max} reps`;
  if (ex.reps !== null) return `${ex.sets} × ${ex.reps} reps`;
  return `${ex.sets} sets`;
}

const TREND_ICONS = {
  trending_up: TrendingUp,
  stalled: Minus,
  deloaded: TrendingDown,
};
const TREND_COLORS = {
  trending_up: colors.success,
  stalled: colors.textTertiary,
  deloaded: colors.warning,
};

export default function TrainerScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [noProgram, setNoProgram] = useState(false);
  const [session, setSession] = useState<NextSession | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [tab, setTab] = useState<'session' | 'progress'>('session');
  const [pausing, setPausing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [sessionRes, progressRes] = await Promise.allSettled([
        api.get<{ data: NextSession }>('/trainer/next-session'),
        api.get<{ data: Progress }>('/trainer/progress'),
      ]);
      if (sessionRes.status === 'fulfilled') {
        setSession(sessionRes.value.data);
        setNoProgram(false);
      } else {
        // The api wrapper throws the JSON body on non-2xx responses. Inspect
        // the error code rather than a response.status that doesn't exist.
        const err: any = sessionRes.reason;
        const code = err?.error?.code ?? err?.code;
        const message: string = err?.error?.message ?? err?.message ?? '';
        if (code === 'NOT_FOUND' || /no active.*program/i.test(message)) {
          setNoProgram(true);
        } else if (code === 'PROGRAM_PAUSED') {
          // Paused programs return 400 on /next-session; surface a paused-only
          // view by setting a stub session with is_paused=true and no exercises.
          setNoProgram(false);
          setSession({
            session_label: 'Paused',
            session_number: 0,
            template_name: '',
            is_paused: true,
            exercises: [],
          });
        }
      }
      if (progressRes.status === 'fulfilled') setProgress(progressRes.value.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  function handleStartSession() {
    if (!session) return;
    // If the template returned 0 exercises (e.g. wger_id mismatch), start a
    // blank named workout — the user can add exercises in-flight.
    if (session.exercises.length === 0) {
      useWorkoutStore.getState().startWorkout(`${session.template_name || 'AI Trainer'} · ${session.session_label || 'Session'}`, null, []);
      router.push('/workout/active');
      return;
    }
    // Convert the trainer session into the workout store's WorkoutExercise shape
    const exercises: WorkoutExercise[] = session.exercises.map((ex, i) => ({
      exercise_id: ex.exercise_id,
      exercise_name: ex.exercise_name,
      logging_type: 'weight_reps',
      position: i,
      superset_group: null,
      rest_seconds: ex.rest_seconds,
      notes: '',
      sets: Array.from({ length: ex.sets }, (_, sIdx) => ({
        position: sIdx,
        set_type: 'normal' as const,
        weight_kg: ex.prescribed_weight_kg,
        reps: ex.reps ?? ex.reps_max ?? null,
        duration_seconds: ex.target_duration_seconds,
        distance_meters: null,
        rpe: null,
        is_completed: false,
        completed_at: null,
      })),
    }));
    useWorkoutStore.getState().startWorkout(`${session.template_name} · ${session.session_label}`, null, exercises);
    router.push('/workout/active');
  }

  useEffect(() => { load(); }, [load]);

  async function togglePause() {
    if (!session) return;
    const newPaused = !session.is_paused;
    setPausing(true);
    try {
      await api.patch('/trainer/program', { is_paused: newPaused });
      setSession(prev => prev ? { ...prev, is_paused: newPaused } : prev);
    } catch {
      Alert.alert('Error', 'Could not update program status.');
    } finally {
      setPausing(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.centered}><ActivityIndicator color={colors.brand} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (noProgram) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.topBar}>
          <Text variant="title2" color="textPrimary">Trainer</Text>
        </View>
        <View style={styles.centered}>
          <EmptyState
            illustration="exercises"
            title="Build your program"
            description="Set goals, equipment, and frequency. We'll build the plan."
            action={{ label: 'Get Started', onPress: () => router.push('/trainer/onboarding') }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text variant="title2" color="textPrimary">Trainer</Text>
          {session && <Text variant="caption" color="textTertiary">{session.template_name}</Text>}
        </View>
        <TouchableOpacity
          onPress={togglePause}
          disabled={pausing}
          style={styles.pauseBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {session?.is_paused
            ? <Play size={16} color={colors.brand} strokeWidth={2} />
            : <Pause size={16} color={colors.textSecondary} strokeWidth={2} />}
          <Text variant="label" color={session?.is_paused ? 'brand' : 'textSecondary'}>
            {pausing ? '…' : session?.is_paused ? 'Resume' : 'Pause'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabSwitcher}>
        {(['session', 'progress'] as const).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tabBtn, { backgroundColor: tab === t ? colors.brand : 'transparent' }]}
          >
            <Text variant="label" color={tab === t ? 'textOnBrand' : 'textSecondary'}>
              {t === 'session' ? 'Next Session' : 'Progress'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
      >
        {tab === 'session' && session && (
          <View style={{ gap: spacing.md }}>
            {session.is_paused && (
              <Surface level={3} style={[styles.pausedBanner, { borderColor: colors.warning }]}>
                <Text variant="bodyEmphasis" style={{ color: colors.warning }}>Program Paused</Text>
                <Text variant="caption" style={{ color: colors.warning, opacity: 0.7, marginTop: 2 }}>
                  Resume to continue tracking progression.
                </Text>
              </Surface>
            )}

            <View>
              <Text variant="title3" color="textPrimary">{session.session_label}</Text>
              <Text variant="caption" color="textTertiary">Session {session.session_number}</Text>
            </View>

            {session.exercises.length === 0 ? (
              <Surface level={2} style={styles.emptyExercises}>
                <Text variant="bodyEmphasis" color="textPrimary">No prescribed exercises</Text>
                <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xs }}>
                  Your program template hasn't been linked to specific exercises yet.
                  Tap below to start a blank workout — you can add exercises manually.
                </Text>
              </Surface>
            ) : session.exercises.map((ex, idx) => (
              <Surface key={ex.exercise_id + idx} level={2} style={styles.exerciseCard}>
                <View style={styles.exRow}>
                  <Text variant="bodyEmphasis" color="textPrimary" style={{ flex: 1, marginRight: spacing.sm }}>
                    {ex.exercise_name}
                  </Text>
                  <Text variant="label" color="textTertiary">{formatPrescription(ex)}</Text>
                </View>
                <View style={styles.exMeta}>
                  {ex.prescribed_weight_kg !== null && (
                    <View style={styles.metaItem}>
                      <Text variant="caption" color="textTertiary">Weight</Text>
                      <Text variant="bodyEmphasis" color="brand">{ex.prescribed_weight_kg} kg</Text>
                    </View>
                  )}
                  <View style={styles.metaItem}>
                    <Text variant="caption" color="textTertiary">Rest</Text>
                    <Text variant="bodyEmphasis" color="textSecondary">{ex.rest_seconds}s</Text>
                  </View>
                  {ex.is_lower_body && (
                    <View style={[styles.lowerPill, { backgroundColor: colors.info + '20', borderColor: colors.info }]}>
                      <Text variant="overline" style={{ color: colors.info }}>Lower</Text>
                    </View>
                  )}
                </View>
              </Surface>
            ))}

            <Button
              label={session.exercises.length === 0 ? 'Start Empty Workout' : 'Start This Session'}
              onPress={handleStartSession}
              variant="primary"
              size="lg"
              fullWidth
              // Only disable when paused. If exercises is empty we still let
              // the user start a blank workout (they can add exercises in-flight).
              disabled={session.is_paused}
            />
          </View>
        )}

        {tab === 'progress' && progress && (
          <View style={{ gap: spacing.md }}>
            <View style={styles.progStats}>
              <Surface level={2} style={[styles.progStatCard, { flex: 1 }]}>
                <Text variant="numeric" color="textPrimary">{progress.total_sessions}</Text>
                <Text variant="overline" color="textTertiary">Sessions</Text>
              </Surface>
              <Surface level={2} style={[styles.progStatCard, { flex: 1 }]}>
                <Text variant="numeric" color="textPrimary">
                  {progress.increment_multiplier === 1.0 ? '1×' : progress.increment_multiplier === 1.25 ? '1.25×' : '0.75×'}
                </Text>
                <Text variant="overline" color="textTertiary">Increment</Text>
              </Surface>
            </View>

            <Text variant="overline" color="textTertiary">Exercise Progress</Text>

            {progress.exercises.length === 0 ? (
              <Text variant="body" color="textTertiary" style={{ textAlign: 'center', paddingVertical: spacing.xl }}>
                Complete a session to see your progress here.
              </Text>
            ) : progress.exercises.map(ex => {
              const TrendIcon = TREND_ICONS[ex.trend];
              return (
                <Surface key={ex.exercise_id} level={2} style={styles.progressCard}>
                  <View style={styles.exRow}>
                    <Text variant="bodyEmphasis" color="textPrimary" style={{ flex: 1 }}>{ex.exercise_name}</Text>
                    <TrendIcon size={18} color={TREND_COLORS[ex.trend]} strokeWidth={2} />
                  </View>
                  <View style={styles.exMeta}>
                    <View style={styles.metaItem}>
                      <Text variant="numeric" color="brand" style={{ fontSize: 20, lineHeight: 24 }}>{ex.current_weight_kg} kg</Text>
                      <Text variant="caption" color="textTertiary">Current</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text variant="numeric" color="textSecondary" style={{ fontSize: 20, lineHeight: 24 }}>{ex.sessions_logged}</Text>
                      <Text variant="caption" color="textTertiary">Sessions</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text variant="numeric" color="textSecondary" style={{ fontSize: 20, lineHeight: 24 }}>{ex.consecutive_successes}</Text>
                      <Text variant="caption" color="textTertiary">Streak</Text>
                    </View>
                  </View>
                </Surface>
              );
            })}

            <Button
              label="Reset / New Program"
              onPress={() => router.push('/trainer/onboarding')}
              variant="ghost"
              size="md"
              fullWidth
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabSwitcher: {
    flexDirection: 'row',
    marginHorizontal: spacing.base,
    marginVertical: spacing.md,
    backgroundColor: colors.surface2,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  scrollContent: { paddingHorizontal: spacing.base, paddingBottom: 32, gap: spacing.md },
  pausedBanner: { padding: spacing.base, borderWidth: 1, borderRadius: 12 },
  emptyExercises: { padding: spacing.base, alignItems: 'center' },
  exerciseCard: { padding: spacing.base },
  exRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  exMeta: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center', flexWrap: 'wrap' },
  metaItem: { gap: 2 },
  lowerPill: { borderWidth: 1, borderRadius: 12, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  progStats: { flexDirection: 'row', gap: spacing.md },
  progStatCard: { padding: spacing.base, alignItems: 'center', gap: spacing.xs },
  progressCard: { padding: spacing.base },
});
