/**
 * Notification deep-link router -- single source of truth.
 *
 * Lens 5 P0 unify-router task: today the cold-start handler in
 * `_layout.tsx` covers fewer notification types than the in-app handler
 * in `notifications/index.tsx`, so cold-start taps on streak_broken,
 * monthly_report, yearly_report, duel_won, duel_lost, follow_request,
 * follow_request_approved, and mention silently drop the link.
 *
 * This module exposes one function -- `routeFromNotificationData` --
 * that both call sites consume. Any new notification type is wired up
 * once and works for both cold-start and in-app immediately.
 *
 * Returns a string href (Expo Router path) or null if the payload is
 * unrecognized.
 */

export type NotificationType =
  | 'like'
  | 'comment'
  | 'mention'
  | 'follow'
  | 'follow_request'
  | 'follow_request_approved'
  | 'pr'
  | 'streak_broken'
  | 'challenge_started'
  | 'challenge_ended'
  | 'monthly_report'
  | 'yearly_report'
  | 'duel_invite'
  | 'duel_accepted'
  | 'duel_won'
  | 'duel_lost'
  | string;

export interface NotificationData {
  type?: NotificationType;
  workout_id?: string;
  actor_user_id?: string;
  challenge_id?: string;
  duel_id?: string;
  recap_id?: string;
  [k: string]: unknown;
}

/**
 * Map a notification data payload to an Expo Router href.
 *
 * Conventions:
 *   - `?focus=comments` / `?focus=prs` on workout pages so the receiver
 *     can auto-scroll. The receiver opts in by reading
 *     `useLocalSearchParams()` -- a screen that doesn't yet handle
 *     focus still renders normally (graceful degradation).
 *   - `streak_broken` -> Progress tab (Option B) for the streak card.
 *   - `monthly_report` / `yearly_report` -> Progress tab with a recap
 *     query param. The progress screen surfaces a "Recap ready" card.
 */
export function routeFromNotificationData(data: NotificationData | null | undefined): string | null {
  if (!data || typeof data !== 'object') return null;
  const type = String(data.type ?? '');

  // Comments + mentions deep-link with focus=comments so the workout
  // detail can auto-open the comments surface.
  if (data.workout_id && (type === 'comment' || type === 'mention')) {
    return `/workouts/${data.workout_id}?focus=comments`;
  }

  // PR notifications focus the PRs section.
  if (data.workout_id && type === 'pr') {
    return `/workouts/${data.workout_id}?focus=prs`;
  }

  // Plain like (or unknown type with a workout id).
  if (data.workout_id && (type === 'like' || !type)) {
    return `/workouts/${data.workout_id}`;
  }

  // Follow family -> profile of the actor.
  if (data.actor_user_id && /follow/.test(type)) {
    return `/users/${data.actor_user_id}`;
  }

  // Duels.
  if (data.duel_id && /duel/.test(type)) {
    return `/duels/${data.duel_id}`;
  }
  if (data.duel_id) {
    return `/duels/${data.duel_id}`;
  }

  // Challenges.
  if (data.challenge_id && /challenge/.test(type)) {
    return `/challenges/${data.challenge_id}`;
  }
  if (data.challenge_id) {
    return `/challenges/${data.challenge_id}`;
  }

  // Streak broken -> Progress tab (Option B). The progress screen
  // surfaces the streak card so the user can see what they lost.
  if (type === 'streak_broken') {
    return '/(tabs)/progress';
  }

  // Monthly / yearly recap -> Progress tab with the recap id surfaced
  // as a query param so the progress screen can deep-link into the
  // appropriate Spotify-Wrapped-style pager (lens 7 P1).
  if (type === 'monthly_report' || type === 'yearly_report') {
    const recapParam = data.recap_id ? `?recap=${data.recap_id}` : '';
    return `/(tabs)/progress${recapParam}`;
  }

  return null;
}
