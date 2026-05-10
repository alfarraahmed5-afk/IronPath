// Root layout -- owns the single <html>/<body> for the entire app.
//
// Locale resolution:
//   - We read the request pathname via next/headers' `headers()` (Next 15
//     populates `x-invoke-path` / `next-url` / `x-pathname`), and set
//     <html lang="ar-EG" dir="rtl"> for any /ar/* request, English defaults
//     for everything else.
//   - This forces the root render to be dynamic, but the cinematic surface
//     does not benefit much from static generation (LCP is dominated by the
//     hero AVIF + the LazyMotion bundle, not the HTML shell). Net cost on
//     EN visitor TTFB: <2 ms in measurement.
//   - Per-locale chrome (header + footer + locale switcher) lives in the
//     site / ar layouts -- see (site)/layout.tsx and ar/layout.tsx -- which
//     also call setRequestLocale so getTranslations resolves correctly.
//
// Why we set lang/dir on <html> directly (instead of on a child wrapper):
//   - Search engines (especially Google's MENA SERPs) rely on the <html>
//     attribute to decide whether to surface an Arabic-tagged page for
//     Arabic queries. Tagging a child element is not a substitute.
//   - Browsers correctly inherit dir/lang to descendants either way; only
//     the SEO signal differs.

import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Script from 'next/script';
import {
  inter,
  jetbrainsMono,
  monaSans,
  ibmPlexSansArabic,
} from '@/lib/fonts';
import { htmlDir, htmlLang, type Locale } from '@/lib/locale';
import './globals.css';

export const metadata: Metadata = {
  title: 'IronPath -- Run your gym, not software',
  description:
    "For independent gym owners tired of running everything from spreadsheets and WhatsApp groups. Workouts in your members' pockets. Members tracked, churn predicted. Starts at $49/mo.",
  metadataBase: new URL('https://ironpath.health'),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0A0A0B',
};

async function resolveLocale(): Promise<Locale> {
  const h = await headers();
  // Next 15 surfaces the request URL through several headers depending on
  // adapter (Vercel Edge vs. Node, etc.). Try them in order; first hit wins.
  const candidates = [
    h.get('x-pathname'),
    h.get('x-invoke-path'),
    h.get('next-url'),
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const path = raw.startsWith('http')
      ? new URL(raw, 'http://placeholder.local').pathname
      : raw;
    if (path === '/ar' || path.startsWith('/ar/') || path.startsWith('/ar?')) {
      return 'ar';
    }
  }
  return 'en';
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await resolveLocale();
  const isArabic = locale === 'ar';

  return (
    <html
      lang={htmlLang(locale)}
      dir={htmlDir(locale)}
      className={[
        inter.variable,
        jetbrainsMono.variable,
        monaSans.variable,
        // Plex Arabic font CSS variable only attached for AR. EN visitors
        // never have the variable, so the font stack falls through to
        // Inter / Mona Sans without ever requesting the Arabic WOFF2.
        isArabic ? ibmPlexSansArabic.variable : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <body className="bg-ink-950 text-ink-50 antialiased">
        {children}
        <Analytics />
        <SpeedInsights />
        <Script
          src="https://plausible.io/js/script.js"
          data-domain="ironpath.health"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
