// /ar/blog/[slug] -- Arabic post detail. Mirrors /(site)/blog/[slug] with
// locale forced to 'ar'. The MDX body comes from <slug>.ar.mdx when one
// exists, otherwise falls back to the EN <slug>.mdx (per lib/blog.ts).

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { evaluate } from '@mdx-js/mdx';
// Import the runtime here, in the RSC module graph, so React resolves
// against Next's `react-server` exports condition (the bundled RSC
// renderer's React). Same fix as the EN page applies (see comment there
// for the older-copy-of-React diagnosis).
import * as runtime from 'react/jsx-runtime';
import { setRequestLocale } from 'next-intl/server';
import { getAllSlugs, getPostBySlug } from '@/lib/blog';
import { buildMetadata } from '@/lib/seo';
import { getMessages } from '@/lib/i18n';

export const revalidate = 3600;

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  // Slugs are derived from EN files (canonical). The AR variant uses the
  // same slug list, falling back to the EN body when no .ar.mdx exists.
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { slug } = await params;
  const m = getMessages('ar');
  const post = await getPostBySlug(slug, 'ar');
  if (!post) {
    return buildMetadata({
      title: m.post.not_found_title,
      path: `/blog/${slug}`,
      locale: 'ar',
    });
  }
  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${slug}`,
    locale: 'ar',
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    numberingSystem: 'latn',
  });
}

// MDX element overrides, identical to EN (typography is locale-agnostic).
/* eslint-disable jsx-a11y/heading-has-content, jsx-a11y/anchor-has-content */
const mdxComponents = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className="font-display text-3xl sm:text-4xl tracking-tight text-ink-50 mt-12 mb-5 first:mt-0"
      {...props}
    />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className="font-display text-2xl sm:text-3xl tracking-tight text-ink-50 mt-12 mb-4"
      {...props}
    />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      className="font-display text-xl sm:text-2xl tracking-tight text-ink-50 mt-10 mb-3"
      {...props}
    />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="font-sans text-ink-200 leading-relaxed mb-5" {...props} />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      className="text-brand-400 underline underline-offset-2 hover:text-brand-350 transition-colors"
      {...props}
    />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    // pr-6 instead of pl-6 for RTL bullet indent.
    <ul className="list-disc pr-6 space-y-2 text-ink-200 mb-5" {...props} />
  ),
  ol: (props: React.OlHTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal pr-6 space-y-2 text-ink-200 mb-5" {...props} />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    // border-r in RTL.
    <blockquote
      className="border-r-2 border-brand-500/60 pr-4 italic text-ink-300 my-6"
      {...props}
    />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code
      className="font-mono text-[0.9em] bg-ink-900 text-ink-100 px-1.5 py-0.5 rounded"
      {...props}
    />
  ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre
      className="font-mono text-sm bg-ink-900 text-ink-100 border border-ink-800 rounded-lg p-4 overflow-x-auto my-6"
      dir="ltr"
      {...props}
    />
  ),
  hr: () => <hr className="border-ink-800 my-10" />,
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="text-ink-50 font-semibold" {...props} />
  ),
  em: (props: React.HTMLAttributes<HTMLElement>) => (
    <em className="italic text-ink-100" {...props} />
  ),
};
/* eslint-enable jsx-a11y/heading-has-content, jsx-a11y/anchor-has-content */

async function MDXContent({
  source,
  components,
}: {
  source: string;
  components: Record<string, React.ComponentType<Record<string, unknown>>>;
}) {
  const { default: Content } = await evaluate(source, {
    ...runtime,
    development: false,
  });
  return <Content components={components} />;
}

export default async function ArabicPostPage(
  { params }: { params: Promise<Params> },
) {
  const { slug } = await params;
  setRequestLocale('ar');
  const m = getMessages('ar');
  const post = await getPostBySlug(slug, 'ar');
  if (!post) notFound();

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
            <Link href="/ar/blog" className="text-ink-300 hover:text-ink-50 transition-colors">
              {m.common.nav.blog}
            </Link>
            <Link href="/ar/pricing" className="text-ink-300 hover:text-ink-50 transition-colors">
              {m.common.nav.pricing}
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

      <article className="mx-auto max-w-2xl px-4 sm:px-6 pt-16 sm:pt-24 pb-20">
        <header className="mb-10">
          <p className="font-mono text-xs text-ink-400 mb-4">
            <Link
              href="/ar/blog"
              className="hover:text-ink-200 transition-colors inline-flex items-center gap-1"
            >
              <span aria-hidden>{m.post.back_arrow}</span> {m.post.all_posts}
            </Link>
          </p>
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink-50 mb-5">
            {post.title}
          </h1>
          <p className="font-mono text-xs text-ink-400 flex items-center gap-3">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span aria-hidden>&middot;</span>
            <span>{post.readingTimeMinutes} دقيقة قراية</span>
            <span aria-hidden>&middot;</span>
            <span>{post.author}</span>
          </p>
        </header>

        <div className="font-sans text-ink-200">
          <MDXContent components={mdxComponents} source={post.content} />
        </div>

        <footer className="mt-16 pt-10 border-t border-ink-900">
          <p className="font-display text-2xl text-ink-50 mb-4">
            {m.post.footer_h2_a}
            <span className="text-brand-400">{m.post.footer_h2_b}</span>
            {m.post.footer_h2_c}
          </p>
          <p className="text-ink-300 mb-6 leading-relaxed">
            {m.post.footer_body}
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="/ar/start"
              className="inline-flex items-center gap-2 rounded-md bg-brand-500 text-white px-5 py-2.5 text-sm font-medium hover:bg-brand-450 transition-colors"
            >
              {m.common.nav.start_free_trial}
            </a>
            <Link
              href="/ar/pricing"
              className="inline-flex items-center gap-2 rounded-md border border-ink-700 text-ink-100 px-5 py-2.5 text-sm font-medium hover:border-ink-600 transition-colors"
            >
              {m.common.nav.see_pricing}
            </Link>
          </div>
        </footer>
      </article>

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
            <Link href="/ar/blog" className="hover:text-ink-200 transition-colors">
              {m.common.nav.blog}
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
