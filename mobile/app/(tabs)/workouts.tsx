import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useWorkoutStore, ActiveWorkout } from '../../src/stores/workoutStore';
import { api } from '../../src/lib/api';

const ORANGE = '#FF6B35';

// ─── Format helpers ────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateStart.getTime() === todayStart.getTime()) return 'Today';
  if (dateStart.getTime() === yesterdayStart.getTime()) return 'Yesterday';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function formatVolume(kg: number): string {
  return `${kg % 1 === 0 ? kg.toFixed(0) : kg.toFixed(1)} kg`;
}

function formatTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

// ─── Types ─────────────────────────────────────────────────────────────────────

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

// ─── Workout card ──────────────────────────────────────────────────────────────

function WorkoutCard({ workout, onPress }: { workout: WorkoutSummary; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-gray-900 rounded-2xl mx-4 mb-3 px-4 py-4"
    >
      <View className="flex-row items-start justify-between mb-1">
        <Text className="text-white font-bold text-base flex-1 mr-2" numberOfLines={1}>
          {workout.name}
        </Text>
        <Text className="text-gray-400 text-sm">{formatRelativeDate(workout.started_at)}</Text>
      </View>
      <View className="flex-row items-center mt-2 gap-x-3">
        <Text className="text-gray-400 text-sm">{workout.total_sets} sets</Text>
        <Text className="text-gray-700">·</Text>
        <Text className="text-gray-400 text-sm">{formatDuration(workout.duration_seconds)}</Text>
        <Text className="text-gray-700">·</Text>
        <Text className="text-gray-400 text-sm">{formatVolume(workout.total_volume_kg)}</Text>
      </View>
    </Pressable>
  );
}

// ─── Resume modal ──────────────────────────────────────────────────────────────

interface ResumeModalProps {
  visible: boolean;
  draft: ActiveWorkout;
  idempotencyKey: string;
  onResume: () => void;
  onDiscard: () => void;
}

function ResumeModal({ visible, draft, idempotencyKey, onResume, onDiscard }: ResumeModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/80 items-center justify-center px-6">
        <View className="bg-gray-900 rounded-2xl w-full p-6">
          <Text className="text-white font-bold text-xl mb-1">Resume Workout?</Text>
          <Text className="text-gray-400 text-sm mb-1" numberOfLines={1}>
            {draft.workout_name}
          </Text>
          <Text className="text-gray-500 text-sm mb-6">
            Started {formatTimeAgo(draft.started_at)}
          </Text>
          <TouchableOpacity
            onPress={onResume}
            className="rounded-xl py-3.5 items-center mb-3"
            style={{ backgroundColor: ORANGE }}
          >
            <Text className="text-white font-bold text-base">Resume</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDiscard}
            className="rounded-xl py-3.5 items-center border border-red-500"
          >
            <Text className="text-red-500 font-semibold text-base">Discard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

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

  // Check for draft + initial fetch on mount
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
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const url = `/workouts/history?limit=20${cursorParam ? `&cursor=${encodeURIComponent(cursorParam)}` : ''}`;
      const result = await api.get<{ data: { workouts: WorkoutSummary[]; next_cursor: string | null } }>(url);
      const fetched = result.data?.workouts ?? [];
      const nextCursor = result.data?.next_cursor ?? null;

      setWorkouts(prev => reset ? fetched : [...prev, ...fetched]);
      setCursor(nextCursor);
      setHasMore(nextCursor !== null);
    } catch {
      // silently fail — list stays empty or unchanged
    } finally {
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

  const handleLoadMore = () => {
    if (!hasMore || loadingMore || loading) return;
    fetchWorkouts(cursor);
  };

  const handleStartWorkout = () => {
    startWorkout('New Workout');
    router.push('/workout/active');
  };

  const handleStartRoutine = (routine: Routine) => {
    startWorkout(routine.name, routine.id);
    router.push('/workout/active');
  };

  const handleResume = () => {
    if (!draftData) return;
    const store = useWorkoutStore.getState();
    store.resumeWorkout(draftData.draft, draftData.idempotency_key);
    setShowResumeModal(false);
    router.push('/workout/active');
  };

  const handleDiscard = () => {
    const store = useWorkoutStore.getState();
    store.clearDraft();
    setDraftData(null);
    setShowResumeModal(false);
  };

  const renderHeader = () => (
    <View>
      {/* Page header */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-4">
        <Text className="text-white font-bold text-3xl">Workouts</Text>
        <TouchableOpacity className="p-2">
          <Text className="text-2xl">📅</Text>
        </TouchableOpacity>
      </View>

      {/* Start workout button */}
      <View className="px-4 mb-4">
        <TouchableOpacity
          onPress={handleStartWorkout}
          className="rounded-2xl py-4 items-center"
          style={{ backgroundColor: ORANGE }}
        >
          <Text className="text-white font-bold text-lg">Start Workout</Text>
        </TouchableOpacity>
      </View>

      {/* Quick start routines */}
      {routines.length > 0 && (
        <View className="mb-5">
          <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider px-4 mb-2">
            Quick Start
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          >
            {routines.map(routine => (
              <TouchableOpacity
                key={routine.id}
                onPress={() => handleStartRoutine(routine)}
                className="bg-gray-900 rounded-xl px-4 py-2.5 border border-gray-800"
              >
                <Text className="text-white font-medium text-sm" numberOfLines={1}>
                  {routine.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recent workouts header */}
      <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider px-4 mb-3">
        Recent Workouts
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View className="py-6 items-center">
        <ActivityIndicator color={ORANGE} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View className="py-12 items-center">
          <ActivityIndicator color={ORANGE} />
        </View>
      );
    }
    return (
      <View className="py-12 items-center px-8">
        <Text className="text-gray-400 text-base text-center">
          No workouts yet. Start your first workout above!
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-950">
      <FlatList
        data={workouts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <WorkoutCard
            workout={item}
            onPress={() => router.push(`/workouts/${item.id}` as any)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      />

      {/* Resume modal */}
      {showResumeModal && draftData && (
        <ResumeModal
          visible={showResumeModal}
          draft={draftData.draft}
          idempotencyKey={draftData.idempotency_key}
          onResume={handleResume}
          onDiscard={handleDiscard}
        />
      )}
    </View>
  );
}
