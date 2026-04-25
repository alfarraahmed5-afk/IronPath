import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string;
  sex: string | null;
  date_of_birth: string | null;
  bodyweight_kg: number | null;
  is_profile_private: boolean;
  gym_id: string;
}

interface StrengthLevel {
  exercise_name: string;
  level: string;
  projected_1rm_kg: number;
}

interface RecentWorkout {
  id: string;
  name: string;
  started_at: string;
  total_volume_kg: number;
}

interface StatsData {
  total_workouts: number;
  total_volume_kg: number;
  current_streak_weeks: number;
  strength_levels: StrengthLevel[];
  recent_workouts: RecentWorkout[];
}

interface FollowersResponse {
  data: {
    followers: unknown[];
    next_cursor: string | null;
  };
}

interface FollowingResponse {
  data: {
    following: unknown[];
    next_cursor: string | null;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitial(username: string): string {
  return username.charAt(0).toUpperCase();
}

const LEVEL_COLORS: Record<string, string> = {
  Beginner: 'bg-blue-600',
  Intermediate: 'bg-green-600',
  Advanced: 'bg-orange-500',
  Elite: 'bg-purple-600',
};

const LEVEL_TEXT_COLORS: Record<string, string> = {
  Beginner: 'text-blue-100',
  Intermediate: 'text-green-100',
  Advanced: 'text-orange-100',
  Elite: 'text-purple-100',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [followerCount, setFollowerCount] = useState<string>('0');
  const [followingCount, setFollowingCount] = useState<string>('0');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    fetchAll(user.id);
  }, [user?.id]);

