import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../src/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PublicUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_profile_private: boolean;
  follower_count: number;
  following_count: number;
  is_following: boolean;
  follow_status: 'none' | 'pending' | 'active';
}

interface UserStats {
  total_workouts: number;
  total_volume_kg: number;
  current_streak: number;
  longest_streak: number;
  recent_workouts: { id: string; workout_name: string; started_at: string }[];
  strength_levels: { exercise_name: string; level: string | null; value: number | null }[];
}

interface FollowUser {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

type ModalType = 'followers' | 'following' | null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 80 }: { name: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#FF6B35',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: '#fff',
          fontWeight: 'bold',
          fontSize: size * 0.3,
        }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

// ─── FollowUserRow ────────────────────────────────────────────────────────────

function FollowUserRow({ item }: { item: FollowUser }) {
  return (
    <View className="flex-row items-center px-4 py-3 border-b border-gray-800">
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: '#FF6B35',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>
          {initials(item.full_name || item.username)}
        </Text>
      </View>
      <View>
        <Text className="text-white font-semibold text-sm">
          {item.full_name}
        </Text>
        <Text className="text-gray-400 text-xs">@{item.username}</Text>
      </View>
    </View>
  );
}

// ─── FollowModal ──────────────────────────────────────────────────────────────

interface FollowModalProps {
  userId: string;
  type: ModalType;
  onClose: () => void;
}

