import { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Settings, Flame, ChevronRight, Activity } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/lib/api';
import { Avatar } from '../../src/components/Avatar';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Button } from '../../src/components/Button';
import { Icon } from '../../src/components/Icon';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, spacing, radii } from '../../src/theme/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const LEVEL_COLORS: Record<string, string> = {
  Beginner:     colors.info,
  Intermediate: colors.success,
  Advanced:     colors.brand,
  Elite:        '#A855F7',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [followerCount, setFollowerCount] = useState('0');
  const [followingCount, setFollowingCount] = useState('0');
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
        api.get<{ followers: unknown[]; next_cursor: string | null }>(`/users/${userId}/followers?limit=50`),
        api.get<{ following: unknown[]; next_cursor: string | null }>(`/users/${userId}/following?limit=50`),
      ]);
      if (profileRes.status === 'fulfilled') setProfile((profileRes.value as any).data);
      if (statsRes.status === 'fulfilled') setStats((statsRes.value as any).data);
      if (followersRes.status === 'fulfilled') {
        const fd = followersRes.value as any;
        const c = fd.followers?.length ?? 0;
        setFollowerCount(fd.next_cursor ? `${c}+` : String(c));
      }
      if (followingRes.status === 'fulfilled') {
        const fd = followingRes.value as any;
        const c = fd.following?.length ?? 0;
        setFollowingCount(fd.next_cursor ? `${c}+` : String(c));
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  const displayUsername = profile?.username ?? user?.username ?? '';
  const displayFullName = profile?.full_name ?? user?.full_name ?? null;
  const displayAvatar = profile?.avatar_url ?? user?.avatar_url ?? null;
  const displayBio = profile?.bio ?? null;
  const recentWorkouts = (stats?.recent_workouts ?? []).slice(0, 5);
  const strengthLevels = (stats?.strength_levels ?? []).filter(s => s.level);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <Text variant="title2" color="textPrimary">Profile</Text>
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            style={styles.settingsBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Settings size={18} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
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
          <Button
            label="Edit Profile"
            onPress={() => router.push('/profile/edit')}
            variant="secondary"
            size="sm"
            style={{ marginTop: spacing.md }}
          />
        </View>

        {/* Stats row */}
        <Surface level={2} style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text variant="numeric" color="textPrimary">{stats?.total_workouts ?? 0}</Text>
            <Text variant="overline" color="textTertiary">Workouts</Text>
          </View>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statCell} onPress={() => router.push('/profile/followers')}>
            <Text variant="numeric" color="textPrimary">{followerCount}</Text>
            <Text variant="overline" color="textTertiary">Followers</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statCell} onPress={() => router.push('/profile/following')}>
            <Text variant="numeric" color="textPrimary">{followingCount}</Text>
            <Text variant="overline" color="textTertiary">Following</Text>
          </TouchableOpacity>
        </Surface>

        {/* Streak */}
        <Surface level={2} style={styles.streakCard}>
          <View style={styles.streakRow}>
            <Flame
              size={22}
              color={stats && stats.current_streak_weeks > 0 ? colors.brand : colors.textTertiary}
              strokeWidth={2}
            />
            <View style={{ marginLeft: spacing.md }}>
              <Text variant="title3" color="textPrimary">
                {stats && stats.current_streak_weeks > 0
                  ? `${stats.current_streak_weeks} week streak`
                  : 'No active streak'}
              </Text>
              <Text variant="caption" color="textTertiary">
                Total volume: {stats ? stats.total_volume_kg.toLocaleString() : 0} kg
              </Text>
            </View>
          </View>
        </Surface>

        {/* Strength Levels */}
        {strengthLevels.length > 0 && (
          <View style={{ marginBottom: spacing.base }}>
            <Text variant="title3" color="textPrimary" style={styles.sectionTitle}>Strength Levels</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.levelsScroll}>
              {strengthLevels.map((item, i) => (
                <Surface
                  key={i}
                  level={3}
                  style={[styles.levelChip, { borderLeftColor: LEVEL_COLORS[item.level] ?? colors.textTertiary, borderLeftWidth: 3 }]}
                >
                  <Activity size={12} color={LEVEL_COLORS[item.level] ?? colors.textTertiary} strokeWidth={2} />
                  <Text variant="caption" color="textSecondary" numberOfLines={2} style={{ marginTop: 4, textAlign: 'center' }}>
                    {item.exercise_name}
                  </Text>
                  <Text variant="overline" style={{ color: LEVEL_COLORS[item.level] ?? colors.textTertiary, marginTop: 2 }}>
                    {item.level}
                  </Text>
                </Surface>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recent Workouts */}
        <View style={{ marginBottom: spacing.base }}>
          <View style={styles.sectionHeader}>
            <Text variant="title3" color="textPrimary">Recent Workouts</Text>
            <TouchableOpacity onPress={() => router.push('/workouts')}>
              <Text variant="label" color="brand">See all</Text>
            </TouchableOpacity>
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
                <TouchableOpacity
                  key={workout.id}
                  onPress={() => router.push(`/workouts/${workout.id}`)}
                  style={[
                    styles.workoutRow,
                    index < recentWorkouts.length - 1 && styles.workoutRowBorder,
                  ]}
                >
                  <View style={{ flex: 1, marginRight: spacing.md }}>
                    <Text variant="bodyEmphasis" color="textPrimary" numberOfLines={1}>{workout.name}</Text>
                    <Text variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
                      {formatRelativeDate(workout.started_at)}
                    </Text>
                  </View>
                  <View style={styles.volumeBadge}>
                    <Text variant="label" color="textSecondary">
                      {workout.total_volume_kg.toLocaleString()} kg
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2} style={{ marginLeft: spacing.sm }} />
                </TouchableOpacity>
              ))}
            </Surface>
          )}
        </View>

        {/* Sign Out */}
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
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.base,
    gap: 2,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  streakCard: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    padding: spacing.base,
  },
  streakRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { paddingHorizontal: spacing.base, marginBottom: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  levelsScroll: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  levelChip: {
    alignItems: 'center',
    minWidth: 90,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
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
});
