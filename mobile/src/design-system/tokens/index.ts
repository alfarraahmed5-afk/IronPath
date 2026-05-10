/**
 * Design-system tokens. Single source of truth.
 *
 * Cinematic overhaul -- finalized by Team A (PR A) per lens 2 + lens 9 + lens 10.
 *
 * Public API:
 *   import { colors, brand, ink, typography, typographyAr, fontFamilies,
 *            spacing, radii, shadows, VERCEL_EASE, springModal, ... }
 *     from '@/design-system/tokens';
 */
export { colors, brand, ink } from './colors';
export type { Colors, Brand, Ink } from './colors';

export { typography, typographyAr, type, fontFamilies } from './typography';
export type { Typography, TypographyAr } from './typography';

export { spacing } from './spacing';
export type { Spacing } from './spacing';

export { radii } from './radii';
export type { Radii } from './radii';

export { shadows } from './shadows';
export type { Shadows } from './shadows';

export {
  VERCEL_EASE,
  PAGE_EXIT_MS,
  PAGE_ENTRY_MS,
  PAGE_ENTRY_DELAY_MS,
  springModal,
  springMagnetic,
  springRail,
  LIST_STAGGER_MS,
  motion,
  durations,
} from './motion';
