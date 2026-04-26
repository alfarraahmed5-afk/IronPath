import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Image } from 'expo-image';
import { api } from '../../src/lib/api';
import { Header } from '../../src/components/Header';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Icon } from '../../src/components/Icon';
import { EmptyState } from '../../src/components/EmptyState';
import { Pressable } from '../../src/components/Pressable';
import { colors, spacing, radii } from '../../src/theme/tokens';

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

const AVATAR_COLORS = [colors.brand, colors.info, colors.success, '#06B6D4', '#F59E0B'];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
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
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatSetSummary(sets: HistorySet[]): string {
  const completed = sets.filter((s) => s.is_completed);
  if (completed.length === 0) return 'No completed sets';
  const parts: string[] = [];
  let i = 0;
  while (i < completed.length) {
    const cur = completed[i];
    let count = 1;
    while (
      i + count < completed.length &&
      completed[i + count].weight_kg === cur.weight_kg &&
      completed[i + count].reps === cur.reps
    ) { count++; }
    if (cur.weight_kg !== null && cur.reps !== null) parts.push(`${count} × ${cur.weight_kg} kg`);
    else if (cur.reps !== null) parts.push(`${count} × ${cur.reps} reps`);
    else if (cur.weight_kg !== null) parts.push(`${count} × ${cur.weight_kg} kg`);
    else parts.push(`${count} set${count > 1 ? 's' : ''}`);
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
    <Surface level={2} style={styles.instructionsCard}>
      <Text variant="body" color="textSecondary">{displayed}</Text>
      {isLong && (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={styles.showMoreBtn}
          accessibilityLabel={expanded ? 'Show less' : 'Show more'}
        >
          <Text variant="label" color="brand">{expanded ? 'Show less' : 'Show more'}</Text>
          <Icon icon={expanded ? ChevronUp : ChevronDown} size={14} color={colors.brand} />
        </Pressable>
      )}
    </Surface>
  );
}

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [personalRecords, setPersonalRecords] = useState<PR[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.get<{ data: ExerciseDetailResponse }>(`/exercises/${id}`)
      .then((res) => {
        setExercise(res.data.exercise);
        setPersonalRecords(res.data.personal_records);
        setHistory(res.data.history);
      })
      .catch(() => router.back())
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={[styles.root, styles.centered]}>
        <EmptyState illustration="404" title="Exercise not found" action={{ label: 'Go back', onPress: () => router.back() }} />
      </View>
    );
  }

  const avatarColor = getAvatarColor(exercise.name);
  const initials = exercise.name.split(' ').slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');

  const allMuscles = [
    ...exercise.primary_muscles.map((m) => ({ label: capitalize(m), primary: true })),
    ...exercise.secondary_muscles.map((m) => ({ label: capitalize(m), primary: false })),
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header title={exercise.name} back />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero image or fallback */}
        {exercise.image_url ? (
          <Image
            source={{ uri: exercise.image_url }}
            style={styles.hero}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.hero, styles.heroFallback, { backgroundColor: avatarColor }]}>
            <Text variant="display3" color="textPrimary" style={{ opacity: 0.8 }}>{initials}</Text>
          </View>
        )}

        <View style={styles.content}>
          {/* Muscle / equipment pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
            {exercise.equipment && (
              <View style={styles.pillEquipment}>
                <Text variant="label" color="textSecondary">{capitalize(exercise.equipment)}</Text>
              </View>
            )}
            {allMuscles.map((m, idx) => (
              <View
                key={idx}
                style={[styles.pillMuscle, m.primary ? styles.pillMusclePrimary : styles.pillMuscleSecondary]}
              >
                <Text variant="label" style={{ color: m.primary ? colors.brand : colors.textTertiary }}>
                  {m.label}
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* Description */}
          {exercise.description ? (
            <View style={styles.section}>
              <Text variant="body" color="textSecondary">{exercise.description}</Text>
            </View>
          ) : null}

          {/* Personal Records */}
          {personalRecords.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon icon={Trophy} size={16} color={colors.brand} />
                <Text variant="title3" color="brand" style={{ marginLeft: spacing.xs }}>Personal Records</Text>
              </View>
              <View style={styles.prGrid}>
                {personalRecords.map((pr, idx) => (
                  <Surface key={idx} level={2} style={styles.prCard}>
                    <Text variant="overline" color="textTertiary">
                      {PR_DISPLAY_NAMES[pr.record_type] ?? capitalize(pr.record_type)}
                    </Text>
                    <Text variant="numeric" color="brand" style={{ marginTop: spacing.xxs }}>
                      {formatPRValue(pr.record_type, pr.value)}
                    </Text>
                    <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xxs }}>
                      {formatDate(pr.achieved_at)}
                    </Text>
                  </Surface>
                ))}
              </View>
            </View>
          )}

          {/* History */}
          {history.length > 0 && (
            <View style={styles.section}>
              <Text variant="title3" color="textPrimary" style={{ marginBottom: spacing.md }}>History</Text>
              {history.map((entry, idx) => (
                <Surface key={entry.workout_id} level={2} style={[styles.historyCard, idx > 0 && { marginTop: spacing.sm }]}>
                  <Text variant="overline" color="textTertiary">{formatDate(entry.started_at)}</Text>
                  <Text variant="body" color="textSecondary" numberOfLines={2} style={{ marginTop: spacing.xxs }}>
                    {formatSetSummary(entry.sets)}
                  </Text>
                </Surface>
              ))}
            </View>
          )}

          {/* Instructions */}
          {exercise.instructions ? (
            <View style={styles.section}>
              <Text variant="title3" color="textPrimary" style={{ marginBottom: spacing.md }}>Instructions</Text>
              <InstructionsText text={exercise.instructions} />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  hero: { width: '100%', height: 200 },
  heroFallback: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.base, paddingTop: spacing.base },
  pillsRow: { gap: spacing.sm, marginBottom: spacing.base },
  pillEquipment: {
    backgroundColor: colors.surface3,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pillMuscle: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pillMusclePrimary: { backgroundColor: colors.brandGlow },
  pillMuscleSecondary: { backgroundColor: colors.surface3 },
  section: { marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  prGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  prCard: { padding: spacing.md, minWidth: '44%', flex: 1 },
  historyCard: { padding: spacing.md },
  instructionsCard: { padding: spacing.base },
  showMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
});
