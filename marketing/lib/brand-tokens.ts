// JS access to brand colors. Tailwind classes are the primary API; this
// is for canvas shaders, framer-motion color animations, and dynamic
// inline styles where Tailwind can't reach.

export const BRAND = {
  // Crimson scale -- see tailwind.config.ts for the full ladder.
  // brand-500 fails WCAG AA body-on-dark; brand-400 is the body companion.
  500: '#C8102E',
  450: '#FF1A3D',
  400: '#FF4566', // body-on-dark (WCAG AA: 5.93:1 on ink-950)
  350: '#FF6680', // focus rings (WCAG AAA: 7.03:1 on ink-950)
  300: '#FF8FA1',
} as const;

export const INK = {
  950: '#0A0A0B', // shell background
  900: '#111114', // card background
  850: '#17171B', // feature surface
  800: '#1F1F24',
  700: '#3A3A44',
  500: '#76767D',
  400: '#A1A1AA', // sub-headings on dark (AAA: 7.72:1)
  200: '#D4D4DA',
  100: '#E5E5E7',
  50:  '#FAFAFB',
} as const;

// Hero photography credit (Unsplash -- free license).
// Replace src URLs at agent-implementation time with locally-hosted AVIFs
// for proper LCP performance.
export const HERO_PHOTOS = {
  chalkHands:   { unsplashId: 'photo-1517836357463-d25dfeac3438', author: 'Anastase Maragos' },
  barbellMacro: { unsplashId: 'photo-1583454110551-21f2fa2afe61', author: 'Logan Weaver' },
  concreteWall: { unsplashId: 'photo-1617791160505-6f00504e3519', author: 'Anchor Lee' },
} as const;
