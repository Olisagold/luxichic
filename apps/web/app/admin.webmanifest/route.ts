import { appIcons } from '@/lib/pwa/icons';

/**
 * The admin as its own installable app ("LUXICHIC Admin"), opening straight into the dashboard, so staff get
 * their alerts as phone notifications. Linked from the admin pages (app/admin/layout.tsx).
 */
export function GET() {
  return Response.json(
    {
      id: '/admin',
      name: 'LUXICHIC Admin',
      short_name: 'LUXICHIC Admin',
      start_url: '/admin',
      scope: '/admin',
      display: 'standalone',
      background_color: '#0A0A0A',
      theme_color: '#0A0A0A',
      icons: appIcons,
    },
    { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' } },
  );
}
