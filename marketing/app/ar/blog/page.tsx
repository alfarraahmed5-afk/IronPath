// /ar/blog -- Arabic blog index. Mirrors /(site)/blog with locale forced
// to 'ar'. Slug list is the same across locales (canonical English file
// name); the AR body falls back to EN when no <slug>.ar.mdx exists.

import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { getAllPosts } from '@/lib/blog';
import { buildMetadata } from '@/lib/seo';
import { fmt, getMessages } from '@/lib/i18n';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const m = getMessages('ar');
  return buildMetadata({
    title: m.blog.page_title,
    description: m.blog.page_description,
    path: '/blog',
    locale: 'ar',
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // Latin digits per Egyptian SaaS convention.
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    numberingSystem: 'latn',
  });
}

export default async function ArabicBlogIndexPage() {
  setRequestLocale('ar');
  const m = getMessages('ar');
  const posts = await getAllPosts('ar');

  return (
    <main
      className="bg-ink-950 text-ink-50 min-h-screen"
      dir="rtl"
      lang="ar"
    >
      {/* Top utility bar */}
      <nav className="border-b border-ink-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/ar"
            className="font-display text-base tracking-tight text-ink-100 hover:text-ink-50 transition-colors"
            dir="ltr"
          >
            {m.common.brand}
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/ar/pricing" className="text-ink-300 hover:text-ink-50 transition-colors">
              {m.common.nav.pricing}
            </Link>
            <Link href="/ar/for-gyms" className="text-ink-300 hover:text-ink-50 transition-colors">
              {m.common.nav.for_gyms}
            </Link>
            <a
              href="/ar/start"
              className="rounded-md bg-brand-500 text-white px-3 py-1.5 hover:bg-brand-450 transition-colors"
            >
              {m.common.nav.start_trial_cta}
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="mx-auto max-w-3xl px-4 sm:px-6 pt-16 sm:pt-24 pb-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-3">
          {m.blog.eyebrow}
        </p>
        <h1 className="font-display text-4xl sm:text-6xl tracking-tight text-ink-50">
          {m.blog.h1}
        </h1>
        <p className="mt-5 text-lg text-ink-300 max-w-2xl">
          {m.blog.lede_a}
          <span className="text-brand-400">{m.blog.lede_b}</span>
          {m.blog.lede_c}
        </p>
      </header>

      {/* Post list */}
      <section
        aria-label={m.blog.section_aria}
        className="mx-auto max-w-3xl px-4 sm:px-6 pb-24"
      >
        {posts.length === 0 ? (
          <p className="text-ink-300">{m.blog.empty}</p>
        ) : (
          <ul className="space-y-10">
            {posts.map((post) => (
              <li key={post.slug}>
                <article className="group border-b border-ink-900 pb-10 last:border-b-0">
                  <p className="font-mono text-xs text-ink-400 mb-3 flex items-center gap-3">
                    <time dateTime={post.date}>{formatDate(post.date)}</time>
                    <span aria-hidden>&middot;</span>
                    <span>{fmt(m.blog.min_read, { minutes: post.readingTimeMinutes })}</span>
                  </p>
                  <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-ink-50 mb-3">
                    <Link
                      href={`/ar/blog/${post.slug}`}
                      className="hover:text-brand-400 transition-colors"
                    >
                      {post.title}
                    </Link>
                  </h2>
                  <p className="text-ink-300 leading-relaxed mb-4">
                    {post.excerpt}
                  </p>
                  <Link
                    href={`/ar/blog/${post.slug}`}
                    className="inline-flex items-center gap-1 text-sm text-brand-400 hover:text-brand-350 transition-colors"
                  >
                    {m.blog.read_link} <span aria-hidden>{m.blog.read_arrow}</span>
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-400">
          <p>&copy; {new Date().getFullYear()} IronPath, Inc.</p>
          <div className="flex gap-5">
            <Link href="/ar/privacy" className="hover:text-ink-200 transition-colors">
              {m.common.nav.privacy}
            </Link>
            <Link href="/ar/terms" className="hover:text-ink-200 transition-colors">
              {m.common.nav.terms}
            </Link>
            <Link href="/ar/pricing" className="hover:text-ink-200 transition-colors">
              {m.common.nav.pricing}
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
