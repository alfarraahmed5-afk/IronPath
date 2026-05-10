/**
 * Shared-element transitions for cross-route morph (FLIP equivalent).
 *
 * Lens 1 + 10 spec. Reanimated 3 + Expo Router exposes
 * `sharedTransitionTag` on `<Animated.View>`; the same tag on a source
 * + target view morphs the underlying view between them across a
 * Stack push.
 *
 * Two consumption surfaces are exported:
 *
 *  1. `SHARED_TAGS`  -- typed object with callables. Use when you want
 *     compile-time guarantees on the prefix.
 *
 *       const tag = SHARED_TAGS.workoutHero(workout.id);
 *
 *  2. `useSharedTag` / `sharedTag`  -- string-format helpers (hook +
 *     plain) for loose-string callers. Use when the prefix is dynamic
 *     or the call site is already inside a memoized scope.
 *
 *       const tag = useSharedTag('workout-card', workout.id);
 *
 * Pairs shipped in v1 (see `SHARED_TAG_PAIRS` for routes):
 *
 *   workout-card-{workoutId}      -> workout detail header photo
 *   profile-avatar-{userId}       -> profile/edit avatar
 *   leaderboard-row-{userId}      -> users/[id] header
 *   pr-badge-{prId}               -> celebrate hero badge
 *   exercise-card-{routineExId}   -> exercise/[id] header
 *
 * Risk note: shared-element transitions on Expo Router are flagged
 * experimental. If back-nav glitches surface in QA, individual tags
 * can be removed without affecting the rest. Pair-by-pair verification
 * is on Team C.
 */
import { useMemo } from 'react';

// ----- Typed callable map -------------------------------------------------

export const SHARED_TAGS = {
  /** Workout card on Feed / Workouts -> Workout detail header. */
  workoutHero:    (id: string) => `workout-card-${id}`,
  /** Profile avatar -> Profile/edit avatar morph (self). */
  avatarSelf:     'profile-avatar-self',
  /** Leaderboard row avatar -> Users/[id] detail header. */
  avatarUser:     (userId: string) => `leaderboard-row-${userId}`,
  /** PR badge on showcase / finish -> Celebrate hero badge. */
  prBadge:        (id: string) => `pr-badge-${id}`,
  /** Streak ring on profile -> Streak detail. */
  streakSelf:     'streak-self',
  /** Exercise card in a routine -> Exercises/[id] header. */
  exerciseCard:   (routineExId: string) => `exercise-card-${routineExId}`,
} as const;

export type SharedTag =
  | ReturnType<typeof SHARED_TAGS.workoutHero>
  | typeof SHARED_TAGS.avatarSelf
  | ReturnType<typeof SHARED_TAGS.avatarUser>
  | ReturnType<typeof SHARED_TAGS.prBadge>
  | typeof SHARED_TAGS.streakSelf
  | ReturnType<typeof SHARED_TAGS.exerciseCard>;

// ----- Prefix constants + string-format helpers ---------------------------

export const SHARED_TAG_PREFIXES = {
  workoutCard:    'workout-card',
  profileAvatar:  'profile-avatar',
  leaderboardRow: 'leaderboard-row',
  prBadge:        'pr-badge',
  exerciseCard:   'exercise-card',
} as const;

export type SharedTagPrefix = typeof SHARED_TAG_PREFIXES[keyof typeof SHARED_TAG_PREFIXES];

/**
 * Hook variant: memoized formatter returning `<prefix>-<id>`.
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

// ----- Source -> target route mapping (documentation) ---------------------

/**
 * Documentation-only mapping of source -> target screen routes for
 * each shared-element tag prefix. Read this when adding a new pair so
 * the conventions stay consistent.
 */
export const SHARED_TAG_PAIRS: Record<SharedTagPrefix, { source: string; target: string }> = {
  'workout-card':    { source: '(tabs)/index | workouts/index', target: 'workouts/[id]' },
  'profile-avatar':  { source: '(tabs)/profile | (tabs)/me',   target: 'profile/edit' },
  'leaderboard-row': { source: '(tabs)/leaderboard',           target: 'users/[id]' },
  'pr-badge':        { source: 'workouts/finish (PR card)',    target: 'workouts/celebrate (hero)' },
  'exercise-card':   { source: 'routines/[id] (row)',          target: 'exercises/[id]' },
};
