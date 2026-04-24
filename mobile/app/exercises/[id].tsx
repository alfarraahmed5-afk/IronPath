import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/lib/api';

interface ExerciseDetail {
  id: string;
  name: string;
  description: string;
  instructions: string;
  equipment: string | null;
  primary_muscles: string[];
  secondary_muscles: string[];
  logging_type: string;
  image_url: string | null;
  is_custom: boolean;
}

interface PR {
  record_type: string;
  value: number;
  achieved_at: string;
}

interface HistorySet {
  position: number;
  weight_kg: number | null;
  reps: number | null;
  set_type: string;
  is_completed: boolean;
}

interface HistoryEntry {
  workout_id: string;
  started_at: string;
  sets: HistorySet[];
}

interface ExerciseDetailResponse {
  exercise: ExerciseDetail;
  personal_records: PR[];
  history: HistoryEntry[];
}

const PR_DISPLAY_NAMES: Record<string, string> = {
  heaviest_weight: 'Heaviest Weight',
  projected_1rm: 'Estimated 1RM',
  most_reps: 'Most Reps',
  best_volume_set: 'Best Set Volume',
  best_volume_session: 'Best Session Volume',
  '3rm': '3RM',
  '5rm': '5RM',
  '10rm': '10RM',
  longest_duration: 'Longest Duration',
  longest_distance: 'Longest Distance',
};

const REP_RECORD_TYPES = new Set(['most_reps', '3rm', '5rm', '10rm']);
const DURATION_RECORD_TYPES = new Set(['longest_duration']);
const DISTANCE_RECORD_TYPES = new Set(['longest_distance']);

