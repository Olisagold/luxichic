import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo/site';

/** /robots.txt: private areas stay out of search results; preview deployments aren't indexed at all. */
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/account', '/cart', '/checkout', '/wishlist', '/order/', '/auth/', '/api/', '/search'],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
