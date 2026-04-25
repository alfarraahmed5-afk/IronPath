import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/lib/api';

interface FollowerRow {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  followed_at: string;
}

export default function FollowersScreen() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const [items, setItems] = useState<FollowerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const res = await api.get<{ data: { followers: FollowerRow[] } }>(`/users/${user.id}/followers?limit=50`);
        setItems(res.data.followers ?? []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  return (
    <View className="flex-1 bg-gray-950">
      <View className="flex-row items-center px-4 pt-14 pb-4 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Text className="text-white text-xl">←</Text>
        </TouchableOpacity>
        <Text className="text-white font-bold text-xl">Followers</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#FF6B35" /></View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-gray-500 text-center">No followers yet.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/users/${item.id}` as any)}
              className="flex-row items-center px-4 py-3 border-b border-gray-900"
            >
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} className="w-10 h-10 rounded-full mr-3" />
              ) : (
                <View className="w-10 h-10 rounded-full bg-orange-500 mr-3 items-center justify-center">
                  <Text className="text-white font-bold">{item.username.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View className="flex-1">
                <Text className="text-white font-semibold text-sm">{item.username}</Text>
                {item.full_name ? <Text className="text-gray-400 text-xs">{item.full_name}</Text> : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
