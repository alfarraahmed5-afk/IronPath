// Shared locale helpers -- used by middleware, layouts, and the LocaleSwitcher.
//
// Kept tiny + dependency-free so it can run in any context (Edge middleware,
// RSC, client component) without paying for a heavier i18n library.

export const LOCALES = ['en', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

// Cookie name follows next-intl convention so its built-in helpers (if we
// ever switch to its full middleware) read the right key.
export const LOCALE_COOKIE = 'NEXT_LOCALE';
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Country codes that should default to Arabic when no other signal exists.
// EG is the wedge market; the surrounding Levant/Gulf region defaults to AR
// because most gym owners there read Arabic faster than English.
const ARABIC_DEFAULT_COUNTRIES = new Set([
  'EG', 'SA', 'AE', 'JO', 'KW', 'QA', 'BH', 'OM', 'LB', 'MA', 'TN', 'DZ',
]);

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Detect a locale from a URL pathname.
 *   /ar          → 'ar'
 *   /ar/foo      → 'ar'
 *   /            → null
 *   /pricing     → null
 *
 * Returns null when the URL is implicitly the default locale; the caller
 * decides what to do with that.
 */
export function localeFromPath(pathname: string): Locale | null {
  if (pathname === '/ar' || pathname.startsWith('/ar/')) return 'ar';
  // No /en prefix exists -- EN is the un-prefixed canonical.
  return null;
}

/**
 * The full detection cascade per the i18n architect's spec:
 *   1. Cookie (NEXT_LOCALE) -- explicit user choice, sticks forever.
 *   2. URL -- /ar/* wins for the request.
 *   3. Country geo -- Vercel's x-vercel-ip-country.
 *   4. Accept-Language header -- `ar*` → 'ar'.
 *   5. Default 'en'.
 */
export function detectLocale(input: {
  cookie?: string | null;
  pathname?: string;
  country?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  // 1. Cookie wins absolutely.
  if (isLocale(input.cookie)) return input.cookie;

  // 2. URL -- /ar prefix.
  if (input.pathname) {
    const fromPath = localeFromPath(input.pathname);
    if (fromPath) return fromPath;
  }

  // 3. Country.
  if (input.country && ARABIC_DEFAULT_COUNTRIES.has(input.country.toUpperCase())) {
    return 'ar';
  }

  // 4. Accept-Language -- first ar* tag wins.
  if (input.acceptLanguage) {
    const tags = input.acceptLanguage
      .split(',')
      .map((t) => t.split(';')[0].trim().toLowerCase())
      .filter(Boolean);
    for (const tag of tags) {
      if (tag === 'ar' || tag.startsWith('ar-')) return 'ar';
      if (tag === 'en' || tag.startsWith('en-')) return 'en';
    }
  }

  // 5. Default.
  return DEFAULT_LOCALE;
}

/**
 * Map a route path between locales for the LocaleSwitcher.
 *   ('en', '/pricing')      → '/pricing'
 *   ('ar', '/pricing')      → '/ar/pricing'
 *   ('en', '/ar/pricing')   → '/pricing'
 *   ('ar', '/ar/pricing')   → '/ar/pricing'
 *   ('en', '/ar')           → '/'
 *   ('ar', '/')             → '/ar'
 */
export function localizedPath(target: Locale, pathname: string): string {
  // Strip any existing /ar prefix.
  let stripped = pathname;
  if (stripped === '/ar') stripped = '/';
  else if (stripped.startsWith('/ar/')) stripped = stripped.slice(3); // '/ar/foo' → '/foo'

  if (target === 'en') return stripped;

  // target === 'ar'
  if (stripped === '/') return '/ar';
  return `/ar${stripped}`;
}

/**
 * The HTML `lang` attribute. Egyptian-tagged Arabic for SERP ranking; plain
 * 'en' for English (the international site, not 'en-US' or 'en-GB' -- we have
 * no region-specific copy).
 */
export function htmlLang(locale: Locale): string {
  return locale === 'ar' ? 'ar-EG' : 'en';
}

export function htmlDir(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}
