// Edge middleware: runs on every page request, before the page is rendered.
//
// Four responsibilities -- kept deliberately tiny so we add < 5ms to TTFB:
//   1. Strip URL-tracking junk (utm_*, fbclid, gclid, ...) and 301 to the
//      clean canonical URL. Inbound traffic from ads/social is full of
//      cruft that bloats analytics and creates duplicate-content SEO loss.
//   2. Sticky A/B variant cookie (ab-pricing, 90 days). Drives the hero
//      headline experiment. See lib/ab.ts.
//   3. Geo cookie (geo-city, 1 day) sourced from Vercel's x-vercel-ip-city
//      header -- used by hero copy to soft-personalize ("Trusted by 12 gyms
//      in Chicago" etc.) without ever shipping a geo-IP library to client.
//   4. Locale cookie (NEXT_LOCALE, 1 year). URL is the absolute source of
//      truth: every /ar/* request renders Arabic (and the cookie is
//      rewritten to 'ar'); every other path renders English (and the
//      cookie is rewritten to 'en'). Cookie is only ever a *first-visit
//      hint* used by the locale-switcher to pick a default landing locale
//      on the very first hit; once a URL is in play the URL wins.
//
// Hard rules:
//   - NO database calls, NO heavy computation, NO awaits other than the
//     synchronous NextResponse construction. Edge middleware budget is
//     sub-millisecond per concern.
//   - Cookies use httpOnly:false because the client and the server both
//     need to read them. They are NOT sensitive (no PII, no auth) -- just
//     experiment + personalization carriers.
//   - We NEVER redirect based on geo OR Accept-Language. URL is truth.
//     A visitor with a stale `NEXT_LOCALE=ar` cookie who lands on /pricing
//     gets the EN page (and the cookie flips to 'en' on the response).
//     A visitor on /ar/pricing gets the AR page regardless of cookie.

import { NextResponse, type NextRequest } from 'next/server';
import {
  AB_COOKIE,
  AB_COOKIE_MAX_AGE,
  GEO_COOKIE,
  GEO_COOKIE_MAX_AGE,
  GEO_COUNTRY_COOKIE,
  isABVariant,
  pickVariant,
} from '@/lib/ab';
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  detectLocale,
  isLocale,
} from '@/lib/locale';

export const config = {
  // Skip API routes, Next internals, favicon, and any file with an
  // extension (images, fonts, robots.txt, sitemap.xml). The matcher
  // shape is the standard Next.js recipe.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};

// Tracking params that should never appear in the canonical URL.
// Keep the set small + closed -- adding too many breaks legitimate query
// params (e.g. blog ?ref=newsletter is fine; ?utm_source=newsletter is junk).
const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  '_hsenc',
  '_hsmi',
  'msclkid',
]);

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // ─── 1. Strip tracking junk ───────────────────────────────────────────
  // We collect params to delete in a separate pass so we don't mutate the
  // URLSearchParams while iterating it.
  const toStrip: string[] = [];
  for (const key of url.searchParams.keys()) {
    if (TRACKING_PARAMS.has(key) || key.toLowerCase().startsWith('utm_')) {
      toStrip.push(key);
    }
  }
  if (toStrip.length > 0) {
    const cleanUrl = url.clone();
    for (const key of toStrip) cleanUrl.searchParams.delete(key);
    // 301 (permanent) is correct: the tracked URL and the clean URL are
    // semantically identical. Search engines should consolidate.
    const redirect = NextResponse.redirect(cleanUrl, 301);
    // Carry cookies forward so the redirect chain doesn't lose state.
    applyCookies(req, redirect);
    return redirect;
  }

  // ─── 2 + 3. Set A/B + geo cookies on the response ─────────────────────
  // Forward the request pathname as `x-pathname` so the root layout can
  // detect /ar/* without needing next-intl's URL-rewriting middleware.
  // (Next 15's `headers()` reads request headers, not URL -- so the root
  // layout cannot inspect the path otherwise.)
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', req.nextUrl.pathname);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  applyCookies(req, res);
  return res;
}

function applyCookies(req: NextRequest, res: NextResponse): void {
  // A/B variant -- assign once, persist for 90 days.
  const existing = req.cookies.get(AB_COOKIE)?.value;
  if (!isABVariant(existing)) {
    res.cookies.set({
      name: AB_COOKIE,
      value: pickVariant(),
      maxAge: AB_COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
    });
  }

  // Geo city -- refresh daily. Vercel populates x-vercel-ip-city on every
  // edge request; in dev it's missing, in which case we just don't set
  // the cookie (server render will fall back to no-personalization copy).
  const city = req.headers.get('x-vercel-ip-city');
  if (city) {
    // Vercel URL-encodes city names that contain spaces (e.g. "New%20York").
    // Decode safely so the cookie value is human-readable on the client.
    let decoded = city;
    try {
      decoded = decodeURIComponent(city);
    } catch {
      // Malformed encoding -- keep the raw value.
    }
    res.cookies.set({
      name: GEO_COOKIE,
      value: decoded,
      maxAge: GEO_COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
    });
  }

  // Geo country -- refresh daily. Used to surface the Cairo banner to
  // Egyptian visitors and to fork the lead-form routing. Vercel
  // populates x-vercel-ip-country with ISO 3166-1 alpha-2 codes (EG, US,
  // GB, ...). Two letters, no decoding needed.
  const country = req.headers.get('x-vercel-ip-country');
  if (country) {
    res.cookies.set({
      name: GEO_COUNTRY_COOKIE,
      value: country.toUpperCase(),
      maxAge: GEO_COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
    });
  }

  // Locale -- URL is the source of truth. /ar/* renders Arabic;
  // anything else renders English. The cookie is rewritten to match
  // the URL so a single bad-cookie state can never poison subsequent
  // RSC renders that read the cookie via `lib/i18n.ts`'s `getLocale()`.
  //
  // The detectLocale() cascade only runs for the FIRST visit (no cookie
  // yet AND visitor is on `/`) so we can record a first-visit hint.
  // Even then, the URL still wins -- we don't redirect; we just drop a
  // sticky cookie so the next visit's locale-switcher knows the
  // visitor's expressed preference.
  const existingLocale = req.cookies.get(LOCALE_COOKIE)?.value;
  const urlHasAr =
    req.nextUrl.pathname === '/ar' || req.nextUrl.pathname.startsWith('/ar/');
  const urlLocaleMatch: 'en' | 'ar' = urlHasAr ? 'ar' : 'en';

  const cookieMissingOrInvalid = !isLocale(existingLocale);
  // First-visit hint: only on `/` with no prior cookie do we honor
  // geo / Accept-Language detection. Visitors on any deeper URL get
  // the URL-derived locale baked into the cookie.
  const firstVisitToHome =
    cookieMissingOrInvalid && req.nextUrl.pathname === '/';
  const detected = firstVisitToHome
    ? detectLocale({
        cookie: existingLocale,
        pathname: req.nextUrl.pathname,
        country,
        acceptLanguage: req.headers.get('accept-language'),
      })
    : urlLocaleMatch;

  // Always set the cookie when (a) the URL implies a different locale
  // than the cookie, or (b) the cookie is missing/invalid. This keeps
  // the URL and cookie in lockstep so cookie-driven downstream readers
  // (lib/i18n.ts getLocale, the legal pages) never disagree with the URL.
  if (cookieMissingOrInvalid || existingLocale !== urlLocaleMatch) {
    res.cookies.set({
      name: LOCALE_COOKIE,
      value: detected,
      maxAge: LOCALE_COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
    });
  }
}
