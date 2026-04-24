import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';

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
    <TouchableOpacity
      className="flex-row items-center px-4 py-3 border-b border-gray-800"
      onPress={onPress}
      activeOpacity={0.7}
    >
      {exercise.image_url ? (
        <Image
          source={{ uri: exercise.image_url }}
          className="w-10 h-10 rounded-lg mr-3"
          resizeMode="cover"
        />
      ) : (
        <View
          className="w-10 h-10 rounded-lg mr-3 items-center justify-center"
          style={{ backgroundColor: avatarColor }}
        >
          <Text className="text-white font-bold text-base">{initials}</Text>
        </View>
      )}

      <View className="flex-1 mr-2">
        <Text className="text-white font-semibold text-sm" numberOfLines={1}>
          {exercise.name}
        </Text>
        {subtitle.length > 0 && (
          <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <View className="bg-gray-700 rounded-full px-2 py-0.5">
        <Text className="text-gray-300 text-xs">
          {LOGGING_TYPE_LABELS[exercise.logging_type]}
        </Text>
      </View>
    </TouchableOpacity>
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

  // Reset + fetch when filters change
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    setExercises([]);
    fetchExercises(0, search, equipment);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, equipment]);

  // Debounce search input
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

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View className="flex-1 items-center justify-center py-20">
        <Text className="text-gray-500 text-base">No exercises found</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View className="py-6 items-center">
        <ActivityIndicator size="small" color="#FF6B35" />
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-950">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-4">
        <Text className="text-white text-3xl font-bold">Exercises</Text>
        <TouchableOpacity
          onPress={() => router.push('/exercises/create')}
          className="w-9 h-9 rounded-full bg-gray-800 items-center justify-center"
          activeOpacity={0.7}
        >
          <Text className="text-white text-xl font-light leading-none">+</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View className="px-4 mb-3">
        <View className="flex-row items-center bg-gray-800 rounded-xl px-3 py-2.5">
          <Text className="text-gray-400 text-base mr-2">🔍</Text>
          <TextInput
            className="flex-1 text-white text-sm"
            placeholder="Search exercises…"
            placeholderTextColor="#6B7280"
            value={searchInput}
            onChangeText={setSearchInput}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={() => setSearchInput('')} activeOpacity={0.7}>
              <Text className="text-gray-400 text-base ml-1">✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Equipment filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-3"
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {EQUIPMENT_FILTERS.map((filter) => {
          const selected = equipment === filter.value;
          return (
            <TouchableOpacity
              key={filter.value}
              onPress={() => setEquipment(filter.value)}
              className={`rounded-full px-4 py-1.5 ${selected ? '' : 'bg-gray-800'}`}
              style={selected ? { backgroundColor: '#FF6B35' } : undefined}
              activeOpacity={0.7}
            >
              <Text
                className={`text-sm font-medium ${selected ? 'text-white' : 'text-gray-400'}`}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
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
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={exercises.length === 0 ? { flexGrow: 1 } : undefined}
      />
    </View>
  );
}
