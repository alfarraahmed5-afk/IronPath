/**
 * Legacy mobile theme tokens.
 *
 * Cinematic overhaul (PR A) moved the canonical definitions to
 * `mobile/src/design-system/tokens/`. This file is now a backwards-compat
 * shim so the ~80 existing callsites that import via `'@/theme/tokens'`
 * (or its relative form) keep compiling.
 *
 * New code should import from `@/design-system/tokens` (or
 * `@/design-system`) instead.
 */
export {
  colors,
  brand,
  ink,
  typography,
  type,
  typographyAr,
  fontFamilies,
  spacing,
  radii,
  shadows,
  motion,
  durations,
} from '../design-system/tokens';

export type {
  Colors,
  Brand,
  Ink,
  Typography,
  TypographyAr,
  Spacing,
  Radii,
  Shadows,
} from '../design-system/tokens';
