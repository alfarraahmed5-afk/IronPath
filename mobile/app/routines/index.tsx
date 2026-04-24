import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SectionList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';

const ORANGE = '#FF6B35';

interface Routine {
  id: string;
  name: string;
  description: string | null;
  folder_id: string | null;
  exercise_count: number;
  created_at: string;
}

interface FolderGroup {
  id: string;
  name: string;
  position: number;
  routines: Routine[];
}

interface Section {
  title: string;
  data: Routine[];
  isUngrouped?: boolean;
}

export default function RoutinesScreen() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRoutines = async () => {
    try {
      const response = await api.get<{ data: { folders: FolderGroup[]; ungrouped: Routine[] } }>('/routines');
      const { folders, ungrouped } = response.data;

      const newSections: Section[] = [];

      // Add folder sections
      if (folders && folders.length > 0) {
        folders.forEach(folder => {
          newSections.push({
            title: folder.name,
            data: folder.routines || [],
          });
        });
      }

      // Add ungrouped section
      if (ungrouped && ungrouped.length > 0) {
        newSections.push({
          title: 'My Routines',
          data: ungrouped,
          isUngrouped: true,
        });
      }

      setSections(newSections);
    } catch (error) {
      console.error('Failed to fetch routines:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRoutines();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRoutines();
  };

  const hasRoutines = sections.some(s => s.data.length > 0);

  return (
    <View className="flex-1 bg-gray-950">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-6 border-b border-gray-800">
        <Text className="text-white font-bold text-3xl">Routines</Text>
        <TouchableOpacity
          onPress={() => router.push('/routines/create')}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: ORANGE }}
        >
          <Text className="text-white font-bold text-lg">+</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">Loading routines...</Text>
        </View>
      ) : !hasRoutines ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Pre-Built Programs Card */}
          <TouchableOpacity
            onPress={() => router.push('/routines/prebuilt')}
            className="rounded-2xl mb-6 overflow-hidden border-2"
            style={{ borderColor: ORANGE }}
          >
            <View className="bg-gray-900 px-4 py-6 items-center">
              <Text className="text-white font-bold text-lg mb-2">Pre-Built Programs</Text>
              <Text className="text-gray-400 text-center text-sm">Browse curated workout routines</Text>
            </View>
          </TouchableOpacity>

          {/* Empty State */}
          <View className="items-center mt-12">
            <Text className="text-white font-semibold text-lg mb-2">No routines yet</Text>
            <Text className="text-gray-400 text-center text-sm">
              Create your first routine or browse pre-built programs.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/routines/${item.id}`)}
              className="bg-gray-900 mx-4 mb-3 px-4 py-4 rounded-xl"
            >
              <Text className="text-white font-bold text-base mb-1">{item.name}</Text>
              <View className="flex-row items-center">
                <Text className="text-gray-400 text-sm">
                  {item.exercise_count} exercise{item.exercise_count !== 1 ? 's' : ''}
                </Text>
              </View>
              {item.description && (
                <Text className="text-gray-500 text-xs mt-2 line-clamp-1">
                  {item.description}
                </Text>
              )}
            </TouchableOpacity>
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View className="px-4 mt-4 mb-3">
              <Text className="text-gray-500 text-xs uppercase font-semibold tracking-wide">
                {title}
              </Text>
            </View>
          )}
          ListHeaderComponent={
            <View className="px-4 py-4">
              <TouchableOpacity
                onPress={() => router.push('/routines/prebuilt')}
                className="rounded-2xl overflow-hidden border-2 mb-4"
                style={{ borderColor: ORANGE }}
              >
                <View className="bg-gray-900 px-4 py-6 items-center">
                  <Text className="text-white font-bold text-lg mb-2">Pre-Built Programs</Text>
                  <Text className="text-gray-400 text-center text-sm">Browse curated workout routines</Text>
                </View>
              </TouchableOpacity>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}
