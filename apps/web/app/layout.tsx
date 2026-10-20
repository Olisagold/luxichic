import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Manrope } from 'next/font/google';
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
  // Installed on an iPhone home screen it opens like an app (needed there for notifications).
  manifest: '/site.webmanifest',
  appleWebApp: { capable: true, title: 'LUXICHIC', statusBarStyle: 'black' },
};

export const viewport: Viewport = { themeColor: '#0A0A0A' };

// Served from our own domain and preloaded (no request to Google, nothing blocking the first paint).
const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-display',
});
const sans = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], display: 'swap', variable: '--font-sans' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <Providers>{children}</Providers>
        {/* Page views and Web Vitals; only reports on Vercel deployments. */}
        <Analytics />
      </body>
    </html>
  );
}
