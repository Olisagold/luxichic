import type { Metadata } from 'next';
import { env } from '@/lib/env';

/**
 * Installing from any admin page gives the "LUXICHIC Admin" app (its own manifest) instead of the shop. With a
 * secret admin address the manifest lives there too, so it never reveals the address. Never in search results.
 */
export function generateMetadata(): Metadata {
  return {
    manifest: env.ADMIN_PATH ? `/${env.ADMIN_PATH}/app.webmanifest` : '/admin.webmanifest',
    appleWebApp: { capable: true, title: 'LUXICHIC Admin', statusBarStyle: 'black' },
    robots: { index: false, follow: false },
  };
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
