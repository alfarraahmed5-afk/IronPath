// next-intl request configuration.
//
// Wired to a pragmatic two-track route layout (NOT next-intl's standard
// `[locale]` segment-rewriting middleware):
//
//   - English routes live at the project root (`/`, `/pricing`, `/blog`, ...)
//     -- unchanged from before i18n landed. Preserves all SEO + inbound links.
//   - Arabic routes live under `/ar/*` (`/ar`, `/ar/pricing`, ...) -- separate
//     directory tree under `app/ar/`. The layout there sets `lang="ar"`,
//     `dir="rtl"`, preloads Plex Arabic, and wraps children in
//     <NextIntlClientProvider>.
//
// Why this shape (instead of `app/[locale]/...` rewriting):
//   1. Other translation agents own subroutes (pricing, blog, for-gyms,
//      privacy, terms, roadmap, eg). Restructuring the whole app would
//      collide with their work in flight.
//   2. `localePrefix: 'as-needed'` from next-intl produces `/` for default
//      locale anyway -- same shape we get manually here, no rewriting.
//   3. We still get next-intl's RSC + client-component message resolution,
//      `useTranslations`, `getTranslations`, and `<NextIntlClientProvider>`
//      as the single source of truth for the messages catalog.
//
// Locale is determined by the URL prefix (`/ar` → 'ar', everything else →
// 'en'); the layouts pass the resolved locale into `getRequestConfig`'s
// `requestLocale` parameter via the `locale` argument when calling
// `getTranslations({ locale })`.

import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const locales = ['en', 'ar'] as const;
export const defaultLocale = 'en' as const;

export type Locale = (typeof locales)[number];

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

export default getRequestConfig(async ({ requestLocale }) => {
  // requestLocale comes from middleware OR from the layout calling
  // setRequestLocale(). We accept either; if neither is present, fall back to
  // 'en' so `getTranslations()` never throws on locale-agnostic code paths
  // (sitemap, robots, OG image generation).
  const requested = await requestLocale;
  const locale: Locale = isLocale(requested) ? requested : defaultLocale;

  let messages;
  try {
    messages = (await import(`./messages/${locale}.json`)).default;
  } catch {
    notFound();
  }

  return {
    locale,
    messages,
    // Cairo timezone for the Arabic locale, otherwise UTC. Used by next-intl's
    // <FormattedDate> if we ever add date strings; today the marketing surface
    // has no live dates.
    timeZone: locale === 'ar' ? 'Africa/Cairo' : 'UTC',
    // Latin digits everywhere per Egyptian SaaS convention (the i18n architect
    // and bilingual copywriter both flagged: Arabic-Indic digits read as
    // old-fashioned in Egyptian web copy).
    formats: {
      number: {
        latn: { numberingSystem: 'latn' },
      },
    },
    // Use the brand color for missing translations in dev so the gap is
    // immediately visible; never throw, never silently fall through.
    onError(error) {
      if (process.env.NODE_ENV === 'production') return;

      console.warn('[i18n]', error.message);
    },
    getMessageFallback({ key, namespace }) {
      const path = [namespace, key].filter(Boolean).join('.');
      return process.env.NODE_ENV === 'production' ? '' : `‹${path}›`;
    },
  };
});
