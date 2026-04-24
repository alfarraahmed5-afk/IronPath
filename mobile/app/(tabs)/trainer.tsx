import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';

const ORANGE = '#FF6B35';

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

const TREND_ICON: Record<string, string> = {
  trending_up: '↑',
  stalled: '→',
  deloaded: '↓',
};

const TREND_COLOR: Record<string, string> = {
  trending_up: '#22c55e',
  stalled: '#9ca3af',
  deloaded: '#f97316',
};

function formatPrescription(ex: NextSession['exercises'][number]): string {
  if (ex.target_duration_seconds) {
    const mins = Math.floor(ex.target_duration_seconds / 60);
    const secs = ex.target_duration_seconds % 60;
    return `${ex.sets} × ${mins > 0 ? `${mins}m ` : ''}${secs > 0 ? `${secs}s` : ''}`;
  }
  if (ex.reps_min !== null && ex.reps_max !== null) {
    return `${ex.sets} × ${ex.reps_min}–${ex.reps_max} reps`;
  }
  if (ex.reps !== null) {
    return `${ex.sets} × ${ex.reps} reps`;
  }
  return `${ex.sets} sets`;
}

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
        const err = sessionRes.reason;
        if (err?.response?.status === 404) setNoProgram(true);
      }
      if (progressRes.status === 'fulfilled') {
        setProgress(progressRes.value.data);
      }
    } catch {
      // handled per-request above
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

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
      <View className="flex-1 bg-gray-950 items-center justify-center">
        <ActivityIndicator color={ORANGE} size="large" />
      </View>
    );
  }

  if (noProgram) {
    return (
      <View className="flex-1 bg-gray-950">
        <View className="px-4 pt-14 pb-4 border-b border-gray-800">
          <Text className="text-white font-bold text-2xl">AI Trainer</Text>
          <Text className="text-gray-400 text-sm mt-1">Algorithmic progressive overload</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl mb-6">🤖</Text>
          <Text className="text-white text-xl font-bold text-center mb-3">No program yet</Text>
          <Text className="text-gray-400 text-center mb-8">
            Answer 5 quick questions and we'll build a personalized progressive overload program for you.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/trainer/onboarding')}
            className="rounded-xl py-4 px-8 items-center"
            style={{ backgroundColor: ORANGE }}
          >
            <Text className="text-white font-bold text-base">Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-950">
      <View className="px-4 pt-14 pb-4 border-b border-gray-800">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white font-bold text-2xl">AI Trainer</Text>
            {session && <Text className="text-gray-400 text-sm mt-0.5">{session.template_name}</Text>}
          </View>
          <TouchableOpacity
            onPress={togglePause}
            disabled={pausing}
            className="px-3 py-1.5 rounded-lg border border-gray-700"
          >
            <Text className="text-gray-300 text-sm font-medium">
              {pausing ? '…' : session?.is_paused ? 'Resume' : 'Pause'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab switcher */}
        <View className="flex-row mt-4 bg-gray-900 rounded-xl p-1">
          {(['session', 'progress'] as const).map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              className="flex-1 py-2 rounded-lg items-center"
              style={{ backgroundColor: tab === t ? ORANGE : 'transparent' }}
            >
              <Text className="font-semibold text-sm" style={{ color: tab === t ? '#fff' : '#9ca3af' }}>
                {t === 'session' ? 'Next Session' : 'Progress'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ORANGE} />}
      >
        {tab === 'session' && session && (
          <View>
            {session.is_paused && (
              <View className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
                <Text className="text-yellow-400 font-semibold">Program Paused</Text>
                <Text className="text-yellow-400/70 text-sm mt-1">Resume your program to start tracking progression.</Text>
              </View>
            )}

            <View className="flex-row items-center mb-4 gap-3">
              <View>
                <Text className="text-white font-bold text-lg">{session.session_label}</Text>
                <Text className="text-gray-400 text-sm">Session {session.session_number}</Text>
              </View>
            </View>

            <View className="gap-3 mb-6">
              {session.exercises.map((ex, idx) => (
                <View key={ex.exercise_id + idx} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                  <View className="flex-row items-start justify-between mb-1">
                    <Text className="text-white font-semibold flex-1 mr-2">{ex.exercise_name}</Text>
                    <Text className="text-gray-400 text-sm">{formatPrescription(ex)}</Text>
                  </View>
                  <View className="flex-row items-center gap-4 mt-2">
                    {ex.prescribed_weight_kg !== null && (
                      <View className="flex-row items-center gap-1">
                        <Text className="text-gray-400 text-xs">Weight</Text>
                        <Text style={{ color: ORANGE }} className="font-bold text-sm">
                          {ex.prescribed_weight_kg}kg
                        </Text>
                      </View>
                    )}
                    <View className="flex-row items-center gap-1">
                      <Text className="text-gray-400 text-xs">Rest</Text>
                      <Text className="text-gray-300 text-sm font-medium">{ex.rest_seconds}s</Text>
                    </View>
                    {ex.is_lower_body && (
                      <Text className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">Lower</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => router.push('/(tabs)/workouts')}
              className="rounded-xl py-4 items-center"
              style={{ backgroundColor: ORANGE, opacity: session.is_paused ? 0.5 : 1 }}
              disabled={session.is_paused}
            >
              <Text className="text-white font-bold text-base">Start Workout</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === 'progress' && progress && (
          <View>
            <View className="flex-row gap-3 mb-6">
              <View className="flex-1 bg-gray-900 rounded-xl p-4 border border-gray-800 items-center">
                <Text className="text-white font-bold text-2xl">{progress.total_sessions}</Text>
                <Text className="text-gray-400 text-xs mt-1">Sessions</Text>
              </View>
              <View className="flex-1 bg-gray-900 rounded-xl p-4 border border-gray-800 items-center">
                <Text className="text-white font-bold text-2xl">
                  {progress.increment_multiplier === 1.0 ? '1×' : progress.increment_multiplier === 1.25 ? '1.25×' : '0.75×'}
                </Text>
                <Text className="text-gray-400 text-xs mt-1">Increment</Text>
              </View>
            </View>

            <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
              Exercise Progress
            </Text>
            <View className="gap-3">
              {progress.exercises.map(ex => (
                <View key={ex.exercise_id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-white font-semibold flex-1 mr-2">{ex.exercise_name}</Text>
                    <Text style={{ color: TREND_COLOR[ex.trend], fontSize: 18, fontWeight: 'bold' }}>
                      {TREND_ICON[ex.trend]}
                    </Text>
                  </View>
                  <View className="flex-row gap-4">
                    <View>
                      <Text style={{ color: ORANGE }} className="font-bold text-lg">{ex.current_weight_kg}kg</Text>
                      <Text className="text-gray-500 text-xs">Current</Text>
                    </View>
                    <View>
                      <Text className="text-gray-300 font-semibold text-lg">{ex.sessions_logged}</Text>
                      <Text className="text-gray-500 text-xs">Sessions</Text>
                    </View>
                    <View>
                      <Text className="text-gray-300 font-semibold text-lg">{ex.consecutive_successes}</Text>
                      <Text className="text-gray-500 text-xs">Streak</Text>
                    </View>
                  </View>
                </View>
              ))}
              {progress.exercises.length === 0 && (
                <Text className="text-gray-500 text-center py-8">
                  Complete a session to see your progress here.
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={() => router.push('/trainer/onboarding')}
              className="mt-6 rounded-xl py-3 items-center border border-gray-700"
            >
              <Text className="text-gray-400 text-sm font-medium">Reset / New Program</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
