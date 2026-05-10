import { Inter, JetBrains_Mono } from 'next/font/google';

// UI body — variable, full Latin subset, swap policy with metric override.
export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
  adjustFontFallback: true,
});

// Numerics + monospace.
export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
  preload: false,
  adjustFontFallback: true,
});

// Display face — Mona Sans (variable, OFL).
//
// Pre-stage: aliased to Inter via the same `--font-mona-sans` CSS variable
// so layouts and Tailwind classes resolve. Team Beta β1 owns:
//   1. Download Mona-Sans variable woff2 from
//      https://github.com/github/mona-sans → place at
//      /public/fonts/mona-sans-variable.woff2
//   2. Switch this export to `localFont({ src: '../public/fonts/...' })`
//      with the actual file path.
// Until then `font-display` resolves to Inter — same CSS variable name,
// no other code needs to change when β1 swaps the implementation.
export const monaSans = {
  variable: '--font-mona-sans',
  className: inter.className,
  style: inter.style,
};