  async function fetchAll(userId: string) {
    setLoading(true);
    try {
      const [profileRes, statsRes, followersRes, followingRes] = await Promise.allSettled([
        api.get<{ data: ProfileData }>('/users/me'),
        api.get<{ data: StatsData }>(`/users/${userId}/stats`),
        api.get<FollowersResponse['data']>(`/users/${userId}/followers?limit=50`),
        api.get<FollowingResponse['data']>(`/users/${userId}/following?limit=50`),
      ]);

      if (profileRes.status === 'fulfilled') {
        setProfile((profileRes.value as { data: ProfileData }).data);
      }
      if (statsRes.status === 'fulfilled') {
        setStats((statsRes.value as { data: StatsData }).data);
      }
      if (followersRes.status === 'fulfilled') {
        const fd = followersRes.value as FollowersResponse['data'];
        const count = fd.followers?.length ?? 0;
        setFollowerCount(fd.next_cursor ? `${count}+` : String(count));
      }
      if (followingRes.status === 'fulfilled') {
        const fd = followingRes.value as FollowingResponse['data'];
        const count = fd.following?.length ?? 0;
        setFollowingCount(fd.next_cursor ? `${count}+` : String(count));
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-gray-950 items-center justify-center">
        <ActivityIndicator size="large" color="#6b7280" />
      </View>
    );
  }

  const displayUsername = profile?.username ?? user?.username ?? '';
  const displayFullName = profile?.full_name ?? user?.full_name ?? null;
  const displayAvatar = profile?.avatar_url ?? user?.avatar_url ?? null;
  const displayBio = profile?.bio ?? null;
  const recentWorkouts = (stats?.recent_workouts ?? []).slice(0, 5);
  const strengthLevels = (stats?.strength_levels ?? []).filter((s) => s.level);

  return (
    <ScrollView
      className="flex-1 bg-gray-950"
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header bar */}
      <View className="flex-row justify-end px-4 pt-14 pb-2">
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          className="w-9 h-9 items-center justify-center rounded-full bg-gray-900"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-lg">⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Avatar section */}
      <View className="items-center px-6 pb-6">
        {/* Avatar */}
        {displayAvatar ? (
          <Image
            source={{ uri: displayAvatar }}
            className="w-20 h-20 rounded-full mb-3"
            resizeMode="cover"
          />
        ) : (
          <View className="w-20 h-20 rounded-full bg-indigo-600 items-center justify-center mb-3">
            <Text className="text-white text-3xl font-bold">
              {getInitial(displayUsername)}
            </Text>
          </View>
        )}

        {/* Username */}
        <Text className="text-white text-xl font-bold mb-0.5">{displayUsername}</Text>

        {/* Full name */}
        {displayFullName ? (
          <Text className="text-gray-400 text-sm mb-1">{displayFullName}</Text>
        ) : null}

        {/* Bio */}
        {displayBio ? (
          <Text className="text-gray-300 text-[13px] italic text-center px-6 mb-3">
            {displayBio}
          </Text>
        ) : null}

        {/* Edit profile */}
        <TouchableOpacity
          onPress={() => router.push('/profile/edit')}
          className="mt-3 px-5 py-2 bg-gray-800 rounded-full"
        >
          <Text className="text-white text-sm font-medium">Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View className="mx-4 mb-4 bg-gray-900 rounded-xl flex-row">
        {/* Workouts */}
        <View className="flex-1 items-center py-4">
          <Text className="text-white text-lg font-bold">
            {stats?.total_workouts ?? 0}
          </Text>
          <Text className="text-gray-400 text-[11px] mt-0.5">Workouts</Text>
        </View>

        {/* Divider */}
        <View className="w-px bg-gray-800 my-3" />

        {/* Followers */}
        <TouchableOpacity
          className="flex-1 items-center py-4"
          onPress={() => router.push('/profile/followers')}
        >
          <Text className="text-white text-lg font-bold">{followerCount}</Text>
          <Text className="text-gray-400 text-[11px] mt-0.5">Followers</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View className="w-px bg-gray-800 my-3" />

        {/* Following */}
        <TouchableOpacity
          className="flex-1 items-center py-4"
          onPress={() => router.push('/profile/following')}
        >
          <Text className="text-white text-lg font-bold">{followingCount}</Text>
          <Text className="text-gray-400 text-[11px] mt-0.5">Following</Text>
        </TouchableOpacity>
      </View>

      {/* Streak card */}
      <View className="mx-4 mb-4 bg-gray-900 rounded-xl px-4 py-4">
        <Text className="text-white font-semibold text-base">
          {stats && stats.current_streak_weeks > 0
            ? `🔥 ${stats.current_streak_weeks} week streak`
            : 'No active streak'}
        </Text>
        <Text className="text-gray-400 text-sm mt-1">
          Total volume: {stats ? stats.total_volume_kg.toLocaleString() : 0} kg
        </Text>
      </View>

      {/* Strength Levels */}
      {strengthLevels.length > 0 ? (
        <View className="mb-4">
          <Text className="text-white text-base font-semibold px-4 mb-3">
            Strength Levels
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {strengthLevels.map((item, index) => {
              const bgColor = LEVEL_COLORS[item.level] ?? 'bg-gray-700';
              const textColor = LEVEL_TEXT_COLORS[item.level] ?? 'text-gray-100';
              return (
                <View
                  key={index}
                  className={`${bgColor} rounded-xl px-3 py-2.5 items-center min-w-[90px]`}
                >
                  <Text className="text-white text-[11px] font-medium text-center" numberOfLines={2}>
                    {item.exercise_name}
                  </Text>
                  <Text className={`${textColor} text-[10px] mt-1 font-semibold`}>
                    {item.level}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Recent Workouts */}
      <View className="mb-4">
        <View className="flex-row justify-between items-center px-4 mb-3">
          <Text className="text-white text-base font-semibold">Recent Workouts</Text>
          <TouchableOpacity onPress={() => router.push('/workouts')}>
            <Text className="text-indigo-400 text-sm">See all</Text>
          </TouchableOpacity>
        </View>

        {recentWorkouts.length === 0 ? (
          <View className="mx-4 bg-gray-900 rounded-xl px-4 py-5 items-center">
            <Text className="text-gray-500 text-sm">No workouts yet</Text>
          </View>
        ) : (
          <View className="mx-4 bg-gray-900 rounded-xl overflow-hidden">
            {recentWorkouts.map((workout, index) => (
              <TouchableOpacity
                key={workout.id}
                onPress={() => router.push(`/workouts/${workout.id}`)}
                className={`flex-row items-center px-4 py-3.5 ${
                  index < recentWorkouts.length - 1 ? 'border-b border-gray-800' : ''
                }`}
              >
                <View className="flex-1 mr-3">
                  <Text className="text-white text-sm font-medium" numberOfLines={1}>
                    {workout.name}
                  </Text>
                  <Text className="text-gray-400 text-xs mt-0.5">
                    {formatRelativeDate(workout.started_at)}
                  </Text>
                </View>
                <View className="bg-gray-800 px-2.5 py-1 rounded-lg">
                  <Text className="text-gray-300 text-xs font-medium">
                    {workout.total_volume_kg.toLocaleString()} kg
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Danger Zone — Sign Out */}
      <View className="mx-4 mt-2">
        <TouchableOpacity
          onPress={async () => {
            await logout();
            router.replace('/(auth)/login');
          }}
          className="bg-gray-900 py-4 rounded-xl items-center"
        >
          <Text className="text-red-400 font-semibold text-sm">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
