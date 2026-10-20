import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';
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
      // With a secret admin address, /admin isn't listed: robots.txt is public, and naming it would point to it.
      // Admin pages say "noindex" themselves (app/admin/layout.tsx).
      disallow: [
        ...(env.ADMIN_PATH ? [] : ['/admin']),
        '/account',
        '/cart',
        '/checkout',
        '/wishlist',
        '/order/',
        '/auth/',
        '/api/',
        '/search',
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