const AVATAR_COLORS = [
  '#FF6B35',
  '#6B35FF',
  '#35B8FF',
  '#FF3578',
  '#35FF8A',
  '#FFB835',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatPRValue(record_type: string, value: number): string {
  if (REP_RECORD_TYPES.has(record_type)) return `${value} reps`;
  if (DURATION_RECORD_TYPES.has(record_type)) return formatDuration(value);
  if (DISTANCE_RECORD_TYPES.has(record_type)) return `${value} m`;
  return `${value} kg`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatSetSummary(sets: HistorySet[]): string {
  const completed = sets.filter((s) => s.is_completed);
  if (completed.length === 0) return 'No completed sets';

  // Group consecutive sets with same weight+reps
  const parts: string[] = [];
  let i = 0;
  while (i < completed.length) {
    const cur = completed[i];
    let count = 1;
    while (
      i + count < completed.length &&
      completed[i + count].weight_kg === cur.weight_kg &&
      completed[i + count].reps === cur.reps
    ) {
      count++;
    }

    if (cur.weight_kg !== null && cur.reps !== null) {
      parts.push(`${count} × ${cur.weight_kg} kg`);
    } else if (cur.reps !== null) {
      parts.push(`${count} × ${cur.reps} reps`);
    } else if (cur.weight_kg !== null) {
      parts.push(`${count} × ${cur.weight_kg} kg`);
    } else {
      parts.push(`${count} set${count > 1 ? 's' : ''}`);
    }

    i += count;
  }

  return parts.join(' · ');
}

function InstructionsText({ text }: { text: string }) {
  const THRESHOLD = 200;
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > THRESHOLD;
  const displayed = isLong && !expanded ? text.slice(0, THRESHOLD) + '…' : text;

  return (
    <View>
      <Text className="text-gray-300 text-sm leading-relaxed">{displayed}</Text>
      {isLong && (
        <TouchableOpacity onPress={() => setExpanded((v) => !v)} activeOpacity={0.7} className="mt-1">
          <Text style={{ color: '#FF6B35' }} className="text-sm font-medium">
            {expanded ? 'Show less' : 'Show more'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [personalRecords, setPersonalRecords] = useState<PR[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    api
      .get<{ data: ExerciseDetailResponse }>(`/exercises/${id}`)
      .then((res) => {
        setExercise(res.data.exercise);
        setPersonalRecords(res.data.personal_records);
        setHistory(res.data.history);
      })
      .catch(() => {
        setError('Failed to load exercise.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 bg-gray-950 items-center justify-center">
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (error || !exercise) {
    return (
      <View className="flex-1 bg-gray-950 items-center justify-center px-8">
        <Text className="text-gray-400 text-base text-center">{error ?? 'Exercise not found.'}</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4" activeOpacity={0.7}>
          <Text style={{ color: '#FF6B35' }} className="text-base font-medium">
            Go back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const avatarColor = getAvatarColor(exercise.name);
  const initials = exercise.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  const allMuscles = [
    ...exercise.primary_muscles.map((m) => ({ label: capitalize(m), primary: true })),
    ...exercise.secondary_muscles.map((m) => ({ label: capitalize(m), primary: false })),
  ];

  return (
    <View className="flex-1 bg-gray-950">
      {/* Header */}
      <View className="flex-row items-center px-4 pt-14 pb-4 gap-3">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} className="mr-1">
          <Text className="text-white text-2xl">←</Text>
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1" numberOfLines={2}>
          {exercise.name}
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Hero image or fallback */}
        {exercise.image_url ? (
          <Image
            source={{ uri: exercise.image_url }}
            className="w-full rounded-b-xl"
            style={{ height: 200 }}
            resizeMode="cover"
          />
        ) : (
          <View
            className="w-full rounded-b-xl items-center justify-center"
            style={{ height: 200, backgroundColor: avatarColor }}
          >
            <Text className="text-white text-5xl font-bold opacity-80">{initials}</Text>
          </View>
        )}

        <View className="px-4 pt-4">
          {/* Info pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            className="mb-4"
          >
            {exercise.equipment && (
              <View className="bg-gray-800 rounded-full px-3 py-1">
                <Text className="text-gray-300 text-xs font-medium">
                  {capitalize(exercise.equipment)}
                </Text>
              </View>
            )}
            {allMuscles.map((m, idx) => (
              <View
                key={idx}
                className="rounded-full px-3 py-1"
                style={
                  m.primary
                    ? { backgroundColor: 'rgba(255,107,53,0.18)' }
                    : { backgroundColor: '#1F2937' }
                }
              >
                <Text
                  className="text-xs font-medium"
                  style={m.primary ? { color: '#FF6B35' } : { color: '#9CA3AF' }}
                >
                  {m.label}
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* Description */}
          {exercise.description ? (
            <View className="mb-5">
              <Text className="text-gray-300 text-sm leading-relaxed">{exercise.description}</Text>
            </View>
          ) : null}

          {/* Personal Records */}
          {personalRecords.length > 0 && (
            <View className="mb-6">
              <Text className="text-white text-lg font-bold mb-3">Personal Records</Text>
              <View className="flex-row flex-wrap gap-3">
                {personalRecords.map((pr, idx) => (
                  <View
                    key={idx}
                    className="bg-gray-900 rounded-xl p-3 border border-gray-800"
                    style={{ minWidth: '44%', flex: 1 }}
                  >
                    <Text className="text-gray-400 text-xs mb-1">
                      {PR_DISPLAY_NAMES[pr.record_type] ?? capitalize(pr.record_type)}
                    </Text>
                    <Text className="text-white font-bold text-base">
                      {formatPRValue(pr.record_type, pr.value)}
                    </Text>
                    <Text className="text-gray-600 text-xs mt-1">
                      {formatDate(pr.achieved_at)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* History */}
          {history.length > 0 && (
            <View className="mb-6">
              <Text className="text-white text-lg font-bold mb-3">History</Text>
              <View className="gap-2">
                {history.map((entry) => (
                  <View
                    key={entry.workout_id}
                    className="bg-gray-900 rounded-xl px-4 py-3 border border-gray-800"
                  >
                    <Text className="text-gray-400 text-xs mb-1.5">
                      {formatDate(entry.started_at)}
                    </Text>
                    <Text className="text-gray-300 text-sm" numberOfLines={2}>
                      {formatSetSummary(entry.sets)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Instructions */}
          {exercise.instructions ? (
            <View className="mb-8">
              <Text className="text-white text-lg font-bold mb-3">Instructions</Text>
              <InstructionsText text={exercise.instructions} />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