function FollowModal({ userId, type, onClose }: FollowModalProps) {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchUsers = useCallback(
    async (cursor?: string) => {
      if (!type) return;
      try {
        const url = cursor
          ? `/users/${userId}/${type}?cursor=${encodeURIComponent(cursor)}`
          : `/users/${userId}/${type}`;
        const res = await api.get<{
          data: {
            followers?: FollowUser[];
            following?: FollowUser[];
            next_cursor: string | null;
          };
        }>(url);
        const items =
          type === 'followers'
            ? res.data.followers ?? []
            : res.data.following ?? [];
        setUsers((prev) => (cursor ? [...prev, ...items] : items));
        setNextCursor(res.data.next_cursor);
      } catch {
        // show empty list on error
      }
    },
    [userId, type]
  );

  useEffect(() => {
    if (!type) return;
    setLoading(true);
    setUsers([]);
    fetchUsers().finally(() => setLoading(false));
  }, [type, fetchUsers]);

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    await fetchUsers(nextCursor);
    setLoadingMore(false);
  }, [nextCursor, loadingMore, fetchUsers]);

  return (
    <Modal
      visible={!!type}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-gray-950">
        {/* Modal header */}
        <View className="flex-row items-center justify-between px-4 pt-6 pb-4 border-b border-gray-800">
          <Text className="text-white text-lg font-bold capitalize">
            {type}
          </Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Text style={{ color: '#FF6B35', fontSize: 15, fontWeight: '600' }}>
              Done
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#FF6B35" size="large" />
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.user_id}
            renderItem={({ item }) => <FollowUserRow item={item} />}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator color="#FF6B35" className="py-4" />
              ) : null
            }
            ListEmptyComponent={
              <View className="items-center py-16">
                <Text className="text-gray-500">No users yet</Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [user, setUser] = useState<PublicUser | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followStatus, setFollowStatus] = useState<'none' | 'pending' | 'active'>('none');
  const [followLoading, setFollowLoading] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);

  // ── Fetch user + stats in parallel ───────────────────────────────────────

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      setError(null);

      const [userResult, statsResult] = await Promise.allSettled([
        api.get<{ data: { user: PublicUser } }>(`/users/${id}`),
        api.get<{ data: UserStats }>(`/users/${id}/stats`),
      ]);

      if (userResult.status === 'fulfilled') {
        const fetchedUser = userResult.value.data.user;
        setUser(fetchedUser);
        setFollowStatus(fetchedUser.follow_status);
      } else {
        setError('Could not load user profile.');
      }

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value.data);
      }
      // stats failure is non-fatal — screen still renders

      setLoading(false);
    };

    load();
  }, [id]);

  // ── Follow / unfollow ─────────────────────────────────────────────────────

  const handleFollow = useCallback(async () => {
    if (!user || followLoading) return;
    setFollowLoading(true);

    try {
      if (followStatus === 'none') {
        const res = await api.post<{ data: { status: 'active' | 'pending' } }>(
          `/users/${id}/follow`
        );
        setFollowStatus(res.data.status);
        // Update counts optimistically
        if (res.data.status === 'active') {
          setUser((prev) =>
            prev ? { ...prev, follower_count: prev.follower_count + 1, follow_status: 'active', is_following: true } : prev
          );
        } else {
          setUser((prev) =>
            prev ? { ...prev, follow_status: 'pending' } : prev
          );
        }
      } else if (followStatus === 'active') {
        await api.delete<{ data: { unfollowed: true } }>(`/users/${id}/follow`);
        setFollowStatus('none');
        setUser((prev) =>
          prev
            ? {
                ...prev,
                follower_count: Math.max(0, prev.follower_count - 1),
                follow_status: 'none',
                is_following: false,
              }
            : prev
        );
      }
    } catch {
      // silently fail — state stays as-is
    } finally {
      setFollowLoading(false);
    }
  }, [user, followLoading, followStatus, id]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View className="flex-1 bg-gray-950 items-center justify-center">
        <ActivityIndicator color="#FF6B35" size="large" />
        <Text className="text-gray-400 mt-3">Loading…</Text>
      </View>
    );
  }

  if (error || !user) {
    return (
      <View className="flex-1 bg-gray-950 items-center justify-center px-6">
        <Text className="text-red-400 text-base text-center">
          {error ?? 'User not found.'}
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text style={{ color: '#FF6B35' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const visibleStrengthLevels =
    stats?.strength_levels.filter((s) => s.level !== null) ?? [];

  return (
    <>
      <ScrollView className="flex-1 bg-gray-950" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="px-4 pt-14 pb-2"
          activeOpacity={0.7}
        >
          <Text style={{ color: '#FF6B35', fontSize: 15, fontWeight: '600' }}>
            ← Back
          </Text>
        </TouchableOpacity>

        {/* Avatar + name section */}
        <View className="items-center px-4 pt-4 pb-6">
          <Avatar name={user.full_name || user.username} size={80} />

          <Text className="text-white text-2xl font-bold mt-4 text-center">
            {user.full_name}
          </Text>
          <Text className="text-gray-400 text-sm mt-1">@{user.username}</Text>

          {user.bio ? (
            <Text className="text-gray-400 text-sm italic mt-2 text-center px-6">
              {user.bio}
            </Text>
          ) : null}
        </View>

        {/* Stats row */}
        <View className="flex-row border-t border-b border-gray-800 mx-4">
          {/* Workouts */}
          <View className="flex-1 items-center py-4">
            <Text className="text-white text-xl font-bold">
              {stats?.total_workouts ?? '—'}
            </Text>
            <Text className="text-gray-400 text-xs mt-1">Workouts</Text>
          </View>

          {/* Separator */}
          <View className="w-px bg-gray-800" />

          {/* Followers */}
          <TouchableOpacity
            className="flex-1 items-center py-4"
            activeOpacity={0.7}
            onPress={() => setModalType('followers')}
          >
            <Text className="text-white text-xl font-bold">
              {user.follower_count}
            </Text>
            <Text className="text-gray-400 text-xs mt-1">Followers</Text>
          </TouchableOpacity>

          {/* Separator */}
          <View className="w-px bg-gray-800" />

          {/* Following */}
          <TouchableOpacity
            className="flex-1 items-center py-4"
            activeOpacity={0.7}
            onPress={() => setModalType('following')}
          >
            <Text className="text-white text-xl font-bold">
              {user.following_count}
            </Text>
            <Text className="text-gray-400 text-xs mt-1">Following</Text>
          </TouchableOpacity>
        </View>

        {/* Follow button */}
        <View className="px-4 mt-5">
          {followStatus === 'pending' ? (
            <View className="rounded-xl py-3 items-center bg-gray-700">
              <Text className="text-gray-300 font-semibold">Requested</Text>
            </View>
          ) : followStatus === 'active' ? (
            <TouchableOpacity
              onPress={handleFollow}
              disabled={followLoading}
              activeOpacity={0.8}
              className="rounded-xl py-3 items-center border border-orange-500"
            >
              <Text style={{ color: '#FF6B35', fontWeight: '600' }}>
                {followLoading ? 'Updating…' : 'Following'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleFollow}
              disabled={followLoading}
              activeOpacity={0.8}
              className="rounded-xl py-3 items-center"
              style={{ backgroundColor: '#FF6B35' }}
            >
              <Text className="text-white font-semibold">
                {followLoading ? 'Loading…' : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Streak stats */}
        {stats ? (
          <View className="px-4 mt-5">
            <Text className="text-gray-400 text-sm">
              {'🔥 '}
              <Text className="text-white font-semibold">
                {stats.current_streak} day streak
              </Text>
              {'  •  Longest: '}
              <Text className="text-white font-semibold">
                {stats.longest_streak} days
              </Text>
            </Text>
          </View>
        ) : null}

        {/* Recent Workouts */}
        {stats && stats.recent_workouts.length > 0 ? (
          <View className="px-4 mt-7">
            <Text className="text-white text-base font-bold mb-3">
              Recent Workouts
            </Text>
            {stats.recent_workouts.slice(0, 3).map((w) => (
              <TouchableOpacity
                key={w.id}
                onPress={() => router.push(`/workouts/${w.id}` as never)}
                activeOpacity={0.7}
                className="flex-row items-center justify-between bg-gray-900 rounded-xl px-4 py-3 mb-2"
              >
                <Text className="text-white text-sm font-medium flex-1 mr-3" numberOfLines={1}>
                  {w.workout_name}
                </Text>
                <Text className="text-gray-400 text-xs">
                  {formatRelative(w.started_at)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Strength Levels */}
        {visibleStrengthLevels.length > 0 ? (
          <View className="px-4 mt-7">
            <Text className="text-white text-base font-bold mb-3">
              Strength Levels
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {visibleStrengthLevels.map((s) => (
                <View
                  key={s.exercise_name}
                  className="bg-gray-800 rounded-full px-3 py-1.5"
                >
                  <Text className="text-gray-200 text-xs">
                    {s.exercise_name}:{' '}
                    <Text style={{ color: '#FF6B35' }}>{s.level}</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Followers / Following modal */}
      <FollowModal
        userId={id}
        type={modalType}
        onClose={() => setModalType(null)}
      />
    </>
  );
}
