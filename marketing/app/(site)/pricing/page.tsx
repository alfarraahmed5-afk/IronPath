// Full pricing detail page, RSC. The cinematic landing has its own
// in-flow Pricing scene; this page is the authoritative reference for
// people who arrive deep-linked or who clicked through "see full pricing".
//
// Hard rules from the conversion lens:
//  - Pricing visible above the fold. No "MOST POPULAR" badge.
//  - Same CTA label on every tier ("Start free trial").
//  - Body emphasis uses brand-400 (#FF4566, 5.93:1 on ink-900), never
//    brand-500 which fails AA on dark for body weight.
//
// Localization: the page is locale-aware via getLocale() (cookie-based
// today, route-segment-based once the [locale] move lands). Tier prices
// stay in USD on this page by founder direction; the EGP variant lives
// on /eg.

import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { getLocale, getMessages } from '@/lib/i18n';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = getMessages(locale);
  return buildMetadata({
    title: m.pricing.page_title,
    path: '/pricing',
  });
}

const ADMIN_SIGNUP = '/start';

interface TierShape {
  slug: 'starter' | 'growth' | 'unlimited';
  accent?: boolean;
}

// Tier slugs + accent flag are layout decisions (stay in code). Tier name,
// tagline, features, PRICE, and CURRENCY all flow from the message catalog
// per locale: EN visitors see $49/$99/$199, AR visitors see EGP
// 1,350/2,750/5,300 ج.م. Same shape, locale-driven numbers.
const TIERS: TierShape[] = [
  { slug: 'starter' },
  { slug: 'growth', accent: true },
  { slug: 'unlimited' },
];

