/**
 * The admin's secret address. When ADMIN_PATH is set (e.g. `staff-k7x2m9`, kept only in the hosting environment,
 * never in the code), the admin is reached at `/<ADMIN_PATH>` and plain `/admin` looks like any missing page to
 * anyone not signed in: no sign-in form for bots to find. Signed-in staff use `/admin/...` as before (the layout
 * still checks they're an admin). Without ADMIN_PATH (local development, tests) `/admin` works as usual.
 *
 * Edge-safe (used by middleware): no Node or server-only imports.
 */

/** Set by middleware on requests that came through the secret address; stripped from every incoming request. */
export const ADMIN_GATE_HEADER = 'x-luxichic-admin-gate';

export type GateDecision = { kind: 'pass' } | { kind: 'rewrite'; to: string } | { kind: 'hide' };

const isAdminRoute = (p: string) => p === '/admin' || p.startsWith('/admin/') || p === '/admin.webmanifest';

export function adminGate(pathname: string, secret: string | null | undefined, signedIn: boolean): GateDecision {
  if (!secret) return { kind: 'pass' };
  const base = `/${secret}`;
  if (pathname === base || pathname === `${base}/` || pathname.startsWith(`${base}/`)) {
    const rest = pathname.slice(base.length).replace(/\/$/, '');
    if (rest === '') return { kind: 'rewrite', to: '/admin/login' };
    if (rest === '/app.webmanifest') return { kind: 'rewrite', to: '/admin.webmanifest' };
    return { kind: 'rewrite', to: `/admin${rest}` };
  }
  if (!isAdminRoute(pathname)) return { kind: 'pass' };
  // The sign-in page and the admin app file are only reachable through the secret address.
  if (pathname === '/admin/login' || pathname === '/admin.webmanifest') return { kind: 'hide' };
  return signedIn ? { kind: 'pass' } : { kind: 'hide' };
}

/** Where staff sign in: the secret address when one is set. */
export const adminLoginPath = (secret: string | null | undefined) => (secret ? `/${secret}` : '/admin/login');
