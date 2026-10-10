import type { MetadataRoute } from 'next';
import { getStorefrontData } from '@/lib/storefront/data';
import { absoluteUrl } from '@/lib/seo/site';

/** /sitemap.xml: every public page, rebuilt with the storefront cache. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getStorefrontData();
  const page = (path: string, priority: number, lastModified?: string) => ({
    url: absoluteUrl(path),
    priority,
    ...(lastModified ? { lastModified } : {}),
  });
  return [
    page('/', 1),
    page('/hairs', 0.9),
    page('/tools', 0.9),
    page('/salon', 0.9),
    page('/salon/services', 0.8),
    page('/salon/book', 0.7),
    page('/about', 0.5),
    page('/contact', 0.5),
    page('/faq', 0.5),
    page('/track-order', 0.3),
    ...(['hairs', 'tools'] as const).flatMap((d) => data.categories[d].map((c) => page(`/${d}/shop/${c.slug}`, 0.7))),
    ...data.products.map((p) => page(`/${p.division}/product/${p.slug}`, 0.8, p.createdAt)),
    ...data.services.map((s) => page(`/salon/services/${s.slug}`, 0.7)),
    ...Object.keys(data.content.policies).map((slug) => page(`/policies/${slug}`, 0.3)),
  ];
}
