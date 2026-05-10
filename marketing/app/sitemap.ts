// Sitemap generator with full hreflang alternate emission.
//
// Every static route exists in two locales (EN canonical at the root path,
// AR mirror at /ar/<path>). Each entry emits an `alternates.languages`
// block so Google's MENA SERPs can route Arabic queries to the AR page
// and international queries to the EN page. `x-default` points at EN per
// the i18n architect's spec.
//
// Next's MetadataRoute.Sitemap serializes `alternates.languages` into the
// `xhtml:link rel="alternate" hreflang="..."` form Google expects, so we
// don't need to hand-roll the XML.

import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/blog';

const SITE = 'https://ironpath.health';

// All routes that exist in both locales. The string is the EN canonical
// path; the AR mirror is computed as `/ar${path}` (with `/` mapping to `/ar`).
interface RouteSpec {
  path: string; // EN canonical (e.g. '/pricing', '/' for home)
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}

const ROUTES: RouteSpec[] = [
  { path: '/',         changeFrequency: 'weekly',  priority: 1.0 },
  { path: '/pricing',  changeFrequency: 'monthly', priority: 0.9 },
  { path: '/start',    changeFrequency: 'monthly', priority: 0.9 },
  { path: '/eg',       changeFrequency: 'monthly', priority: 0.9 },
  { path: '/for-gyms', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/roadmap',  changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/blog',     changeFrequency: 'daily',   priority: 0.7 },
  { path: '/privacy',  changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/terms',    changeFrequency: 'yearly',  priority: 0.3 },
];

function arPath(enPath: string): string {
  if (enPath === '/') return '/ar';
  return `/ar${enPath}`;
}

function buildAlternates(enPath: string): {
  alternates: { languages: Record<string, string> };
} {
  const enUrl = `${SITE}${enPath}`;
  const arUrl = `${SITE}${arPath(enPath)}`;
  return {
    alternates: {
      languages: {
        en: enUrl,
        'ar-EG': arUrl,
        // x-default tells Google which locale to surface for untargeted
        // queries. Per the i18n architect's spec, the international EN
        // page is the default.
        'x-default': enUrl,
      },
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Each EN route emits TWO sitemap entries (EN + AR), each with the same
  // alternates block. Google deduplicates and follows the alternates to
  // build the rel="alternate" graph; emitting both URLs ensures discovery
  // even if a crawler enters via the AR URL first.
  const staticRoutes: MetadataRoute.Sitemap = [];
  for (const r of ROUTES) {
    const alts = buildAlternates(r.path);
    staticRoutes.push({
      url: `${SITE}${r.path}`,
      lastModified: now,
      changeFrequency: r.changeFrequency,
      priority: r.priority,
      ...alts,
    });
    staticRoutes.push({
      url: `${SITE}${arPath(r.path)}`,
      lastModified: now,
      changeFrequency: r.changeFrequency,
      // AR variants get a slightly lower priority than the EN canonical
      // (the EN URL is the canonical reference for SERPs that don't
      // target a locale).
      priority: Math.max(0.1, r.priority - 0.1),
      ...alts,
    });
  }

  // Blog posts -- AR mirrors share the same slug; the AR body falls back
  // to the EN MDX when no <slug>.ar.mdx exists, but the URL still resolves
  // so the alternate link remains valid.
  const posts = await getAllPosts();
  const blogRoutes: MetadataRoute.Sitemap = [];
  for (const p of posts) {
    const enPath = `/blog/${p.slug}`;
    const alts = buildAlternates(enPath);
    blogRoutes.push({
      url: `${SITE}${enPath}`,
      lastModified: new Date(p.date),
      changeFrequency: 'monthly',
      priority: 0.6,
      ...alts,
    });
    blogRoutes.push({
      url: `${SITE}${arPath(enPath)}`,
      lastModified: new Date(p.date),
      changeFrequency: 'monthly',
      priority: 0.5,
      ...alts,
    });
  }

  return [...staticRoutes, ...blogRoutes];
}
