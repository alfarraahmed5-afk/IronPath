// MDX content collection helper for the blog.
// Posts live in `marketing/content/blog/*.mdx` with YAML-ish frontmatter
// delimited by `---`. We parse frontmatter manually (key: "value" pairs)
// to avoid pulling gray-matter into the dependency tree.

import { promises as fs } from 'node:fs';
import path from 'node:path';

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
  const stripped = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ');
  const words = stripped.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 225));
}

function toPost(filename: string, raw: string): Post {
  const { data, body } = parseFrontmatter(raw);
  const slug = filename.replace(/\.mdx?$/, '');
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

export async function getAllPosts(): Promise<PostMeta[]> {
  let entries: string[] = [];
  try {
    entries = await fs.readdir(BLOG_DIR);
  } catch {
    return [];
  }
  const files = entries.filter((f) => f.endsWith('.mdx'));
  const posts = await Promise.all(
    files.map(async (f) => {
      const raw = await fs.readFile(path.join(BLOG_DIR, f), 'utf8');
      const { content: _content, ...meta } = toPost(f, raw);
      return meta;
    }),
  );
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const filename = `${slug}.mdx`;
  try {
    const raw = await fs.readFile(path.join(BLOG_DIR, filename), 'utf8');
    return toPost(filename, raw);
  } catch {
    return null;
  }
}

export async function getAllSlugs(): Promise<string[]> {
  const posts = await getAllPosts();
  return posts.map((p) => p.slug);
}
