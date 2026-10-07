import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'LUXICHIC — Hairs, Salon & Tools',
    template: '%s | LUXICHIC',
  },
  description: 'Premium wigs and human hair, professional hair tools and a luxury beauty salon & spa.',
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
