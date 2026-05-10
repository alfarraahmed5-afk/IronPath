/**
 * STUB -- replaced by Team A in PR A.
 *
 * Lens 1 motion fingerprint: Vercel ease, asymmetric page transitions,
 * spring configs (modal/magnetic/rail), 60ms list stagger.
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

// Legacy duration tokens. Kept for backwards compat.
export { motion as durations } from '../../theme/tokens';
