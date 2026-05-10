// Root layout -- owns the single <html>/<body> for the entire app.
//
// Locale resolution (URL is the source of truth, cookie is a hint):
//   1. Inspect the request URL via the `x-pathname` header that the edge
//      middleware forwards on every request (Next 15's `headers()` reads
//      request headers, not URL, so the layout cannot inspect the path
//      otherwise). If the pathname starts with `/ar` we render Arabic;
//      everything else renders English. URL is non-negotiable.
//   2. Fall back to the `NEXT_LOCALE` cookie ONLY when no header is
//      forwarded (e.g. during build-time prerender of error pages). The
//      middleware always forwards the header in production, so cookie
//      fallback is purely defensive.
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
import { cookies, headers } from 'next/headers';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Script from 'next/script';
import {
  inter,
  jetbrainsMono,
  monaSans,
  ibmPlexSansArabic,
} from '@/lib/fonts';
import {
  LOCALE_COOKIE,
  htmlDir,
  htmlLang,
  isLocale,
  type Locale,
} from '@/lib/locale';
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
  // 1. URL is the source of truth. Next 15 surfaces the request URL
  //    through several headers depending on the adapter (Vercel Edge
  //    vs. Node). The `x-pathname` header is set by our middleware on
  //    every request, the others are Next-internal fallbacks.
  const h = await headers();
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
    // Any other path is explicitly EN -- the URL trumps the cookie.
    if (path && path.length > 0) return 'en';
  }

  // 2. Cookie fallback. Reached only when no URL header is forwarded
  //    (build-time prerender of an error page, etc.). The middleware
  //    forwards `x-pathname` on every real request, so this branch
  //    should be exceedingly rare in production.
  try {
    const c = await cookies();
    const v = c.get(LOCALE_COOKIE)?.value;
    if (isLocale(v)) return v;
  } catch {
    // cookies() throws outside a request context; fall through.
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
