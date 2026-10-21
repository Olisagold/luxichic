import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_GATE_HEADER, adminGate } from '@/lib/auth/admin-gate';
import { env, isSupabaseConfigured } from '@/lib/env';
import { canonicalRedirect } from '@/lib/seo/canonical-host';
import { REMEMBER_COOKIE, sessionCookieOptions } from '@/lib/supabase/cookies';

export async function middleware(request: NextRequest) {
  const canonical = canonicalRedirect(
    request.nextUrl,
    request.method,
    env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_ENV,
  );
  if (canonical) return NextResponse.redirect(canonical, 308);

  const signedIn = request.cookies.getAll().some((c) => c.name.startsWith('sb-'));
  // The admin's secret address: rewritten to /admin with a marker only this code can set; /admin itself looks
  // like a missing page to anyone not signed in (lib/auth/admin-gate.ts).
  const gate = adminGate(request.nextUrl.pathname, env.ADMIN_PATH, signedIn);
  if (gate.kind === 'hide') return NextResponse.rewrite(new URL('/__not-found', request.url));
  const respond = () => {
    const headers = new Headers(request.headers);
    headers.delete(ADMIN_GATE_HEADER);
    if (gate.kind !== 'rewrite') return NextResponse.next({ request: { headers } });
    headers.set(ADMIN_GATE_HEADER, '1');
    return NextResponse.rewrite(new URL(gate.to + request.nextUrl.search, request.url), { request: { headers } });
  };
  let response = respond();

  // Without Supabase settings (e.g. a fresh clone) the site still renders; sign-in shows an error.
  if (!isSupabaseConfigured) {
    return response;
  }

  // Signed-out visitors have no session to refresh, so skip the round trip to Supabase.
  if (!signedIn) {
    // Private areas go straight to sign-in, keeping the page they asked for. The layouts check real sessions.
    const { pathname, search } = request.nextUrl;
    const wanted = encodeURIComponent(pathname + search);
    if (pathname === '/account' || pathname.startsWith('/account/')) {
      return NextResponse.redirect(new URL(`/login?redirect=${wanted}`, request.url));
    }
    // Without a secret address: `/admin` and pages under it go to sign-in (not `/admin.webmanifest`, the admin
    // app file, fetched without cookies).
    if (!env.ADMIN_PATH && (pathname === '/admin' || pathname.startsWith('/admin/')) && pathname !== '/admin/login') {
      return NextResponse.redirect(new URL(`/admin/login?next=${wanted}`, request.url));
    }
    return response;
  }

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        const remember = request.cookies.get(REMEMBER_COOKIE)?.value !== '0';
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = respond();
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, sessionCookieOptions(options, remember)),
        );
      },
    },
  });

  // Refreshes the auth session if expired.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
