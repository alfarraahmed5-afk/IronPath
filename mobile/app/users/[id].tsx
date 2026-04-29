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
import { ChevronRight, Flame, Trophy, Swords } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/authStore';
import { Header } from '../../src/components/Header';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/Button';
import { Icon } from '../../src/components/Icon';
import { Pressable } from '../../src/components/Pressable';
import { EmptyState } from '../../src/components/EmptyState';
import { BadgeChip } from '../../src/components/BadgeChip';
import { Sheet } from '../../src/components/Sheet';
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
  showcase_pr_ids?: string[];
  pinned_challenge_exercise_id?: string | null;
  challenge_wins?: number;
  challenge_losses?: number;
}

interface ShowcasePR {
  id: string;
  exercise_id: string;
  record_type: string;
  value: number;
  achieved_at: string;
  exercises?: { id: string; name: string } | null;
}

interface BadgeData {
  id: string;
  badge_type: string;
  badge_label: string;
  badge_color: string | null;
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
  const myId = useAuthStore(s => s.user?.id);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [showcase, setShowcase] = useState<ShowcasePR[]>([]);
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [pinnedExerciseName, setPinnedExerciseName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [followStatus, setFollowStatus] = useState<'none' | 'pending' | 'active'>('none');
  const [followLoading, setFollowLoading] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [duelSheetOpen, setDuelSheetOpen] = useState(false);
  const [duelSubmitting, setDuelSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const [userResult, statsResult, showcaseResult, badgesResult] = await Promise.allSettled([
        api.get<{ data: { user: PublicUser } }>(`/users/${id}`),
        api.get<{ data: UserStats }>(`/users/${id}/stats`),
        api.get<{ data: { showcase: ShowcasePR[] } }>(`/users/${id}/showcase`),
        api.get<{ data: { badges: BadgeData[] } }>(`/users/${id}/badges`),
      ]);
      if (userResult.status === 'fulfilled') {
        // /users/:id returns the user under data.user OR directly under data
        // depending on private status. Normalize.
        const raw: any = userResult.value;
        const u = raw?.data?.user ?? raw?.data;
        if (u) {
          setUser(u);
          setFollowStatus(u.follow_status ?? 'none');
          if (u.pinned_challenge_exercise_id) {
            api.get<{ data: { exercises: Array<{ id: string; name: string }> } }>(`/exercises/by-ids?ids=${u.pinned_challenge_exercise_id}`)
              .then(r => setPinnedExerciseName(r.data?.exercises?.[0]?.name ?? null))
              .catch(() => {});
          }
        }
      }
      if (statsResult.status === 'fulfilled') setStats((statsResult.value as any).data);
      if (showcaseResult.status === 'fulfilled') setShowcase((showcaseResult.value as any).data?.showcase ?? []);
      if (badgesResult.status === 'fulfilled') setBadges((badgesResult.value as any).data?.badges ?? []);
      setLoading(false);
    };
    load();
  }, [id]);

  async function handleSendDuel(metric: string, days: number) {
    if (!user?.pinned_challenge_exercise_id || duelSubmitting) return;
    setDuelSubmitting(true);
    try {
      const ends_at = new Date(Date.now() + days * 86400 * 1000).toISOString();
      const res = await api.post<{ data: { duel: { id: string } } }>('/duels', {
        opponent_id: user.id,
        exercise_id: user.pinned_challenge_exercise_id,
        metric,
        ends_at,
      });
      setDuelSheetOpen(false);
      const newId = res.data?.duel?.id;
      if (newId) router.push(`/duels/${newId}` as any);
    } catch (e: any) {
      // eslint-disable-next-line no-alert
      alert(e?.error?.message ?? 'Could not send duel');
    } finally {
      setDuelSubmitting(false);
    }
  }

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
            {/* Achievement badges */}
            {badges.length > 0 && (
              <View style={styles.badgeRow}>
                {badges.slice(0, 4).map(b => (
                  <View key={b.id} style={{ marginRight: spacing.xs, marginBottom: spacing.xs }}>
                    <BadgeChip badge={b as any} size="sm" />
                  </View>
                ))}
              </View>
            )}
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

          {/* Action row: Follow + Duel button if pinned exercise */}
          <View style={styles.actionRow}>
            <View style={{ flex: 1, marginRight: pinnedExerciseName && user.id !== myId ? spacing.sm : 0 }}>
              {followStatus === 'pending' ? (
                <Button label="Requested" onPress={handleFollow} variant="secondary" size="md" fullWidth loading={followLoading} />
              ) : followStatus === 'active' ? (
                <Button label="Following" onPress={handleFollow} variant="secondary" size="md" fullWidth loading={followLoading} />
              ) : (
                <Button label="Follow" onPress={handleFollow} variant="primary" size="md" fullWidth loading={followLoading} />
              )}
            </View>
            {pinnedExerciseName && user.id !== myId && (
              <View style={{ flex: 1 }}>
                <Button label="Duel" onPress={() => setDuelSheetOpen(true)} variant="secondary" size="md" fullWidth />
              </View>
            )}
          </View>

          {/* W/L record */}
          {(user.challenge_wins ?? 0) + (user.challenge_losses ?? 0) > 0 && (
            <Surface level={2} style={styles.recordCard}>
              <View style={styles.recordIconWrap}>
                <Icon icon={Swords} size={16} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyEmphasis" color="textPrimary">1v1 Record</Text>
                <Text variant="caption" color="textTertiary">
                  {user.challenge_wins ?? 0}W · {user.challenge_losses ?? 0}L
                </Text>
              </View>
              {pinnedExerciseName ? (
                <View style={styles.pinnedTag}>
                  <Text variant="overline" color="brand">PINNED: {pinnedExerciseName}</Text>
                </View>
              ) : null}
            </Surface>
          )}

          {/* Showcase PRs */}
          {showcase.length > 0 && (
            <View style={styles.section}>
              <Text variant="overline" color="textTertiary" style={styles.sectionLabel}>Showcase PRs</Text>
              <View style={styles.showcaseRow}>
                {showcase.map(pr => (
                  <Surface key={pr.id} level={2} style={[styles.showcaseCard, { borderColor: colors.brand + '40' }]}>
                    <Trophy size={16} color={colors.brand} strokeWidth={2} />
                    <Text variant="caption" color="textTertiary" numberOfLines={1} style={{ marginTop: spacing.xs }}>
                      {pr.exercises?.name || 'Exercise'}
                    </Text>
                    <Text variant="numeric" color="brand" style={{ fontSize: 18, lineHeight: 22 }}>
                      {Math.round(pr.value * 10) / 10}{pr.record_type.includes('reps') ? '' : pr.record_type.includes('duration') ? 's' : pr.record_type.includes('distance') ? 'm' : ' kg'}
                    </Text>
                  </Surface>
                ))}
              </View>
            </View>
          )}

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

      {/* Duel sheet */}
      <Sheet visible={duelSheetOpen} onClose={() => setDuelSheetOpen(false)} snapPoint={0.55}>
        <Text variant="title3" color="textPrimary" style={{ marginBottom: spacing.xs }}>
          Challenge {user.username}
        </Text>
        <Text variant="caption" color="textTertiary" style={{ marginBottom: spacing.base }}>
          Pinned: {pinnedExerciseName ?? '—'}
        </Text>
        <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.sm }}>Metric</Text>
        {([
          { key: 'heaviest_weight', label: 'Heaviest Weight' },
          { key: 'projected_1rm', label: 'Estimated 1RM' },
          { key: 'most_reps', label: 'Most Reps' },
          { key: 'best_volume_set', label: 'Top Set Volume' },
        ] as const).map(opt => (
          <Pressable
            key={opt.key}
            onPress={() => handleSendDuel(opt.key, 7)}
            style={styles.duelOptRow}
            accessibilityLabel={opt.label}
          >
            <Text variant="body" color="textPrimary" style={{ flex: 1 }}>{opt.label}</Text>
            <Text variant="overline" color="brand">7 days</Text>
          </Pressable>
        ))}
        {duelSubmitting && (
          <View style={{ alignItems: 'center', marginTop: spacing.md }}>
            <ActivityIndicator color={colors.brand} />
          </View>
        )}
      </Sheet>
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
  actionRow: { flexDirection: 'row', paddingHorizontal: spacing.base, marginBottom: spacing.lg },
  badgeRow: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    marginTop: spacing.md, paddingHorizontal: spacing.lg,
  },
  recordCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.base, marginHorizontal: spacing.base, marginBottom: spacing.lg,
    gap: spacing.md,
  },
  recordIconWrap: {
    width: 36, height: 36, borderRadius: radii.full,
    backgroundColor: colors.brandGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  pinnedTag: {
    backgroundColor: colors.brandGlow,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  showcaseRow: { flexDirection: 'row', gap: spacing.sm },
  showcaseCard: {
    flex: 1, padding: spacing.md,
    borderWidth: 1, alignItems: 'flex-start',
  },
  duelOptRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, marginBottom: spacing.xs,
    borderRadius: radii.md, backgroundColor: colors.surface3,
  },
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
