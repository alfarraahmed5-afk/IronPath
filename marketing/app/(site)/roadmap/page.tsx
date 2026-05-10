// /roadmap, what's coming and roughly when.
//
// The companion to /pricing's deliberate trim. We list shipped features
// only on the pricing tiers; aspirational items live here with quarterly
// targets so the customer knows what they're buying into without us
// over-promising on the pricing page itself.
//
// Honesty rules:
//   - Quarter targets are aspirational. Mark them clearly.
//   - "Shipped" only when it's in production AND a customer can use it.
//   - No vapor, if something is purely aspirational with no commitment,
//     it goes in the "Maybe later" bucket, not a quarter.
//
// Localization: every item title + detail is in /messages/{en,ar}.json.
// Quarter labels include the calendar reference inline.

import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { fmt, getLocale, getMessages } from '@/lib/i18n';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = getMessages(locale);
  return buildMetadata({
    title: m.roadmap.page_title,
    description: m.roadmap.page_description,
    path: '/roadmap',
  });
}

export default async function RoadmapPage() {
  const locale = await getLocale();
  const m = getMessages(locale);
  const isAr = locale === 'ar';
  const t = m.roadmap;

  const lastUpdated = new Date().toLocaleDateString(
    locale === 'ar' ? 'ar-EG' : 'en-US',
    { month: 'short', day: 'numeric', year: 'numeric', numberingSystem: 'latn' },
  );

  return (
    <main className="bg-ink-950 text-ink-50 min-h-screen" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top utility bar */}
      <nav className="border-b border-ink-900">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-base tracking-tight text-ink-100 hover:text-ink-50 transition-colors"
            dir="ltr"
          >
            {m.common.brand}
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/pricing" className="text-ink-300 hover:text-ink-50 transition-colors">
              {m.common.nav.pricing}
            </Link>
            <Link href="/blog" className="text-ink-300 hover:text-ink-50 transition-colors">
              {m.common.nav.blog}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[11px] text-brand-400 mb-3 tracking-wider">
            {t.hero_eyebrow}
          </p>
          <h1 className="font-display text-3xl sm:text-5xl text-ink-50 mb-4 tracking-tight">
            {t.hero_h1}
          </h1>
          <p className="text-ink-300 text-base sm:text-lg max-w-xl leading-relaxed">
            {t.hero_lede}
          </p>
        </div>
      </section>

      <hr className="border-ink-900" />

      {/* Shipped today */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-baseline justify-between mb-2">
            <p className="font-mono text-[11px] text-ink-400 tracking-wider">
              {t.shipped_label}
            </p>
            <p className="text-xs text-ink-500 font-mono">{fmt(t.shipped_count, { count: t.shipped.length })}</p>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl text-ink-100 mb-8 tracking-tight">
            {t.shipped_h2}
          </h2>
          <ul className="space-y-5">
            {t.shipped.map((item) => (
              <li key={item.title} className="border-l-2 border-brand-500 pl-4">
                <p className="text-ink-100 font-medium">{item.title}</p>
                <p className="text-ink-400 text-sm mt-1 leading-relaxed">{item.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <hr className="border-ink-900" />

      {/* Quarterly roadmap */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[11px] text-ink-400 mb-3 tracking-wider">
            {t.coming_label}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl text-ink-100 mb-2 tracking-tight">
            {t.coming_h2}
          </h2>
          <p className="text-ink-400 text-sm mb-12 max-w-xl leading-relaxed">
            {t.coming_lede}
          </p>

          <div className="space-y-12">
            {t.quarters.map((q) => (
              <div key={q.label}>
                <div className="flex items-baseline justify-between mb-1">
                  <p className="font-display text-xl text-ink-100 tracking-tight">
                    {q.label}
                  </p>
                  <p className="text-xs text-ink-500 font-mono">{fmt(t.items_count, { count: q.items.length })}</p>
                </div>
                <p className="text-ink-400 text-sm mb-6">{q.blurb}</p>
                <ul className="space-y-4">
                  {q.items.map((item) => (
                    <li
                      key={item.title}
                      className="border-l-2 border-ink-700 pl-4"
                    >
                      <p className="text-ink-100 font-medium">{item.title}</p>
                      <p className="text-ink-400 text-sm mt-1 leading-relaxed">
                        {item.detail}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="border-ink-900" />

      {/* Maybe later */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[11px] text-ink-400 mb-3 tracking-wider">
            {t.maybe_label}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl text-ink-100 mb-2 tracking-tight">
            {t.maybe_h2}
          </h2>
          <p className="text-ink-400 text-sm mb-8 max-w-xl leading-relaxed">
            {t.maybe_lede}
          </p>
          <ul className="space-y-4">
            {t.maybe_later.map((item) => (
              <li
                key={item.title}
                className="border-l-2 border-ink-800 pl-4 opacity-80"
              >
                <p className="text-ink-200 font-medium">{item.title}</p>
                <p className="text-ink-500 text-sm mt-1 leading-relaxed">
                  {item.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <hr className="border-ink-900" />

      {/* CTA */}
      <section className="px-4 sm:px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl sm:text-3xl text-ink-50 mb-4 tracking-tight">
            {t.cta_h2}
          </h2>
          <p className="text-ink-300 mb-8 leading-relaxed">
            {t.cta_body}
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-brand-500 hover:bg-brand-450 text-white text-sm font-medium transition-colors"
          >
            <span>{t.cta_link}</span>
            <span aria-hidden>{isAr ? '←' : '→'}</span>
          </Link>
        </div>
      </section>

      <footer className="border-t border-ink-900 px-4 sm:px-6 py-10 text-xs text-ink-400">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row gap-4 sm:justify-between">
          <span>{fmt(m.common.footer.copyright_short, { year: new Date().getFullYear() })}</span>
          <span>{fmt(t.last_updated, { date: lastUpdated })}</span>
        </div>
      </footer>
    </main>
  );
}
