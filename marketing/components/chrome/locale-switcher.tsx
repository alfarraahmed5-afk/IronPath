'use client';

// LocaleSwitcher -- EN | AR toggle visible in the header on every page.
//
// Behavior per the i18n architect's spec:
//   - Two text labels ("EN" / "العربية"), no flags. Egyptian flag for Arabic
//     would exclude the Saudi/Emirati audience; flags for languages are a
//     well-known anti-pattern.
//   - Clicking the inactive locale navigates to the locale-equivalent path
//     (`/pricing` ↔ `/ar/pricing`) AND writes the NEXT_LOCALE cookie, so the
//     choice sticks across visits.
//   - Active locale is rendered as a non-button to avoid the "I clicked it
//     and nothing happened" confusion.
//
// Uses next/navigation's usePathname to determine the current path; the
// router push then triggers a full RSC re-render with the new locale.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALES,
  type Locale,
  localeFromPath,
  localizedPath,
} from '@/lib/locale';

export interface LocaleSwitcherProps {
  /**
   * Current active locale, passed from the layout that already knows it
   * (RSC layout reads the segment param). Avoids a client-side flash where
   * the switcher briefly shows the wrong active state.
   */
  activeLocale: Locale;
  className?: string;
  /** ARIA label for the switcher group. Translated by the parent. */
  ariaLabel: string;
  /** Per-locale display labels passed in by the parent (translated). */
  labels: Record<Locale, string>;
}

export function LocaleSwitcher({
  activeLocale,
  className = '',
  ariaLabel,
  labels,
}: LocaleSwitcherProps) {
  const pathname = usePathname() ?? '/';

  // If the URL says one thing but the prop says another (rare -- only happens
  // mid-navigation), trust the URL: it's what the user actually sees.
  const urlLocale = localeFromPath(pathname) ?? 'en';
  const active: Locale = activeLocale ?? urlLocale;

  function persist(target: Locale): void {
    if (typeof document === 'undefined') return;
    document.cookie = [
      `${LOCALE_COOKIE}=${target}`,
      `Path=/`,
      `Max-Age=${LOCALE_COOKIE_MAX_AGE}`,
      `SameSite=Lax`,
    ].join('; ');
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`flex items-center gap-1 text-xs ${className}`}
    >
      {LOCALES.map((locale, i) => {
        const isActive = locale === active;
        const targetPath = localizedPath(locale, pathname);

        if (isActive) {
          return (
            <span
              key={locale}
              aria-current="true"
              lang={locale}
              dir={locale === 'ar' ? 'rtl' : 'ltr'}
              className="px-2 py-1 text-ink-100 font-medium"
            >
              {labels[locale]}
            </span>
          );
        }

        return (
          <span key={locale} className="flex items-center">
            {i > 0 && (
              <span aria-hidden className="text-ink-700 mx-0.5">
                |
              </span>
            )}
            <Link
              href={targetPath}
              hrefLang={locale === 'ar' ? 'ar-EG' : 'en'}
              lang={locale}
              dir={locale === 'ar' ? 'rtl' : 'ltr'}
              onClick={() => persist(locale)}
              className="px-2 py-1 text-ink-400 hover:text-ink-100 transition-colors rounded"
            >
              {labels[locale]}
            </Link>
          </span>
        );
      })}
    </div>
  );
}

export default LocaleSwitcher;
