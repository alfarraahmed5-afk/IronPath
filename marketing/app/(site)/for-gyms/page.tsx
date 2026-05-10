// /for-gyms, long-form value-prop page for independent gym owners.
// RSC, ISR every hour. Roughly 650 words of editorial body covering the
// pain points the cinematic landing only alludes to.
//
// Locale-aware: copy comes from /messages/{en,ar}.json. Egyptian Arabic
// for the body; brand wordmark and USD pricing stay LTR.

import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { getLocale, getMessages } from '@/lib/i18n';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = getMessages(locale);
  return buildMetadata({
    title: m.for_gyms.page_title,
    description: m.for_gyms.page_description,
    path: '/for-gyms',
  });
}

const ADMIN_SIGNUP = '/start';

export default async function ForGymsPage() {
  const locale = await getLocale();
  const m = getMessages(locale);
  const isAr = locale === 'ar';
  const t = m.for_gyms;

  return (
    <main className="bg-ink-950 text-ink-50 min-h-screen" dir={isAr ? 'rtl' : 'ltr'}>
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
            <Link href="/pricing" className="text-ink-300 hover:text-ink-50 transition-colors">
              {m.common.nav.pricing}
            </Link>
            <Link href="/blog" className="text-ink-300 hover:text-ink-50 transition-colors">
              {m.common.nav.blog}
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

      <article className="mx-auto max-w-2xl px-4 sm:px-6 pt-16 sm:pt-24 pb-20">
        <header className="mb-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-3">
            {t.eyebrow}
          </p>
          <h1 className="font-display text-4xl sm:text-6xl tracking-tight text-ink-50 mb-5">
            {t.h1}
          </h1>
          <p className="text-lg text-ink-300 leading-relaxed">
            {t.lede_a}
            {t.lede_dash}
            {t.lede_b}
            <span className="text-brand-400">{t.lede_accent}</span>
            {t.lede_c}
          </p>
        </header>

        <section className="mb-12">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-ink-50 mb-4">
            {t.s1_h2}
          </h2>
          <p className="font-sans text-ink-200 leading-relaxed mb-5">
            {t.s1_p1}
          </p>
          <p className="font-sans text-ink-200 leading-relaxed mb-5">
            {t.s1_p2_a}
            <span className="text-brand-400">{t.s1_p2_accent}</span>
            {t.s1_p2_b}
          </p>
        </section>

        <section className="mb-12">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-ink-50 mb-4">
            {t.s2_h2}
          </h2>
          <p className="font-sans text-ink-200 leading-relaxed mb-5">
            {t.s2_p1_a}
            <span className="text-brand-400">{t.s2_p1_accent}</span>
            {t.s2_p1_b}
          </p>
          <p className="font-sans text-ink-200 leading-relaxed mb-5">
            {t.s2_p2}
          </p>
        </section>

        <section className="mb-12">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-ink-50 mb-4">
            {t.s3_h2}
          </h2>
          <p className="font-sans text-ink-200 leading-relaxed mb-5">
            {t.s3_p1_a}
            <span className="text-brand-400">{t.s3_p1_accent}</span>
            {t.s3_p1_b}
          </p>
          <p className="font-sans text-ink-200 leading-relaxed mb-5">
            {t.s3_p2}
          </p>
        </section>

        <section className="mb-12">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-ink-50 mb-4">
            {t.s4_h2}
          </h2>
          <p className="font-sans text-ink-200 leading-relaxed mb-5">
            {t.s4_p1_a}
            <span className="text-brand-400" dir="ltr">{t.s4_p1_accent}</span>
            {t.s4_p1_b}
          </p>
        </section>

        <section className="mb-12">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-ink-50 mb-4">
            {t.s5_h2}
          </h2>
          <p className="font-sans text-ink-200 leading-relaxed mb-6">
            {t.s5_p1}
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={'/start'}
              className="inline-flex items-center gap-2 rounded-md bg-brand-500 text-white px-5 py-2.5 text-sm font-medium hover:bg-brand-450 transition-colors"
            >
              {m.common.nav.start_free_trial}
            </a>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-md border border-ink-700 text-ink-100 px-5 py-2.5 text-sm font-medium hover:border-ink-600 transition-colors"
            >
              {m.common.nav.see_pricing}
            </Link>
          </div>
        </section>
      </article>

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
