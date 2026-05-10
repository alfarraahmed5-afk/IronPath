// Minimal locale + message helpers used by the static content pages
// (/pricing, /blog, /for-gyms, /roadmap, /privacy, /terms) until the
// next-intl scaffolding lands.
//
// Design contract for the i18n agent that's wiring next-intl in parallel:
//   - The JSON files at marketing/messages/{en,ar}.json are the source of
//     truth for every string those pages render.
//   - When pages move under app/[locale]/(site)/..., replace the cookie
//     read in `getLocale()` with the route param (Next 15 dynamic
//     segment) and replace `getMessages()` with `getTranslations()` from
//     next-intl. The JSON shape is already namespaced per-page.
//   - Existing routes (/pricing, /blog/...) default to EN. AR is opt-in
//     today via the NEXT_LOCALE cookie; once the [locale] segment ships,
//     the cookie path is dead code and can be removed.

import { cookies } from 'next/headers';
import enMessages from '@/messages/en.json';
import arMessages from '@/messages/ar.json';

export type Locale = 'en' | 'ar';
export const LOCALES: readonly Locale[] = ['en', 'ar'] as const;
export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_COOKIE = 'NEXT_LOCALE';

export function isLocale(value: string | undefined | null): value is Locale {
  return value === 'en' || value === 'ar';
}

// Server-only locale read. Awaiting cookies() is the Next 15 pattern.
// Pages that have a locale prop (e.g. via the [locale] segment) should
// pass it explicitly to getMessages and skip this read.
export async function getLocale(): Promise<Locale> {
  try {
    const c = await cookies();
    const v = c.get(LOCALE_COOKIE)?.value;
    if (isLocale(v)) return v;
  } catch {
    // cookies() throws outside a request context (build-time render of
    // 404/error pages). Fall back to default.
  }
  return DEFAULT_LOCALE;
}

// Direction helper. RTL is locked to Arabic for now.
export function getDirection(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

// HTML lang attribute mapping. ar-EG (not just ar) is recommended by the
// i18n architect for SERP ranking on Egyptian queries.
export function getHtmlLang(locale: Locale): string {
  return locale === 'ar' ? 'ar-EG' : 'en';
}

const MESSAGES = {
  en: enMessages,
  ar: arMessages,
} as const;

export type Messages = typeof enMessages;

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale] as Messages;
}

// Tiny ICU-ish placeholder filler. Supports only `{name}` substitution.
// next-intl's `t('key', { count })` becomes the canonical replacement
// when the i18n agent wires it.
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = vars[k];
    return v === undefined || v === null ? `{${k}}` : String(v);
  });
}
