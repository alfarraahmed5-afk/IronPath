'use client';

// CairoBanner -- high-signal nudge for Egyptian visitors.
//
// Reads the `geo-country` cookie set by middleware. If the visitor is in
// Egypt AND hasn't dismissed the banner this session, render a thin top
// strip pointing them at the Cairo wedge page (/eg) which has EGP
// pricing, Arabic copy, and the WhatsApp CTA.
//
// Per the GTM strategist (council lens 4): never auto-redirect Egyptian
// visitors. Show the banner, let them decide. International visitors
// never see it.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { GEO_COUNTRY_COOKIE } from '@/lib/ab';

const DISMISS_KEY = 'cairo-banner-dismissed';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

export function CairoBanner() {
  const pathname = usePathname();
  const t = useTranslations('chrome.cairoBanner');
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Never on /eg or /ar itself -- they're already where the banner would
    // send them. Cairo wedge page (/eg) is the explicit destination, and
    // /ar is the Arabic locale a CAI visitor would also reach.
    if (pathname?.startsWith('/eg') || pathname?.startsWith('/ar')) {
      setShow(false);
      return;
    }
    if (sessionStorage.getItem(DISMISS_KEY) === '1') {
      setShow(false);
      return;
    }
    const country = readCookie(GEO_COUNTRY_COOKIE);
    setShow(country === 'EG');
  }, [pathname]);

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="region"
      aria-label={t('ariaLabel')}
      className="relative z-30 bg-brand-500 text-white px-4 py-2.5 text-sm flex items-center justify-center gap-3 sm:gap-4 flex-wrap"
    >
      <span className="font-medium">{t('message')}</span>
      <Link
        href="/eg"
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/15 hover:bg-white/25 transition-colors font-medium"
      >
        <span>{t('cta')}</span>
        <span aria-hidden className="rtl:inline-block rtl:-scale-x-100">→</span>
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('dismiss')}
        className="ml-1 inline-flex items-center justify-center w-7 h-7 rounded hover:bg-white/15 transition-colors"
      >
        <span aria-hidden className="text-base leading-none">×</span>
      </button>
    </div>
  );
}

export default CairoBanner;
