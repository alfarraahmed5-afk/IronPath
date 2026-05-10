/**
 * Shared-element transitions for cross-route morph (FLIP equivalent).
 *
 * Lens 1 + 10 spec:
 *   Pairs that morph across routes via Reanimated 3's
 *   `sharedTransitionTag`. Expo Router 4 surfaces the tag through
 *   `<Animated.View sharedTransitionTag="..." />` on Stack screens.
 *
 * The TAGS map below is the canonical contract. Screens consume by
 * name; a typo in either the from-route or to-route silently breaks
 * the morph, so consumers MUST import from this file.
 *
 * Risk note: shared-element transitions on Expo Router are flagged
 * "experimental" -- if back-nav glitches surface in QA, individual
 * tags can be removed without affecting the rest.
 */

export const SHARED_TAGS = {
  /** Workout card on Feed -> Workout detail screen header. */
  workoutHero:    (id: string) => `workout-${id}`,
  /** Profile avatar -> Profile/edit avatar morph. */
  avatarSelf:     'avatar-self',
  /** Leaderboard row avatar -> User detail. */
  avatarUser:     (userId: string) => `avatar-${userId}`,
  /** PR badge on showcase -> PR detail. */
  prBadge:        (id: string) => `pr-${id}`,
  /** Streak ring on profile -> Streak detail. */
  streakSelf:     'streak-self',
} as const;

export type SharedTag =
  | ReturnType<typeof SHARED_TAGS.workoutHero>
  | typeof SHARED_TAGS.avatarSelf
  | ReturnType<typeof SHARED_TAGS.avatarUser>
  | ReturnType<typeof SHARED_TAGS.prBadge>
  | typeof SHARED_TAGS.streakSelf;
