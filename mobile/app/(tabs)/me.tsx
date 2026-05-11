/**
 * (tabs)/me.tsx -- Option B slim Me tab (replaces the legacy
 * (tabs)/profile.tsx role per founder Q1 lock).
 *
 * Surfaces: avatar hero, badges, Edit Profile, Showcase PRs, Duels
 * card, Recent Workouts (top 5), Settings, Sign Out.
 *
 * Stats strip + streak card move to (tabs)/progress.tsx (see C-1's
 * Progress tab implementation). The "My Stats" link still exists
 * but routes to /analytics (the rewritten analytics screen).
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, ChevronRight, Trophy, Swords, BarChart2 } from 'lucide-react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/lib/api';
import { Avatar } from '../../src/components/Avatar';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Button } from '../../src/components/Button';
import { Icon } from '../../src/components/Icon';
import { EmptyState } from '../../src/components/EmptyState';
import { BadgeChip } from '../../src/components/BadgeChip';
import { Pressable } from '../../src/design-system/primitives/Pressable';
import { GoalsList } from '../../src/features/goals/GoalsList';
import { colors, spacing, radii } from '../../src/theme/tokens';

interface ProfileData {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string;
  gym_id: string;
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
  exercises?: { id: string; name: string; image_url: string | null } | null;
}

interface BadgeData {
  id: string;
  badge_type: string;
  badge_label: string;
  badge_color: string | null;
  metadata: Record<string, unknown> | null;
}

interface RecentWorkout {
  id: string;
  name?: string;
  workout_name?: string;
  started_at: string;
  total_volume_kg: number;
}

interface StatsData {
  recent_workouts: RecentWorkout[];
}

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function MeScreen() {
  const { user, logout, setUser } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([]);
  const [showcase, setShowcase] = useState<ShowcasePR[]>([]);
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [pinnedExerciseName, setPinnedExerciseName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const [profileRes, statsRes, showcaseRes, badgesRes] = await Promise.allSettled([
        api.get<{ data: ProfileData }>('/users/me'),
        api.get<{ data: StatsData }>(`/users/${userId}/stats`),
        api.get<{ data: { showcase: ShowcasePR[] } }>(`/users/${userId}/showcase`),
        api.get<{ data: { badges: BadgeData[] } }>(`/users/${userId}/badges`),
      ]);
      if (profileRes.status === 'fulfilled') {
        const fresh = (profileRes.value as any).data;
        setProfile(fresh);
        if (fresh && setUser) setUser({ ...(user as any), ...fresh });
        if (fresh?.pinned_challenge_exercise_id) {
          api.get<{ data: { exercises: Array<{ id: string; name: string }> } }>(`/exercises/by-ids?ids=${fresh.pinned_challenge_exercise_id}`)
            .then(r => setPinnedExerciseName(r.data?.exercises?.[0]?.name ?? null))
            .catch(() => {});
        } else {
          setPinnedExerciseName(null);
        }
      }
      if (statsRes.status === 'fulfilled') {
        setRecentWorkouts(((statsRes.value as any).data?.recent_workouts ?? []).slice(0, 5));
      }
      if (showcaseRes.status === 'fulfilled') setShowcase((showcaseRes.value as any).data?.showcase ?? []);
      if (badgesRes.status === 'fulfilled') setBadges((badgesRes.value as any).data?.badges ?? []);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setUser]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) fetchAll(user.id);
    }, [user?.id, fetchAll])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.brandDisplay} />
        </View>
      </SafeAreaView>
    );
  }

  const displayUsername = user?.username ?? profile?.username ?? '';
  const displayFullName = user?.full_name ?? profile?.full_name ?? null;
  const displayAvatar = user?.avatar_url ?? profile?.avatar_url ?? null;
  const displayBio = (user as any)?.bio ?? profile?.bio ?? null;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text variant="title2" color="textPrimary">Me</Text>
          <Pressable
            onPress={() => router.push('/settings')}
            style={styles.settingsBtn}
            accessibilityLabel="Settings"
          >
            <Icon icon={Settings} size={18} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Avatar + info */}
        <View style={styles.heroSection}>
          <Avatar username={displayUsername} avatarUrl={displayAvatar} size={80} />
          <Text variant="title2" color="textPrimary" style={{ marginTop: spacing.md }}>
            {displayUsername}
          </Text>
          {displayFullName ? (
            <Text variant="body" color="textSecondary">{displayFullName}</Text>
          ) : null}
          {displayBio ? (
            <Text variant="body" color="textSecondary" style={styles.bio}>{displayBio}</Text>
          ) : null}
          {badges.length > 0 ? (
            <View style={styles.badgeRow}>
              {badges.slice(0, 4).map(b => (
                <View key={b.id} style={{ marginRight: spacing.xs, marginBottom: spacing.xs }}>
                  <BadgeChip badge={b as any} size="sm" />
                </View>
              ))}
            </View>
          ) : null}
          <Button
            label="Edit Profile"
            onPress={() => router.push('/profile/edit')}
            variant="secondary"
            size="sm"
            style={{ marginTop: spacing.md }}
          />
        </View>

        {/* PR Showcase */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="overline" color="textTertiary">SHOWCASE PRS</Text>
            <Pressable
              onPress={() => router.push('/profile/showcase' as any)}
              accessibilityLabel="Edit showcase PRs"
            >
              <Text variant="label" color="brand">{showcase.length === 0 ? 'Add' : 'Edit'}</Text>
            </Pressable>
          </View>
          {showcase.length === 0 ? (
            <Surface level={2} style={styles.showcaseEmpty}>
              <Icon icon={Trophy} size={20} color={colors.textTertiary} strokeWidth={1.5} />
              <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xs, textAlign: 'center' }}>
                Pin up to 3 PRs to flex on your profile
              </Text>
            </Surface>
          ) : (
            <View style={styles.showcaseRow}>
              {showcase.map(pr => (
                <Surface key={pr.id} level={2} style={[styles.showcaseCard, { borderColor: colors.brandText }]}>
                  <Icon icon={Trophy} size={16} color={colors.brandDisplay} strokeWidth={2} />
                  <Text variant="caption" color="textTertiary" numberOfLines={1} style={{ marginTop: spacing.xs }}>
                    {pr.exercises?.name || 'Exercise'}
                  </Text>
                  <Text variant="numeric" color="brand" style={{ fontSize: 18, lineHeight: 22 }}>
                    {Math.round(pr.value * 10) / 10}{pr.record_type.includes('reps') ? '' : pr.record_type.includes('duration') ? 's' : pr.record_type.includes('distance') ? 'm' : ' kg'}
                  </Text>
                  <Text variant="overline" color="textTertiary" style={{ fontSize: 9 }}>
                    {pr.record_type.replace(/_/g, ' ')}
                  </Text>
                </Surface>
              ))}
            </View>
          )}
        </View>

        {/* Goals snapshot */}
        <View style={[styles.section, { marginBottom: spacing.lg }]}>
          <GoalsList limit={2} />
        </View>

        {/* 1v1 Challenges */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="overline" color="textTertiary">1V1 CHALLENGES</Text>
            <Pressable
              onPress={() => router.push('/profile/duel-pin' as any)}
              accessibilityLabel="Set duel pin"
            >
              <Text variant="label" color="brand">{pinnedExerciseName ? 'Change' : 'Pin'}</Text>
            </Pressable>
          </View>
          <Surface level={2} style={styles.duelCard}>
            <View style={styles.duelRow}>
              <View style={[styles.duelIcon, { backgroundColor: colors.brandGlow }]}>
                <Icon icon={Swords} size={18} color={colors.brandText} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                {pinnedExerciseName ? (
                  <>
                    <Text variant="bodyEmphasis" color="textPrimary" numberOfLines={1}>{pinnedExerciseName}</Text>
                    <Text variant="caption" color="textTertiary">Tap an opponent's profile to challenge them</Text>
                  </>
                ) : (
                  <>
                    <Text variant="bodyEmphasis" color="textPrimary">No exercise pinned</Text>
                    <Text variant="caption" color="textTertiary">Pin one to invite 1v1 challenges</Text>
                  </>
                )}
              </View>
            </View>
            <View style={styles.duelStatsRow}>
              <View style={styles.duelStatCell}>
                <Text variant="numeric" color="success" style={{ fontSize: 20, lineHeight: 24 }}>
                  {profile?.challenge_wins ?? 0}
                </Text>
                <Text variant="overline" color="textTertiary">Wins</Text>
              </View>
              <View style={styles.duelStatDivider} />
              <View style={styles.duelStatCell}>
                <Text variant="numeric" color="danger" style={{ fontSize: 20, lineHeight: 24 }}>
                  {profile?.challenge_losses ?? 0}
                </Text>
                <Text variant="overline" color="textTertiary">Losses</Text>
              </View>
              <View style={styles.duelStatDivider} />
              <Pressable
                style={styles.duelStatCell}
                onPress={() => router.push('/duels' as any)}
                accessibilityLabel="View my duels"
              >
                <Text variant="label" color="brand">View All</Text>
                <Text variant="overline" color="textTertiary">My Duels</Text>
              </Pressable>
            </View>
          </Surface>
        </View>

        {/* My Stats deep-link */}
        <Pressable
          onPress={() => router.push('/analytics' as any)}
          style={[styles.mx, { marginBottom: spacing.base }]}
          accessibilityLabel="Open My Stats"
        >
          <Surface level={2} style={styles.statsNavCard}>
            <View style={styles.statsNavIcon}>
              <Icon icon={BarChart2} size={18} color={colors.brandDisplay} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyEmphasis" color="textPrimary">My Stats</Text>
              <Text variant="caption" color="textTertiary">Volume, muscles, strength levels</Text>
            </View>
            <Icon icon={ChevronRight} size={16} color={colors.textTertiary} strokeWidth={2} />
          </Surface>
        </Pressable>

        {/* Recent workouts */}
        <View style={{ marginBottom: spacing.base }}>
          <View style={styles.sectionHeader}>
            <Text variant="title3" color="textPrimary">Recent Workouts</Text>
            <Pressable
              onPress={() => router.push('/workouts')}
              accessibilityLabel="See all workouts"
            >
              <Text variant="label" color="brand">See all</Text>
            </Pressable>
          </View>
          {recentWorkouts.length === 0 ? (
            <View style={styles.mx}>
              <EmptyState
                illustration="workouts"
                title="Your first workout starts here"
                description="Tap Start to log a session."
                action={{ label: 'Start Workout', onPress: () => router.push('/workout/active') }}
              />
            </View>
          ) : (
            <Surface level={2} style={styles.mx}>
              {recentWorkouts.map((workout, index) => (
                <Pressable
                  key={workout.id}
                  onPress={() => router.push(`/workouts/${workout.id}` as any)}
                  style={[
                    styles.workoutRow,
                    index < recentWorkouts.length - 1 && styles.workoutRowBorder,
                  ]}
                  accessibilityLabel={`Open ${workout.workout_name ?? workout.name} workout`}
                >
                  <View style={{ flex: 1, marginRight: spacing.md }}>
                    <Text variant="bodyEmphasis" color="textPrimary" numberOfLines={1}>{workout.workout_name ?? workout.name}</Text>
                    <Text variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
                      {formatRelativeDate(workout.started_at)}
                    </Text>
                  </View>
                  <View style={styles.volumeBadge}>
                    <Text variant="label" color="textSecondary">
                      {workout.total_volume_kg.toLocaleString()} kg
                    </Text>
                  </View>
                  <View style={{ marginLeft: spacing.sm }}>
                    <Icon icon={ChevronRight} size={16} color={colors.textTertiary} strokeWidth={2} />
                  </View>
                </Pressable>
              ))}
            </Surface>
          )}
        </View>

        <View style={styles.mx}>
          <Button
            label="Sign Out"
            onPress={async () => {
              await logout();
              router.replace('/(auth)/login');
            }}
            variant="destructive"
            size="md"
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.xl,
  },
  bio: { textAlign: 'center', marginTop: spacing.xs, paddingHorizontal: spacing.xl },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  section: { marginHorizontal: spacing.base, marginBottom: spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  showcaseEmpty: {
    padding: spacing.lg,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.border,
  },
  showcaseRow: { flexDirection: 'row', gap: spacing.sm },
  showcaseCard: {
    flex: 1,
    padding: spacing.md,
    borderWidth: 1,
    alignItems: 'flex-start',
    gap: 0,
  },
  duelCard: { padding: spacing.base },
  duelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  duelIcon: { width: 36, height: 36, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  duelStatsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface3,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
  },
  duelStatCell: { flex: 1, alignItems: 'center', gap: 2 },
  duelStatDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 4 },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  workoutRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  volumeBadge: {
    backgroundColor: colors.surface3,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  mx: { marginHorizontal: spacing.base },
  statsNavCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    gap: spacing.md,
  },
  statsNavIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.brandGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
