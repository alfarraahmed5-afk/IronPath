/**
 * IronPath spacing scale (xxs..4xl). Verified against lens 2 + lens 10.
 *
 * Marketing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.
 * Mobile adds `xxs: 2` for hairlines + `xs: 4` to keep the smaller end useful.
 */
export const spacing = {
  xxs:  2,
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export type Spacing = typeof spacing;
