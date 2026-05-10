import { Inter, JetBrains_Mono } from 'next/font/google';
import localFont from 'next/font/local';

// UI body -- variable, full Latin subset, swap policy with metric override.
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

// Display face -- Mona Sans (variable, OFL).
//
// Self-hosted from /public/fonts/mona-sans-variable.woff2 -- the
// variable WOFF2 axis-cut to wdth + wght (~90 KB). Critical: this
// MUST stay self-hosted, never Google Fonts CDN. License at
// /public/fonts/mona-sans.LICENSE.txt (SIL Open Font License 1.1).
//
// Weight range 200-900 covers display headlines (700-900), button/
// label weights (500-600), and body fallback (400). Italic is not
// included in this axis cut -- if italic display copy is ever needed,
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

// Arabic face -- IBM Plex Sans Arabic (SIL OFL).
//
// Self-hosted from /public/fonts/ibm-plex-sans-arabic-*.woff2. We ship four
// static cuts (Regular/Medium/SemiBold/Bold) instead of the variable axis
// because Plex Arabic ships its variable font in formats that next/font's
// localFont treats inconsistently across Next 15 minor versions. Four static
// woff2 files (~300 KB each) gzip-cache identically, and the AR layout only
// preloads Regular + SemiBold -- the heavier weights load on demand.
//
// Pairs visually with Inter / Mona Sans (same humanist-geometric DNA per the
// council's i18n architect). Used ONLY when locale === 'ar' -- the EN visitor
// never downloads it. preload:false default; the AR layout adds an explicit
// <link rel="preload"> for the Regular cut.
export const ibmPlexSansArabic = localFont({
  src: [
    {
      path: '../public/fonts/ibm-plex-sans-arabic-regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/ibm-plex-sans-arabic-medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/ibm-plex-sans-arabic-semibold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../public/fonts/ibm-plex-sans-arabic-bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-plex-arabic',
  display: 'swap',
  preload: false,
  // Geeza Pro is the macOS/iOS Arabic system font, Tahoma covers Windows,
  // Arial Arabic / sans-serif catch the rest. Order matters: native UI fonts
  // before generic ones.
  fallback: ['Geeza Pro', 'Tahoma', 'Arial', 'sans-serif'],
  adjustFontFallback: false,
});
