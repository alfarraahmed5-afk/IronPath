/**
 * Home tab -- NEW landing screen for the Option B IA (founder Q1 lock).
 *
 * Composition (lens 5 P0 + brief from C-2):
 *   1. Top bar: greeting + bell -> /notifications.
 *   2. Hero band: brand-tone photo strip ("Train today.") with a magnetic
 *      Start workout CTA pinned to it. Streak ribbon overlays the
 *      bottom-left when current_streak_days > 0.
 *   3. Today's session preview: pulls the next session from /trainer
 *      progress if a program is active. Renders nothing when no
 *      program -- the hero CTA suffices.
 *   4. Recent feed preview: 3-card Feed via the shared feature module.
 *
 * Photos: hero uses `chalk-hands` (Lens 2 P0-5 brief) per MANIFEST.md.
 * The MANIFEST entry is already STAGED -- the actual AVIF lands when
 * the founder confirms attribution. Until then expo-image renders the
 * blurhash placeholder gracefully and the gradient mask + ember overlay
 * still ship.
 */
import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Flame, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { api } from '../../src/lib/api';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Hero } from '../../src/design-system/primitives/Hero';
import { Button } from '../../src/design-system/primitives/Button';
import { colors, spacing, radii } from '../../src/theme/tokens';
import Feed from '../../src/features/feed/Feed';

interface MyStats {
  current_streak: number;
  longest_streak: number;
  total_workouts: number;
}

interface NextSession {
  id?: string;
  title?: string;
  exercise_count?: number;
  estimated_duration_minutes?: number;
}

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const [stats, setStats] = useState<MyStats | null>(null);
  const [nextSession, setNextSession] = useState<NextSession | null>(null);

  useEffect(() => {
    // Stats for the streak ribbon.
    api
      .get<{ data: MyStats }>(`/users/${user?.id}/stats`)
      .then((r) => setStats((r as any).data))
      .catch(() => {});
    // Today's session preview from the Trainer surface, if the user has
    // an active program. Endpoint may not always return; swallow on 404.
    api
      .get<{ data: { next_session: NextSession | null } }>('/trainer/next-session')
      .then((r) => setNextSession((r as any).data?.next_session ?? null))
      .catch(() => {});
  }, [user?.id]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  function handleStart() {
    startWorkout('New Workout');
    router.push('/workout/active' as any);
  }

  function handleStartSession() {
    if (!nextSession?.title) return handleStart();
    startWorkout(nextSession.title);
    router.push('/workout/active' as any);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View>
          <Text variant="caption" color="textTertiary">{greeting}</Text>
          <Text variant="title2" color="textPrimary">
            {user?.username ? `@${user.username}` : 'Welcome'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/notifications' as any)}
          style={styles.bellBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Notifications"
        >
          <Bell size={20} color={colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Hero band */}
        <Hero
          height={220}
          source={undefined}
          blurhash={'L4Bz#-N8H#R*?bxa-:S#WCay$~ay'}
          maskCoverage={0.55}
        >
          <View style={styles.heroBody}>
            <Text variant="overline" color="textTertiary">Train today.</Text>
            <Text variant="title1" color="textPrimary" style={styles.heroHeadline}>
              one rep at a time.
            </Text>
            <View style={{ height: spacing.md }} />
            <Button
              label="Start workout"
              onPress={handleStart}
              variant="primary"
              size="lg"
              magnetic
            />
            {/* Streak ribbon */}
            {stats && stats.current_streak > 0 ? (
              <View style={styles.streakRibbon}>
                <Flame size={14} color={colors.flame} strokeWidth={2} />
                <Text variant="label" color="textPrimary" style={{ marginLeft: spacing.xs }}>
                  {stats.current_streak} day streak
                </Text>
              </View>
            ) : null}
          </View>
        </Hero>

        {/* Today's session preview */}
        {nextSession?.title ? (
          <TouchableOpacity onPress={handleStartSession} activeOpacity={0.85} style={styles.sectionWrap}>
            <Text variant="overline" color="textTertiary" style={styles.sectionLabel}>
              Today's session
            </Text>
            <Surface level={2} style={styles.sessionCard}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyEmphasis" color="textPrimary" numberOfLines={1}>
                  {nextSession.title}
                </Text>
                <Text variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
                  {nextSession.exercise_count ?? 0} exercises
                  {nextSession.estimated_duration_minutes
                    ? ` * about ${nextSession.estimated_duration_minutes} min`
                    : ''}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.textTertiary} />
            </Surface>
          </TouchableOpacity>
        ) : null}

        {/* Recent feed preview (3 cards) */}
        <View style={styles.sectionWrap}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing.base,
              marginBottom: spacing.sm,
            }}
          >
            <Text variant="overline" color="textTertiary">Recent in the gym</Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/community' as any)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text variant="label" color="brand">See all</Text>
            </TouchableOpacity>
          </View>
          {/* Feed itself is a flat list; rendering it inside a scroll
              view nests virtualized lists. We pass `limit={3}` to
              short-circuit virtualization and use a small static slice. */}
          <View style={{ height: 540 }}>
            <Feed hideFilterPills limit={3} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.base,
  },
  heroHeadline: {
    fontFamily: 'MonaSans-SemiBold',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  streakRibbon: {
    position: 'absolute',
    right: spacing.base,
    bottom: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  sectionWrap: {
    marginTop: spacing.lg,
  },
  sectionLabel: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  sessionCard: {
    marginHorizontal: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    gap: spacing.md,
  },
});
