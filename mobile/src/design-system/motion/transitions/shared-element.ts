/**
 * Shared-element transitions.
 *
 * Lens 1 P2 #17 + lens 7 social-affordance spec: documented
 * sharedTransitionTag pairs across screen boundaries. Reanimated 3
 * + Expo Router supports the `sharedTransitionTag` prop on
 * `<Animated.View>`; matching the same tag on the source + target
 * screen morphs the underlying view between them.
 *
 * The pairs we ship in v1:
 *
 *   workout-card-{workoutId}      -> workout detail header photo
 *   profile-avatar-{userId}       -> profile/edit avatar
 *   leaderboard-row-{userId}      -> users/[id] header
 *   pr-badge-{prId}               -> celebrate hero badge
 *   exercise-card-{routineExId}   -> exercise/[id] header
 *
 * Use via:
 *
 *   import { useSharedTag } from '@/design-system/motion/transitions';
 *   const tag = useSharedTag('workout-card', workout.id);
 *   <Animated.View sharedTransitionTag={tag}>
 *     ...
 *   </Animated.View>
 *
 * The hook is just a memoized string-formatter, but isolating it
 * here means a future renaming pass touches one file.
 *
 * Caution: shared transitions on Stack screens behind a Tabs layer
 * still have known back-nav glitches in Expo Router. Pair-by-pair
 * verification is on Team C.
 */
import { useMemo } from 'react';

export const SHARED_TAG_PREFIXES = {
  workoutCard: 'workout-card',
  profileAvatar: 'profile-avatar',
  leaderboardRow: 'leaderboard-row',
  prBadge: 'pr-badge',
  exerciseCard: 'exercise-card',
} as const;

export type SharedTagPrefix = typeof SHARED_TAG_PREFIXES[keyof typeof SHARED_TAG_PREFIXES];

/**
 * Format helper: returns `<prefix>-<id>`. Memoized on (prefix, id).
 */
export function useSharedTag(prefix: string, id: string | number): string {
  return useMemo(() => `${prefix}-${id}`, [prefix, id]);
}

/**
 * Plain (non-hook) variant for places that already memoize their
 * inputs (e.g. inside `useMemo(() => items.map(...), [items])`).
 */
export function sharedTag(prefix: string, id: string | number): string {
  return `${prefix}-${id}`;
}

/**
 * Documentation-only mapping of source -> target screen routes for
 * each shared-element tag prefix. Read this when adding a new pair
 * so the conventions stay consistent.
 */
export const SHARED_TAG_PAIRS: Record<SharedTagPrefix, { source: string; target: string }> = {
  'workout-card':    { source: '(tabs)/index | workouts/index', target: 'workouts/[id]' },
  'profile-avatar':  { source: '(tabs)/profile | (tabs)/me',   target: 'profile/edit' },
  'leaderboard-row': { source: '(tabs)/leaderboard',           target: 'users/[id]' },
  'pr-badge':        { source: 'workouts/finish (PR card)',    target: 'workouts/celebrate (hero)' },
  'exercise-card':   { source: 'routines/[id] (row)',          target: 'exercises/[id]' },
};
