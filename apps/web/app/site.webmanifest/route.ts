import { appIcons } from '@/lib/pwa/icons';

/**
 * The shop as an installable app ("Add to Home Screen"); installed, it can show order and booking notifications.
 * Linked from the root layout; admin pages link /admin.webmanifest instead.
 */
export function GET() {
  return Response.json(
    {
      id: '/',
      name: 'LUXICHIC — Hairs, Salon & Tools',
      short_name: 'LUXICHIC',
      description: 'Premium wigs and human hair, professional hair tools and a luxury beauty salon & spa.',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#0A0A0A',
      theme_color: '#0A0A0A',
      icons: appIcons,
    },
    { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' } },
  );
}
