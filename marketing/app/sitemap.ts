import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/blog';

const SITE = 'https://ironpath.health';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`,           lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE}/pricing`,    lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE}/eg`,         lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE}/for-gyms`,   lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/roadmap`,    lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${SITE}/blog`,       lastModified: now, changeFrequency: 'daily',   priority: 0.7 },
    { url: `${SITE}/privacy`,    lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${SITE}/terms`,      lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ];

  const posts = await getAllPosts();
  const blogRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...blogRoutes];
}
