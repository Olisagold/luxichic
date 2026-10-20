import type { Metadata } from 'next';

/** Installing from any admin page gives the "LUXICHIC Admin" app (its own manifest) instead of the shop. */
export const metadata: Metadata = {
  manifest: '/admin.webmanifest',
  appleWebApp: { capable: true, title: 'LUXICHIC Admin', statusBarStyle: 'black' },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
