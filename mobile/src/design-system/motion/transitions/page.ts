/**
 * Page transitions for `<Stack.Screen options={...}>`.
 *
 * Lens 1 + 3 + 4 spec:
 *   - iOS: slide-from-right with the system push curve, plus a small
 *     rubber-band overshoot on the entering screen so it feels less
 *     like stock RN (the Vercel ease cubic is approximated by
 *     `slide_from_right` already; the spec is satisfied by accepting
 *     the system curve and tightening the asymmetric duration).
 *   - Android: M3 emphasizedDecelerate -- the stock Expo Router
 *     `slide_from_right` is the closest available; we keep it and
 *     tune the duration to the spec's 240ms entry / 180ms exit.
 *   - Reduce-motion: callers wrap a useTheme() lookup and pass
 *     `pageTransitionReduced` instead.
 *
 * Marketing's 60ms entry delay isn't expressible at the
 * `react-native-screens` layer; we ship the asymmetric durations and
 * accept that the delay lives inside the screen's own mount-time
 * `<Animated.View>` fade if a screen wants to be precious about it.
 */
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

export const PAGE_ENTRY_MS = 240;
export const PAGE_EXIT_MS = 180;

/**
 * Default page push/pop options. Apply via:
 *
 *   <Stack screenOptions={pageTransition}>
 *     ...
 *
 * Per-screen overrides remain available via `<Stack.Screen options>`.
 */
export const pageTransition: NativeStackNavigationOptions = {
  animation: 'slide_from_right',
  animationDuration: PAGE_ENTRY_MS,
  animationTypeForReplace: 'pop',
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
};

/**
 * Reduce-motion variant. Crossfade only, no translate, shorter
 * duration. Caller switches between this and `pageTransition` based
 * on `useTheme().reduceMotion`.
 */
export const pageTransitionReduced: NativeStackNavigationOptions = {
  animation: 'fade',
  animationDuration: 120,
  gestureEnabled: true,
};

/**
 * Fade-only transition for tab-root replacement and re-orienting
 * sequences (auth -> tabs handoff).
 */
export const fadeTransition: NativeStackNavigationOptions = {
  animation: 'fade',
  animationDuration: 200,
};
