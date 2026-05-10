// A/B variant assignment for hero headline copy. The middleware assigns
// each visitor a sticky variant (cookie, 90 days) so that the headline
// they see on first paint is consistent across the entire visit and
// across return visits inside the cookie window.
//
// Why headline-only:
//   - Headline is the highest-leverage above-the-fold element.
//   - Three variants is the council-recommended split for first-pass
//     copy testing without splitting traffic too thin.
//   - Pricing/CTA labels are NOT part of this experiment — keep one
//     surface variable so the readout is unambiguous.

export type ABVariant = 'A' | 'B' | 'C';

export const AB_VARIANTS: readonly ABVariant[] = ['A', 'B', 'C'] as const;

export const HERO_HEADLINE_VARIANTS: Record<ABVariant, string> = {
  A: 'Run your gym, not software.',
  B: 'Members work out. You grow.',
  C: 'Gym software that actually ships.',
};

/** Cookie name used by middleware + read on the server during render. */
export const AB_COOKIE = 'ab-pricing';

/** Cookie name used by middleware to surface visitor city for personalization. */
export const GEO_COOKIE = 'geo-city';

/** 90 days in seconds. */
export const AB_COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

/** 1 day in seconds. */
export const GEO_COOKIE_MAX_AGE = 60 * 60 * 24;

/**
 * Type guard for cookie-read values; treats anything else as "unassigned"
 * so that a malformed cookie can never leak into render and crash on
 * `HERO_HEADLINE_VARIANTS[variant]` lookup.
 */
export function isABVariant(value: unknown): value is ABVariant {
  return value === 'A' || value === 'B' || value === 'C';
}

/**
 * Random uniform pick. Used by middleware (edge runtime — Math.random is
 * available; we don't need crypto-grade entropy for variant assignment).
 */
export function pickVariant(): ABVariant {
  return AB_VARIANTS[Math.floor(Math.random() * AB_VARIANTS.length)];
}

/**
 * Resolves a variant from a cookie value, falling back to a deterministic
 * default if absent/malformed. Keep the default at 'A' so SSR-only render
 * paths (e.g. crawlers, RSC without cookies) get the canonical control
 * copy.
 */
export function resolveVariant(cookieValue: string | undefined): ABVariant {
  return isABVariant(cookieValue) ? cookieValue : 'A';
}
