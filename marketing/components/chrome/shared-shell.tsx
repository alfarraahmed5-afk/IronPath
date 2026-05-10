// SharedShell -- the locale-aware chrome (header + footer + LivePulseStrip)
// rendered by both the EN site layout and the AR site layout.
//
// The root layout (app/layout.tsx) owns `<html lang dir>` and the Plex
// Arabic font CSS variable, so this component does NOT duplicate them.
// All it does is render header / footer / LivePulseStrip with locale-aware
// translations and route hrefs.

import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LivePulseStrip } from '@/components/primitives/live-pulse-strip';
import { PreferencesBar } from '@/components/chrome/preferences-bar';
import { LocaleSwitcher } from '@/components/chrome/locale-switcher';
import { type Locale } from '@/lib/locale';

export interface SharedShellProps {
  locale: Locale;
  children: React.ReactNode;
}

export async function SharedShell({ locale, children }: SharedShellProps) {
  const isArabic = locale === 'ar';
  const t = await getTranslations({ locale, namespace: 'chrome' });

  // Per-locale route entry points. Brand wordmark always points at the
  // locale's home; pricing/blog point at the locale-prefixed path so the
  // locale stays sticky across navigations.
  const homeHref = isArabic ? '/ar' : '/';
  const pricingHref = isArabic ? '/ar/pricing' : '/pricing';
  const blogHref = isArabic ? '/ar/blog' : '/blog';

  return (
    <>
      <a href="#main" className="skip-to-content">
        {t('skipToContent')}
      </a>
      <LivePulseStrip />
      <header
        className="sticky top-px z-40 flex items-center justify-between px-4 py-3 sm:px-6 backdrop-blur-md bg-ink-950/70 border-b border-ink-900"
      >
        <Link
          href={homeHref}
          className="font-display text-base font-semibold tracking-tight"
          // Brand wordmark stays Latin script in any locale -- explicit
          // lang/dir on the link element keeps the bidi algorithm from
          // shuffling characters when embedded inline in Arabic copy.
          lang="en"
          dir="ltr"
        >
          IronPath
        </Link>
        <nav className="flex items-center gap-3 sm:gap-4 text-xs text-ink-300">
          <Link
            href={pricingHref}
            className="hover:text-ink-100 transition-colors"
          >
            {t('nav.pricing')}
          </Link>
          <Link
            href={blogHref}
            className="hover:text-ink-100 transition-colors"
          >
            {t('nav.blog')}
          </Link>
          <a
            href="https://admin.ironpath.health/login"
            className="hover:text-ink-100 transition-colors"
          >
            {t('nav.signIn')}
          </a>
          <LocaleSwitcher
            activeLocale={locale}
            ariaLabel={t('localeSwitcher.ariaLabel')}
            labels={{
              en: t('localeSwitcher.switchTo.en'),
              ar: t('localeSwitcher.switchTo.ar'),
            }}
          />
          <PreferencesBar />
        </nav>
      </header>
      <main id="main">{children}</main>
      <footer className="mt-24 px-4 py-12 sm:px-6 border-t border-ink-900 text-xs text-ink-400">
        <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
      </footer>
    </>
  );
}

export default SharedShell;
