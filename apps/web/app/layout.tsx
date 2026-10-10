import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { siteUrl } from '@/lib/seo/site';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'LUXICHIC — Hairs, Salon & Tools',
    template: '%s | LUXICHIC',
  },
  description: 'Premium wigs and human hair, professional hair tools and a luxury beauty salon & spa.',
  openGraph: { siteName: 'LUXICHIC', type: 'website', locale: 'en_NG' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        {/* Page views and Web Vitals; only reports on Vercel deployments. */}
        <Analytics />
      </body>
    </html>
  );
}
