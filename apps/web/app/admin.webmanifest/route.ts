import { headers } from 'next/headers';
import { ADMIN_GATE_HEADER } from '@/lib/auth/admin-gate';
import { env } from '@/lib/env';
import { appIcons } from '@/lib/pwa/icons';

/**
 * The admin as its own installable app ("LUXICHIC Admin"), opening straight into the dashboard, so staff get
 * their alerts as phone notifications. Linked from the admin pages (app/admin/layout.tsx).
 */
export async function GET() {
  // With a secret admin address, this file is only served there and opens the app at that address.
  const secret = env.ADMIN_PATH;
  if (secret && (await headers()).get(ADMIN_GATE_HEADER) !== '1') return new Response('Not found', { status: 404 });
  return Response.json(
    {
      id: '/admin',
      name: 'LUXICHIC Admin',
      short_name: 'LUXICHIC Admin',
      start_url: secret ? `/${secret}` : '/admin',
      scope: '/',
      display: 'standalone',
      background_color: '#0A0A0A',
      theme_color: '#0A0A0A',
      icons: appIcons,
    },
    { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' } },
  );
}
