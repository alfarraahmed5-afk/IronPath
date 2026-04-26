import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  FlatList,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, X, Plus } from 'lucide-react-native';
import { Image } from 'expo-image';
import { api } from '../../src/lib/api';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Icon } from '../../src/components/Icon';
import { EmptyState } from '../../src/components/EmptyState';
import { Pressable } from '../../src/components/Pressable';
import { colors, spacing, radii } from '../../src/theme/tokens';

interface Exercise {
  id: string;
  name: string;
  equipment: string | null;
  primary_muscles: string[];
  logging_type: 'weight_reps' | 'bodyweight_reps' | 'duration' | 'distance';
  image_url: string | null;
  is_custom: boolean;
  is_gym_template: boolean;
}

interface ExercisesResponse {
  exercises: Exercise[];
  total: number;
}

const EQUIPMENT_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Barbell', value: 'barbell' },
  { label: 'Dumbbell', value: 'dumbbell' },
  { label: 'Machine', value: 'machine' },
  { label: 'Cable', value: 'cable' },
  { label: 'Bodyweight', value: 'bodyweight' },
  { label: 'Kettlebell', value: 'kettlebell' },
  { label: 'Resistance Band', value: 'resistance_band' },
  { label: 'Other', value: 'other' },
];

const LOGGING_TYPE_LABELS: Record<Exercise['logging_type'], string> = {
  weight_reps: 'lbs/reps',
  bodyweight_reps: 'BW+reps',
  duration: 'time',
  distance: 'distance',
};

const AVATAR_COLORS = [
  colors.brand,
  colors.info,
  colors.success,
  '#06B6D4',
  '#F59E0B',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function capitalize(str: string | null): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

function ExerciseCard({ exercise, onPress }: { exercise: Exercise; onPress: () => void }) {
  const subtitle = [
    exercise.primary_muscles.map(capitalize).join(', '),
    exercise.equipment ? capitalize(exercise.equipment) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const avatarColor = getAvatarColor(exercise.name);
  const initials = exercise.name.charAt(0).toUpperCase();

  return (
    <Pressable onPress={onPress} style={styles.exerciseRow} accessibilityLabel={exercise.name}>
      {exercise.image_url ? (
        <Image
          source={{ uri: exercise.image_url }}
          style={styles.thumbnail}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[styles.thumbnailFallback, { backgroundColor: avatarColor }]}>
          <Text variant="bodyEmphasis" color="textPrimary">{initials}</Text>
        </View>
      )}

      <View style={styles.exerciseInfo}>
        <Text variant="bodyEmphasis" color="textPrimary" numberOfLines={1}>
          {exercise.name}
        </Text>
        {subtitle.length > 0 && (
          <Text variant="caption" color="textTertiary" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.typeBadge}>
        <Text variant="overline" color="textTertiary">
          {LOGGING_TYPE_LABELS[exercise.logging_type]}
        </Text>
      </View>
    </Pressable>
  );
}

const LIMIT = 20;

export default function ExercisesScreen() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [equipment, setEquipment] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchExercises = useCallback(
    async (currentOffset: number, currentSearch: string, currentEquipment: string) => {
      if (loading) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (currentSearch) params.set('search', currentSearch);
        if (currentEquipment) params.set('equipment', currentEquipment);
        params.set('limit', String(LIMIT));
        params.set('offset', String(currentOffset));

        const res = await api.get<{ data: ExercisesResponse }>(`/exercises?${params.toString()}`);
        const fetched = res.data.exercises;

        if (currentOffset === 0) {
          setExercises(fetched);
        } else {
          setExercises((prev) => [...prev, ...fetched]);
        }

        setHasMore(fetched.length === LIMIT);
        setOffset(currentOffset + fetched.length);
      } catch {
        // silently fail; list stays as-is
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    setExercises([]);
    fetchExercises(0, search, equipment);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, equipment]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchExercises(offset, search, equipment);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="title1" color="textPrimary">Exercises</Text>
        <Pressable
          onPress={() => router.push('/exercises/create')}
          style={styles.addButton}
          accessibilityLabel="Create exercise"
        >
          <Icon icon={Plus} size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Surface level={2} style={styles.searchBar}>
          <Icon icon={Search} size={16} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises…"
            placeholderTextColor={colors.textTertiary}
            value={searchInput}
            onChangeText={setSearchInput}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchInput.length > 0 && (
            <Pressable
              onPress={() => setSearchInput('')}
              style={styles.clearButton}
              accessibilityLabel="Clear search"
            >
              <Icon icon={X} size={14} color={colors.textTertiary} />
            </Pressable>
          )}
        </Surface>
      </View>

      {/* Equipment filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        {EQUIPMENT_FILTERS.map((filter) => {
          const selected = equipment === filter.value;
          return (
            <Pressable
              key={filter.value}
              onPress={() => setEquipment(filter.value)}
              style={[styles.filterChip, selected && styles.filterChipActive]}
              accessibilityLabel={`Filter by ${filter.label}`}
            >
              <Text
                variant="label"
                color={selected ? 'textPrimary' : 'textTertiary'}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Exercise list */}
      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExerciseCard
            exercise={item}
            onPress={() => router.push(`/exercises/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              illustration="exercises"
              title="No matches"
              description="Try a different filter or muscle group."
            />
          )
        }
        ListFooterComponent={
          loading ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={colors.brand} />
            </View>
          ) : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={exercises.length === 0 ? { flexGrow: 1 } : undefined}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
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
    lineHeight: 22,
  },
  clearButton: {
    padding: spacing.xs,
  },
  filtersScroll: {
    marginBottom: spacing.sm,
  },
  filtersContent: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.surface2,
  },
  filterChipActive: {
    backgroundColor: colors.brand,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
  },
  thumbnailFallback: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseInfo: { flex: 1 },
  typeBadge: {
    backgroundColor: colors.surface3,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.base + 40 + spacing.md,
  },
  footer: { paddingVertical: spacing.lg, alignItems: 'center' },
});
