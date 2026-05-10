import { Inter, JetBrains_Mono } from 'next/font/google';
import localFont from 'next/font/local';

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
// Self-hosted from /public/fonts/mona-sans-variable.woff2 — the
// variable WOFF2 axis-cut to wdth + wght (~90 KB). Critical: this
// MUST stay self-hosted, never Google Fonts CDN. License at
// /public/fonts/mona-sans.LICENSE.txt (SIL Open Font License 1.1).
//
// Weight range 200-900 covers display headlines (700-900), button/
// label weights (500-600), and body fallback (400). Italic is not
// included in this axis cut — if italic display copy is ever needed,
// add a second `localFont` with the italic VF and a parallel CSS var.
export const monaSans = localFont({
  src: '../public/fonts/mona-sans-variable.woff2',
  variable: '--font-mona-sans',
  display: 'swap',
  weight: '200 900',
  style: 'normal',
  preload: true,
  adjustFontFallback: 'Arial',
});
