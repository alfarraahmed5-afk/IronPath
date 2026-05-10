// Blog index — RSC. Lists every post in /content/blog sorted by date desc.
//
// New posts ship as MDX files in content/blog/<slug>.mdx. The list page
// re-renders on demand (ISR every 60s) so a fresh post shows up within
// a minute even on a long-lived deployment.

import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 60;

export const metadata: Metadata = buildMetadata({
  title: 'Blog',
  description:
    'Field notes from IronPath — working hypotheses about gym software, sharpened by the gym owners who use it.',
  path: '/blog',
});

const ADMIN_SIGNUP = '/start';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function BlogIndexPage() {
  const posts = await getAllPosts();

  return (
    <main className="bg-ink-950 text-ink-50 min-h-screen">
      {/* Top utility bar */}
      <nav className="border-b border-ink-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-base tracking-tight text-ink-100 hover:text-ink-50 transition-colors"
          >
            IronPath
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/pricing" className="text-ink-300 hover:text-ink-50 transition-colors">
              Pricing
            </Link>
            <Link href="/for-gyms" className="text-ink-300 hover:text-ink-50 transition-colors">
              For gyms
            </Link>
            <a
              href={`${ADMIN_SIGNUP}?tier=growth`}
              className="rounded-md bg-brand-500 text-white px-3 py-1.5 hover:bg-brand-450 transition-colors"
            >
              Start trial
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="mx-auto max-w-3xl px-4 sm:px-6 pt-16 sm:pt-24 pb-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-3">
          The IronPath blog
        </p>
        <h1 className="font-display text-4xl sm:text-6xl tracking-tight text-ink-50">
          Field notes.
        </h1>
        <p className="mt-5 text-lg text-ink-300 max-w-2xl">
          Working hypotheses, sharpened by gym owners. We publish what
          we&rsquo;ve learned from sitting in 43 gyms over the last year &mdash;
          why <span className="text-brand-400">Mindbody fails small operators</span>,
          how QR-poster signups actually convert, and what a 30-day trial has
          to look like to be honest.
        </p>
      </header>

      {/* Post list */}
      <section
        aria-label="Recent posts"
        className="mx-auto max-w-3xl px-4 sm:px-6 pb-24"
      >
        {posts.length === 0 ? (
          <p className="text-ink-300">
            No posts yet &mdash; check back soon.
          </p>
        ) : (
          <ul className="space-y-10">
            {posts.map((post) => (
              <li key={post.slug}>
                <article className="group border-b border-ink-900 pb-10 last:border-b-0">
                  <p className="font-mono text-xs text-ink-400 mb-3 flex items-center gap-3">
                    <time dateTime={post.date}>{formatDate(post.date)}</time>
                    <span aria-hidden>&middot;</span>
                    <span>{post.readingTimeMinutes} min read</span>
                  </p>
                  <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-ink-50 mb-3">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="hover:text-brand-400 transition-colors"
                    >
                      {post.title}
                    </Link>
                  </h2>
                  <p className="text-ink-300 leading-relaxed mb-4">
                    {post.excerpt}
                  </p>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-1 text-sm text-brand-400 hover:text-brand-350 transition-colors"
                  >
                    Read <span aria-hidden>&rarr;</span>
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
            <Link href="/privacy" className="hover:text-ink-200 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink-200 transition-colors">
              Terms
            </Link>
            <Link href="/pricing" className="hover:text-ink-200 transition-colors">
              Pricing
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