export default async function PricingPage() {
  const locale = await getLocale();
  const m = getMessages(locale);
  const isAr = locale === 'ar';
  const t = m.pricing;

  // FAQ answer rendering: the JSON stores HTML-ish placeholders
  // (<accent>...</accent>, <link>...</link>) so the same string can drive
  // English and Arabic without forking the JSX. Each FAQ row maps the
  // tokens to JSX inline. There are exactly 6 FAQ items, indexed 0..5.
  const faqRender = (i: number, raw: string): React.ReactNode => {
    // Q3: <accent>tier</accent>
    if (i === 2) {
      const parts = raw.split(/<\/?accent>/);
      return (
        <>
          {parts[0]}
          <span className="text-brand-400">{parts[1]}</span>
          {parts[2]}
        </>
      );
    }
    // Q4 + Q6: <link>roadmap</link> --> Link to /roadmap
    if (i === 3 || i === 5) {
      const parts = raw.split(/<\/?link>/);
      return (
        <>
          {parts[0]}
          <Link href="/roadmap" className="text-brand-400 hover:underline">
            {parts[1]}
          </Link>
          {parts[2]}
        </>
      );
    }
    return raw;
  };

  return (
    <main className="bg-ink-950 text-ink-50 min-h-screen" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top utility bar, minimal back-to-home, not the cinematic chrome. */}
      <nav className="border-b border-ink-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-base tracking-tight text-ink-100 hover:text-ink-50 transition-colors"
            dir="ltr"
          >
            {m.common.brand}
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/blog" className="text-ink-300 hover:text-ink-50 transition-colors">
              {m.common.nav.blog}
            </Link>
            <Link href="/for-gyms" className="text-ink-300 hover:text-ink-50 transition-colors">
              {m.common.nav.for_gyms}
            </Link>
            <a
              href={'/start'}
              className="rounded-md bg-brand-500 text-white px-3 py-1.5 hover:bg-brand-450 transition-colors"
            >
              {m.common.nav.start_trial_cta}
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="mx-auto max-w-4xl px-4 sm:px-6 pt-16 sm:pt-24 pb-12 text-center">
        <h1 className="font-display text-4xl sm:text-6xl tracking-tight text-ink-50">
          {t.h1}
        </h1>
        <p className="mt-5 text-lg sm:text-xl text-ink-300 max-w-2xl mx-auto">
          {t.lede_a}
          <span className="text-brand-400">{t.lede_b}</span>
          {t.lede_c}
        </p>
      </header>

      {/* Tier cards */}
      <section
        aria-label={t.compare.heading}
        className="mx-auto max-w-6xl px-4 sm:px-6 pb-16"
      >
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TIERS.map((tier) => {
            const tt = t.tiers[tier.slug];
            return (
              <li key={tier.slug}>
                <article
                  data-tier={tier.slug}
                  className={[
                    'h-full rounded-2xl border bg-ink-900 p-6 sm:p-7 flex flex-col',
                    tier.accent
                      ? 'border-brand-500/40 shadow-[0_0_0_1px_rgba(255,69,102,0.4),0_30px_80px_-40px_rgba(255,69,102,0.25)]'
                      : 'border-ink-800',
                  ].join(' ')}
                >
                  <header className="mb-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-2">
                      {tt.name}
                    </p>
                    <p className="text-sm text-ink-300 mb-4">{tt.tagline}</p>
                    <div className="flex items-baseline gap-1.5" dir={isAr ? 'rtl' : 'ltr'}>
                      {tt.currency && (tt.currency === '$' || !isAr) ? (
                        <span className="text-ink-400 text-2xl">{tt.currency}</span>
                      ) : null}
                      <span
                        data-numeric
                        className="font-display text-5xl sm:text-6xl tracking-tight tabular-nums text-ink-50"
                      >
                        {Number(tt.price).toLocaleString(isAr ? 'en-US' : 'en-US')}
                      </span>
                      {isAr && tt.currency ? (
                        <span className="text-ink-400 text-2xl">{tt.currency}</span>
                      ) : null}
                      <span className="text-ink-400 text-sm">{t.per_month}</span>
                    </div>
                    <p className="mt-2 text-xs font-mono uppercase tracking-[0.14em] text-brand-400">
                      {tt.cap}
                    </p>
                  </header>

                  <ul className="space-y-2.5 text-sm text-ink-200 flex-1">
                    {tt.features.map((f) => (
                      <li key={f} className="flex gap-2.5">
                        <span aria-hidden className="text-brand-400 mt-0.5">+</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 pt-6 border-t border-ink-800/80">
                    <a
                      href={'/start'}
                      className={[
                        'block w-full text-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors',
                        tier.accent
                          ? 'bg-brand-500 text-white hover:bg-brand-450'
                          : 'bg-ink-50 text-ink-950 hover:bg-white',
                      ].join(' ')}
                    >
                      {m.common.nav.start_free_trial}
                    </a>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Comparison table */}
      <section
        aria-labelledby="compare"
        className="mx-auto max-w-6xl px-4 sm:px-6 pb-20"
      >
        <h2
          id="compare"
          className="font-display text-2xl sm:text-3xl tracking-tight mb-6 text-ink-50"
        >
          {t.compare.heading}
        </h2>
        <div className="overflow-x-auto rounded-xl border border-ink-800">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-ink-900 text-ink-300">
                <th scope="col" className="text-start font-medium px-4 py-3">
                  {t.compare.col_feature}
                </th>
                <th scope="col" className="text-start font-medium px-4 py-3">
                  {t.compare.col_starter}
                </th>
                <th scope="col" className="text-start font-medium px-4 py-3">
                  {t.compare.col_growth}
                </th>
                <th scope="col" className="text-start font-medium px-4 py-3">
                  {t.compare.col_unlimited}
                </th>
              </tr>
            </thead>
            <tbody>
              {t.compare.rows.map((row, i) => (
                <tr
                  key={row.label}
                  className={
                    i % 2 === 0
                      ? 'bg-ink-950 text-ink-200'
                      : 'bg-ink-900/50 text-ink-200'
                  }
                >
                  <th scope="row" className="text-start font-normal text-ink-100 px-4 py-3 align-top">
                    {row.label}
                  </th>
                  <td className="px-4 py-3 align-top">{row.starter}</td>
                  <td className="px-4 py-3 align-top">{row.growth}</td>
                  <td className="px-4 py-3 align-top">{row.unlimited}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section
        aria-labelledby="faq"
        className="mx-auto max-w-3xl px-4 sm:px-6 pb-20"
      >
        <h2
          id="faq"
          className="font-display text-2xl sm:text-3xl tracking-tight mb-8 text-ink-50"
        >
          {t.faq.heading}
        </h2>
        <dl className="space-y-8">
          {t.faq.items.map((item, i) => (
            <div key={item.q} className="border-b border-ink-900 pb-8 last:border-b-0">
              <dt className="font-display text-lg text-ink-50 mb-2">
                {item.q}
              </dt>
              <dd className="text-ink-300 leading-relaxed">{faqRender(i, item.a_html)}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Founder card */}
      <section
        aria-labelledby="founder"
        className="mx-auto max-w-3xl px-4 sm:px-6 pb-24"
      >
        <h2 id="founder" className="sr-only">
          {t.founder.section_aria}
        </h2>
        <article className="rounded-2xl border border-ink-800 bg-ink-900 p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start">
          <div
            aria-hidden
            className="shrink-0 w-20 h-20 rounded-full bg-gradient-to-br from-brand-500/40 to-brand-700/40 border border-ink-800 flex items-center justify-center font-display text-2xl text-ink-50"
          >
            {t.founder.avatar_letter}
          </div>
          <div className="flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-2">
              {t.founder.eyebrow}
            </p>
            <p className="font-display text-xl text-ink-50 mb-1">
              {t.founder.name}
            </p>
            <p className="text-sm text-ink-300 mb-5">
              {t.founder.body}
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <a
                href="https://wa.me/201036596238"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-md bg-brand-500 text-white px-4 py-2 font-medium hover:bg-brand-450 transition-colors"
              >
                {t.founder.cta_whatsapp}
              </a>
              <a
                href="https://www.linkedin.com/in/ironpath-ahmed/"
                className="inline-flex items-center gap-2 rounded-md border border-ink-700 text-ink-100 px-4 py-2 font-medium hover:border-ink-600 transition-colors"
              >
                {t.founder.cta_linkedin}
              </a>
            </div>
          </div>
        </article>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-400">
          <p>&copy; {new Date().getFullYear()} IronPath, Inc.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-ink-200 transition-colors">
              {m.common.nav.privacy}
            </Link>
            <Link href="/terms" className="hover:text-ink-200 transition-colors">
              {m.common.nav.terms}
            </Link>
            <Link href="/blog" className="hover:text-ink-200 transition-colors">
              {m.common.nav.blog}
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
