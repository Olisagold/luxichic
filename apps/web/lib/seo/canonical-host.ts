/**
 * The live site answers on its own domain only: page visits to a `*.vercel.app` address of the production
 * deployment move to the same path on NEXT_PUBLIC_SITE_URL, so search engines see one copy of the shop. Previews
 * stay where they are, and so do `/api/*` (cron jobs, the Telegram webhook) and anything but GET/HEAD (a form
 * submitted from a tab still open on the old address).
 */
export function canonicalRedirect(
  url: URL,
  method: string,
  siteUrl: string,
  vercelEnv: string | undefined,
): URL | null {
  if (vercelEnv !== 'production' || (method !== 'GET' && method !== 'HEAD')) return null;
  const site = new URL(siteUrl);
  if (url.hostname === site.hostname || !url.hostname.endsWith('.vercel.app')) return null;
  if (url.pathname.startsWith('/api/')) return null;
  return new URL(url.pathname + url.search, site.origin);
}
