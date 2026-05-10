/**
 * Motion fingerprint -- lens 1 spec.
 *
 * Vercel ease curve, asymmetric page transitions, spring configs
 * (modal/magnetic/rail), 60ms list stagger.
 *
 * Team B builds the actual primitives at `design-system/motion/primitives.ts`
 * (already pre-staged with stubs); this file is the pure value layer.
 */
import { Easing } from 'react-native-reanimated';

// Vercel ease curve, mirrored from marketing/lib/motion.ts.
export const VERCEL_EASE = Easing.bezier(0.32, 0.72, 0, 1);

// Asymmetric page transition (lens 1).
export const PAGE_EXIT_MS = 180;
export const PAGE_ENTRY_MS = 240;
export const PAGE_ENTRY_DELAY_MS = 60;

// Spring configs (Reanimated 3 stiffness/damping API).
export const springModal = { stiffness: 380, damping: 32 };
export const springMagnetic = { stiffness: 480, damping: 28 };
export const springRail = { stiffness: 520, damping: 36 };

// List stagger between successive children.
export const LIST_STAGGER_MS = 60;

// Duration tokens. Kept for backwards compat with legacy callsites that
// imported `motion` from `theme/tokens.ts`.
export const motion = {
  fast: 150,
  base: 220,
  slow: 320,
} as const;

// Older alias name -- some callsites import `durations`.
export const durations = motion;
