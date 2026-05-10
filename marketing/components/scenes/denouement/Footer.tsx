// Quiet, credits-roll style footer.
//
// Creative-director's hard rule: NO secondary CTA here. The Crescendo
// CTA is the page's only ask; a second one would dilute it. This footer
// is intentionally information-dense and visually light.
//
// Reads from `chrome.footer` via getTranslations so the footer is locale-
// aware without forcing a 'use client' boundary. The shared chrome footer in
// app/layout.tsx is one line; this is the cinematic-page footer with full
// nav.

import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

const CONTACT_EMAIL = 'hello@ironpath.health';
const CAL_LINK = 'https://cal.com/ironpath/15min';

export async function Footer() {
  const year = new Date().getFullYear();
  const t = await getTranslations('chrome.footer');

  return (
    <footer
      className="border-t border-ink-900 px-6 py-12 sm:px-10 sm:py-16 text-xs text-ink-400"
      aria-label={t('ariaLabel')}
    >
      <div className="mx-auto max-w-6xl grid gap-8 sm:grid-cols-3 sm:items-start">
        {/* Left -- wordmark + copyright */}
        <div className="flex flex-col gap-2">
          <span
            className="font-display text-sm font-semibold tracking-tight text-ink-200"
            // Brand wordmark stays Latin script in any locale.
            lang="en"
            dir="ltr"
          >
            IronPath
          </span>
          <span>{t('rightsReserved', { year })}</span>
        </div>

        {/* Center -- thin links, no surface, no buttons */}
        <nav
          className="flex flex-wrap justify-start sm:justify-center gap-x-5 gap-y-2"
          aria-label={t('ariaNav')}
        >
          <Link href="/privacy" className="hover:text-ink-100 transition-colors">
            {t('privacy')}
          </Link>
          <Link href="/terms" className="hover:text-ink-100 transition-colors">
            {t('terms')}
          </Link>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="hover:text-ink-100 transition-colors"
          >
            {t('contact')}
          </a>
          <Link href="/blog" className="hover:text-ink-100 transition-colors">
            {t('blog')}
          </Link>
        </nav>

        {/* Right -- single quiet CTA, no founder credit */}
        <div className="flex flex-col gap-2 sm:items-end">
          <a
            href={CAL_LINK}
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-ink-100 transition-colors"
          >
            {t('bookChat')}
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
