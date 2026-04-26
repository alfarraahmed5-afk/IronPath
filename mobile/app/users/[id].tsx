import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Flame } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { Header } from '../../src/components/Header';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/Button';
import { Icon } from '../../src/components/Icon';
import { Pressable } from '../../src/components/Pressable';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, spacing, radii } from '../../src/theme/tokens';

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

const LEVEL_COLORS: Record<string, string> = {
  Beginner: colors.info,
  Intermediate: colors.success,
  Advanced: colors.brand,
  Elite: colors.setDropset,
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function FollowUserRow({ item }: { item: FollowUser }) {
  return (
    <View style={styles.followRow}>
      <Avatar username={item.full_name || item.username} avatarUrl={item.avatar_url} size={40} />
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text variant="bodyEmphasis" color="textPrimary">{item.full_name}</Text>
        <Text variant="caption" color="textTertiary">@{item.username}</Text>
      </View>
    </View>
  );
}

function FollowModal({ userId, type, onClose }: { userId: string; type: ModalType; onClose: () => void }) {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchUsers = useCallback(async (cursor?: string) => {
    if (!type) return;
    try {
      const url = cursor
        ? `/users/${userId}/${type}?cursor=${encodeURIComponent(cursor)}`
        : `/users/${userId}/${type}`;
      const res = await api.get<{ data: { followers?: FollowUser[]; following?: FollowUser[]; next_cursor: string | null } }>(url);
      const items = type === 'followers' ? res.data.followers ?? [] : res.data.following ?? [];
      setUsers((prev) => (cursor ? [...prev, ...items] : items));
      setNextCursor(res.data.next_cursor);
    } catch {}
  }, [userId, type]);

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
    <Modal visible={!!type} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalRoot} edges={['top']}>
        <View style={styles.modalHeader}>
          <Text variant="title3" color="textPrimary" style={{ textTransform: 'capitalize' }}>{type}</Text>
          <Pressable onPress={onClose} accessibilityLabel="Close">
            <Text variant="label" color="brand">Done</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.brand} size="large" />
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.user_id}
            renderItem={({ item }) => <FollowUserRow item={item} />}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.brand} style={{ paddingVertical: spacing.lg }} /> : null}
            ListEmptyComponent={<EmptyState title="No users yet" />}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [followStatus, setFollowStatus] = useState<'none' | 'pending' | 'active'>('none');
  const [followLoading, setFollowLoading] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const [userResult, statsResult] = await Promise.allSettled([
        api.get<{ data: { user: PublicUser } }>(`/users/${id}`),
        api.get<{ data: UserStats }>(`/users/${id}/stats`),
      ]);
      if (userResult.status === 'fulfilled') {
        const u = userResult.value.data.user;
        setUser(u);
        setFollowStatus(u.follow_status);
      }
      if (statsResult.status === 'fulfilled') setStats(statsResult.value.data);
      setLoading(false);
    };
    load();
  }, [id]);

  const handleFollow = useCallback(async () => {
    if (!user || followLoading) return;
    setFollowLoading(true);
    try {
      if (followStatus === 'none') {
        const res = await api.post<{ data: { status: 'active' | 'pending' } }>(`/users/${id}/follow`);
        setFollowStatus(res.data.status);
        if (res.data.status === 'active') {
          setUser(prev => prev ? { ...prev, follower_count: prev.follower_count + 1, follow_status: 'active', is_following: true } : prev);
        } else {
          setUser(prev => prev ? { ...prev, follow_status: 'pending' } : prev);
        }
      } else if (followStatus === 'active') {
        await api.delete(`/users/${id}/follow`);
        setFollowStatus('none');
        setUser(prev => prev ? { ...prev, follower_count: Math.max(0, prev.follower_count - 1), follow_status: 'none', is_following: false } : prev);
      }
    } catch {} finally { setFollowLoading(false); }
  }, [user, followLoading, followStatus, id]);

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.root, styles.centered]}>
        <EmptyState illustration="404" title="User not found" action={{ label: 'Go back', onPress: () => router.back() }} />
      </View>
    );
  }

  const visibleStrengthLevels = stats?.strength_levels.filter((s) => s.level !== null) ?? [];

  return (
    <>
      <SafeAreaView style={styles.root} edges={['top']}>
        <Header title={user.username} back />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Avatar + bio */}
          <View style={styles.heroSection}>
            <Avatar username={user.full_name || user.username} avatarUrl={user.avatar_url} size={80} />
            <Text variant="title2" color="textPrimary" style={styles.fullName}>{user.full_name}</Text>
            <Text variant="label" color="textTertiary">@{user.username}</Text>
            {user.bio ? (
              <Text variant="body" color="textSecondary" style={styles.bio}>{user.bio}</Text>
            ) : null}
          </View>

          {/* Stats row */}
          <Surface level={2} style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text variant="numeric" color="textPrimary">{stats?.total_workouts ?? '—'}</Text>
              <Text variant="overline" color="textTertiary">Workouts</Text>
            </View>
            <View style={styles.statDivider} />
            <Pressable style={styles.statCell} onPress={() => setModalType('followers')} accessibilityLabel="Followers">
              <Text variant="numeric" color="textPrimary">{user.follower_count}</Text>
              <Text variant="overline" color="textTertiary">Followers</Text>
            </Pressable>
            <View style={styles.statDivider} />
            <Pressable style={styles.statCell} onPress={() => setModalType('following')} accessibilityLabel="Following">
              <Text variant="numeric" color="textPrimary">{user.following_count}</Text>
              <Text variant="overline" color="textTertiary">Following</Text>
            </Pressable>
          </Surface>

          {/* Follow button */}
          <View style={styles.followBtnRow}>
            {followStatus === 'pending' ? (
              <Button label="Requested" onPress={handleFollow} variant="secondary" size="md" fullWidth loading={followLoading} />
            ) : followStatus === 'active' ? (
              <Button label="Following" onPress={handleFollow} variant="secondary" size="md" fullWidth loading={followLoading} />
            ) : (
              <Button label="Follow" onPress={handleFollow} variant="primary" size="md" fullWidth loading={followLoading} />
            )}
          </View>

          {/* Streak */}
          {stats && (stats.current_streak > 0 || stats.longest_streak > 0) ? (
            <View style={styles.section}>
              <Surface level={2} style={styles.streakCard}>
                <Icon icon={Flame} size={18} color={stats.current_streak > 0 ? colors.brand : colors.textTertiary} />
                <View style={{ marginLeft: spacing.md }}>
                  <Text variant="bodyEmphasis" color="textPrimary">{stats.current_streak} day streak</Text>
                  <Text variant="caption" color="textTertiary">Longest: {stats.longest_streak} days</Text>
                </View>
              </Surface>
            </View>
          ) : null}

          {/* Recent workouts */}
          {stats && stats.recent_workouts.length > 0 ? (
            <View style={styles.section}>
              <Text variant="overline" color="textTertiary" style={styles.sectionLabel}>Recent Workouts</Text>
              <Surface level={2}>
                {stats.recent_workouts.slice(0, 3).map((w, idx) => (
                  <Pressable
                    key={w.id}
                    onPress={() => router.push(`/workouts/${w.id}` as never)}
                    style={[styles.workoutRow, idx < 2 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                    accessibilityLabel={w.workout_name}
                  >
                    <Text variant="bodyEmphasis" color="textPrimary" style={{ flex: 1 }} numberOfLines={1}>{w.workout_name}</Text>
                    <Text variant="caption" color="textTertiary">{formatRelative(w.started_at)}</Text>
                    <View style={{ marginLeft: spacing.xs }}><Icon icon={ChevronRight} size={14} color={colors.textTertiary} /></View>
                  </Pressable>
                ))}
              </Surface>
            </View>
          ) : null}

          {/* Strength levels */}
          {visibleStrengthLevels.length > 0 ? (
            <View style={styles.section}>
              <Text variant="overline" color="textTertiary" style={styles.sectionLabel}>Strength Levels</Text>
              <View style={styles.levelChips}>
                {visibleStrengthLevels.map((s) => {
                  const c = s.level ? (LEVEL_COLORS[s.level] ?? colors.textTertiary) : colors.textTertiary;
                  return (
                    <View key={s.exercise_name} style={[styles.levelChip, { borderColor: c + '60' }]}>
                      <Text variant="caption" color="textSecondary">{s.exercise_name}</Text>
                      <Text variant="overline" style={{ color: c, marginTop: 2 }}>{s.level}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <FollowModal userId={id} type={modalType} onClose={() => setModalType(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },
  heroSection: { alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.xl },
  fullName: { marginTop: spacing.md },
  bio: { marginTop: spacing.sm, textAlign: 'center', paddingHorizontal: spacing.xl },
  statsRow: { flexDirection: 'row', marginHorizontal: spacing.base, marginBottom: spacing.base },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: spacing.base, gap: spacing.xxs },
  statDivider: { width: StyleSheet.hairlineWidth, height: 40, backgroundColor: colors.border, alignSelf: 'center' },
  followBtnRow: { paddingHorizontal: spacing.base, marginBottom: spacing.lg },
  section: { paddingHorizontal: spacing.base, marginBottom: spacing.lg },
  sectionLabel: { marginBottom: spacing.sm },
  streakCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.base },
  workoutRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.md, gap: spacing.sm },
  levelChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  levelChip: { borderWidth: 1, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  // Modal
  modalRoot: { flex: 1, backgroundColor: colors.bg },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  followRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
