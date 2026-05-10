// Individual blog post — RSC.
//
// Statically pre-renders every post via generateStaticParams. ISR keeps the
// rendered HTML fresh if a post is edited (revalidate every hour).
// MDX is parsed at request time by next-mdx-remote/rsc; we override the
// stock element renderers so headings/paragraphs/code/links pick up our
// brand typography and colors.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { evaluate } from '@mdx-js/mdx';
// We import the runtime here, in the RSC module graph, so React resolves
// against Next's `react-server` exports condition (the bundled RSC
// renderer's React). Passing these into `evaluate` keeps every element
// next-mdx-remote would have produced on the same React identity as the
// renderer — fixes the "older copy of React" prerender error that
// `next-mdx-remote/rsc` otherwise hits in this Next 15.1 / React 18.3
// combination.
import * as runtime from 'react/jsx-runtime';
import { getAllSlugs, getPostBySlug } from '@/lib/blog';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 3600;

const ADMIN_SIGNUP = 'https://admin.ironpath.health/signup';

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    return buildMetadata({
      title: 'Post not found',
      path: `/blog/${slug}`,
    });
  }
  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${slug}`,
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// MDX element overrides — our brand typography stack. Headings use
// Mona Sans (font-display), body uses Inter (default), code uses
// JetBrains Mono. Links pick up brand-400 (AA-passing on dark).
//
// jsx-a11y can't see that `children` is forwarded from MDX content via
// spread, so the heading-has-content / anchor-has-content rules
// false-positive on these passthroughs. We disable inline.
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
    <ul className="list-disc pl-6 space-y-2 text-ink-200 mb-5" {...props} />
  ),
  ol: (props: React.OlHTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal pl-6 space-y-2 text-ink-200 mb-5" {...props} />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="border-l-2 border-brand-500/60 pl-4 italic text-ink-300 my-6"
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

// Server component that compiles + evaluates MDX into a React element on
// each render. Uses @mdx-js/mdx directly (rather than next-mdx-remote) so
// the runtime React identity matches the RSC renderer (see import note).
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

export default async function PostPage(
  { params }: { params: Promise<Params> },
) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

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
            <Link href="/blog" className="text-ink-300 hover:text-ink-50 transition-colors">
              Blog
            </Link>
            <Link href="/pricing" className="text-ink-300 hover:text-ink-50 transition-colors">
              Pricing
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

      <article className="mx-auto max-w-2xl px-4 sm:px-6 pt-16 sm:pt-24 pb-20">
        <header className="mb-10">
          <p className="font-mono text-xs text-ink-400 mb-4">
            <Link
              href="/blog"
              className="hover:text-ink-200 transition-colors inline-flex items-center gap-1"
            >
              <span aria-hidden>&larr;</span> All posts
            </Link>
          </p>
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink-50 mb-5">
            {post.title}
          </h1>
          <p className="font-mono text-xs text-ink-400 flex items-center gap-3">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span aria-hidden>&middot;</span>
            <span>{post.readingTimeMinutes} min read</span>
            <span aria-hidden>&middot;</span>
            <span>{post.author}</span>
          </p>
        </header>

        <div className="font-sans text-ink-200">
          <MDXContent components={mdxComponents} source={post.content} />
        </div>

        <footer className="mt-16 pt-10 border-t border-ink-900">
          <p className="font-display text-2xl text-ink-50 mb-4">
            Liked this? Start your{' '}
            <span className="text-brand-400">30-day trial</span>.
          </p>
          <p className="text-ink-300 mb-6 leading-relaxed">
            No card up front. Import your members from a Mindbody CSV in the
            first 10 minutes. Cancel from the billing page in two clicks.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={`${ADMIN_SIGNUP}?tier=growth`}
              className="inline-flex items-center gap-2 rounded-md bg-brand-500 text-white px-5 py-2.5 text-sm font-medium hover:bg-brand-450 transition-colors"
            >
              Start free trial
            </a>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-md border border-ink-700 text-ink-100 px-5 py-2.5 text-sm font-medium hover:border-ink-600 transition-colors"
            >
              See pricing
            </Link>
          </div>
        </footer>
      </article>

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
            <Link href="/blog" className="hover:text-ink-200 transition-colors">
              Blog
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
