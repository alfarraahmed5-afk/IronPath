// MDX content collection helper for the blog.
//
// Posts live in `marketing/content/blog/*.mdx` with YAML-ish frontmatter
// delimited by `---`. We parse frontmatter manually (key: "value" pairs)
// to avoid pulling gray-matter into the dependency tree.
//
// Localization (Option A from the brief): each English post may have a
// parallel `<slug>.ar.mdx` file in the same directory. When the Arabic
// locale is active we prefer the .ar.mdx; if it doesn't exist we fall
// back to the English version. Slugs (and therefore URLs) are shared
// across locales, English remains the canonical filename.

import { promises as fs } from 'node:fs';
import path from 'node:path';

export type Locale = 'en' | 'ar';

export interface PostFrontmatter {
  title: string;
  date: string;       // ISO yyyy-mm-dd
  excerpt: string;
  author: string;
}

export interface PostMeta extends PostFrontmatter {
  slug: string;
  readingTimeMinutes: number;
}

export interface Post extends PostMeta {
  content: string;    // raw MDX body (frontmatter stripped)
}

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  // Expected shape:
  //   ---
  //   key: "value"
  //   key: "value"
  //   ---
  //   <body>
  if (!raw.startsWith('---')) {
    return { data: {}, body: raw };
  }
  const end = raw.indexOf('\n---', 3);
  if (end === -1) {
    return { data: {}, body: raw };
  }
  const header = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\r?\n/, '');
  const data: Record<string, string> = {};
  for (const line of header.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[m[1]] = value;
  }
  return { data, body };
}

function estimateReadingTime(body: string): number {
  // ~225 wpm is a reasonable average for editorial content. We strip code
  // fences and inline code so a bunch of snippets don't fool the count.
  // For Arabic we still use the same words-per-minute estimate; word
  // counts in Arabic are roughly comparable to English for marketing
  // prose, so the heuristic stays useful without locale-tuning.
  const stripped = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ');
  const words = stripped.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 225));
}

function toPost(slug: string, raw: string): Post {
  const { data, body } = parseFrontmatter(raw);
  return {
    slug,
    title: data.title ?? slug,
    date: data.date ?? '1970-01-01',
    excerpt: data.excerpt ?? '',
    author: data.author ?? 'IronPath',
    readingTimeMinutes: estimateReadingTime(body),
    content: body,
  };
}

// Read the locale-specific MDX for a slug, with EN fallback.
async function readPostFile(slug: string, locale: Locale): Promise<string | null> {
  const tryNames =
    locale === 'ar'
      ? [`${slug}.ar.mdx`, `${slug}.mdx`]
      : [`${slug}.mdx`];
  for (const name of tryNames) {
    try {
      return await fs.readFile(path.join(BLOG_DIR, name), 'utf8');
    } catch {
      // try next candidate
    }
  }
  return null;
}

export async function getAllPosts(locale: Locale = 'en'): Promise<PostMeta[]> {
  let entries: string[] = [];
  try {
    entries = await fs.readdir(BLOG_DIR);
  } catch {
    return [];
  }
  // English files only define the canonical slug list. Arabic-only posts
  // are not supported (would orphan the EN URL); add an EN stub if you
  // need a slug to exist at all.
  const files = entries.filter((f) => f.endsWith('.mdx') && !f.endsWith('.ar.mdx'));
  const posts = await Promise.all(
    files.map(async (f) => {
      const slug = f.replace(/\.mdx$/, '');
      const raw = await readPostFile(slug, locale);
      if (raw === null) return null;
      const { content: _content, ...meta } = toPost(slug, raw);
      return meta;
    }),
  );
  return posts
    .filter((p): p is PostMeta => p !== null)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPostBySlug(slug: string, locale: Locale = 'en'): Promise<Post | null> {
  const raw = await readPostFile(slug, locale);
  if (raw === null) return null;
  return toPost(slug, raw);
}

export async function getAllSlugs(): Promise<string[]> {
  // Slugs are derived from English files only (canonical set).
  const posts = await getAllPosts('en');
  return posts.map((p) => p.slug);
}
