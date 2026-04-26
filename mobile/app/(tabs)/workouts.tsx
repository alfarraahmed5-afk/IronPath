import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  ScrollView,
  FlatList,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Clock, Hash, Weight, Calendar as CalendarIcon, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWorkoutStore, ActiveWorkout } from '../../src/stores/workoutStore';
import { api } from '../../src/lib/api';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Button } from '../../src/components/Button';
import { Icon } from '../../src/components/Icon';
import { EmptyState } from '../../src/components/EmptyState';
import { Pressable } from '../../src/components/Pressable';
import { Calendar } from '../../src/components/Calendar';
import { colors, spacing, radii } from '../../src/theme/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkoutSummary {
  id: string;
  name: string;
  started_at: string;
  duration_seconds: number;
  total_sets: number;
  total_volume_kg: number;
}

interface Routine {
  id: string;
  name: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ystStart = new Date(todayStart.getTime() - 86400000);
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (dateStart.getTime() === todayStart.getTime()) return 'Today';
  if (dateStart.getTime() === ystStart.getTime()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'Just now';
}

// ─── WorkoutCard ──────────────────────────────────────────────────────────────

function WorkoutCard({ workout, onPress }: { workout: WorkoutSummary; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Surface level={2} style={styles.card}>
        <View style={styles.cardTop}>
          <Text variant="bodyEmphasis" color="textPrimary" numberOfLines={1} style={{ flex: 1, marginRight: spacing.md }}>
            {workout.name}
          </Text>
          <Text variant="caption" color="textTertiary">{formatRelativeDate(workout.started_at)}</Text>
        </View>
        <View style={styles.cardStats}>
          <View style={styles.statItem}>
            <Icon icon={Hash} size={12} color={colors.textTertiary} />
            <Text variant="caption" color="textSecondary">{workout.total_sets} sets</Text>
          </View>
          <View style={styles.statItem}>
            <Icon icon={Clock} size={12} color={colors.textTertiary} />
            <Text variant="caption" color="textSecondary">{formatDuration(workout.duration_seconds)}</Text>
          </View>
          <View style={styles.statItem}>
            <Icon icon={Weight} size={12} color={colors.textTertiary} />
            <Text variant="caption" color="textSecondary">{workout.total_volume_kg.toLocaleString()} kg</Text>
          </View>
        </View>
      </Surface>
    </TouchableOpacity>
  );
}

// ─── ResumeModal ──────────────────────────────────────────────────────────────

function ResumeModal({
  visible,
  draft,
  onResume,
  onDiscard,
}: {
  visible: boolean;
  draft: ActiveWorkout;
  onResume: () => void;
  onDiscard: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <Surface level={3} style={styles.modalBox}>
          <Text variant="title2" color="textPrimary" style={{ marginBottom: spacing.xs }}>Resume Workout?</Text>
          <Text variant="bodyEmphasis" color="textSecondary" numberOfLines={1} style={{ marginBottom: spacing.xs }}>
            {draft.workout_name}
          </Text>
          <Text variant="caption" color="textTertiary" style={{ marginBottom: spacing.xl }}>
            Started {formatTimeAgo(draft.started_at)}
          </Text>
          <Button label="Resume" onPress={onResume} variant="primary" size="lg" fullWidth />
          <View style={{ height: spacing.md }} />
          <Button label="Discard" onPress={onDiscard} variant="destructive" size="lg" fullWidth />
        </Surface>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WorkoutsScreen() {
  const router = useRouter();
  const startWorkout = useWorkoutStore(s => s.startWorkout);

  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [draftData, setDraftData] = useState<{ draft: ActiveWorkout; idempotency_key: string } | null>(null);

  useEffect(() => {
    const store = useWorkoutStore.getState();
    const draft = store.loadDraft();
    if (draft) {
      setDraftData(draft);
      setShowResumeModal(true);
    }
    fetchWorkouts(null, true);
    fetchRoutines();
  }, []);

  const fetchWorkouts = useCallback(async (cursorParam: string | null, reset = false) => {
    reset ? setLoading(true) : setLoadingMore(true);
    try {
      const url = `/workouts/history?limit=20${cursorParam ? `&cursor=${encodeURIComponent(cursorParam)}` : ''}`;
      const result = await api.get<{ data: { workouts: WorkoutSummary[]; next_cursor: string | null } }>(url);
      const fetched = result.data?.workouts ?? [];
      const nextCursor = result.data?.next_cursor ?? null;
      setWorkouts(prev => reset ? fetched : [...prev, ...fetched]);
      setCursor(nextCursor);
      setHasMore(nextCursor !== null);
    } catch {}
    finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const fetchRoutines = async () => {
    try {
      const result = await api.get<{ data: { routines: Routine[] } }>('/routines?limit=3');
      setRoutines((result.data?.routines ?? []).slice(0, 3));
    } catch {}
  };

  function handleStartWorkout() {
    startWorkout('New Workout');
    router.push('/workout/active');
  }

  function handleStartRoutine(routine: Routine) {
    startWorkout(routine.name, routine.id);
    router.push('/workout/active');
  }

  function handleResume() {
    if (!draftData) return;
    useWorkoutStore.getState().resumeWorkout(draftData.draft, draftData.idempotency_key);
    setShowResumeModal(false);
    router.push('/workout/active');
  }

  function handleDiscard() {
    useWorkoutStore.getState().clearDraft();
    setDraftData(null);
    setShowResumeModal(false);
  }

  function ListHeader() {
    return (
      <View>
        {/* Section title */}
        <Text variant="overline" color="textTertiary" style={styles.sectionLabel}>Recent Workouts</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.topBar}>
        <Text variant="title2" color="textPrimary">Workouts</Text>
      </View>

      {/* Fixed top area */}
      <View style={styles.topActions}>
        <Button
          label="Start Workout"
          onPress={handleStartWorkout}
          variant="primary"
          size="lg"
          fullWidth
        />

        {routines.length > 0 && (
          <View style={{ marginTop: spacing.md }}>
            <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.sm }}>Quick Start</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              {routines.map(routine => (
                <TouchableOpacity
                  key={routine.id}
                  onPress={() => handleStartRoutine(routine)}
                  style={styles.routinePill}
                >
                  <Text variant="label" color="textPrimary" numberOfLines={1}>{routine.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Workout list */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <WorkoutCard workout={item} onPress={() => router.push(`/workouts/${item.id}` as any)} />
          )}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={
            <EmptyState
              illustration="workouts"
              title="Your first workout starts here"
              description="Tap Start to log a session."
              action={{ label: 'Start Workout', onPress: handleStartWorkout }}
            />
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={colors.brand} style={{ paddingVertical: spacing.base }} /> : null
          }
          onEndReached={() => { if (hasMore && !loadingMore && !loading) fetchWorkouts(cursor); }}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}

      {showResumeModal && draftData && (
        <ResumeModal
          visible={showResumeModal}
          draft={draftData.draft}
          onResume={handleResume}
          onDiscard={handleDiscard}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  topActions: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  routinePill: {
    backgroundColor: colors.surface2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  sectionLabel: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    padding: spacing.base,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardStats: { flexDirection: 'row', gap: spacing.md },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalBox: {
    width: '100%',
    padding: spacing.xl,
  },
});
