import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env, isSupabaseConfigured } from '@/lib/env';
import { REMEMBER_COOKIE, sessionCookieOptions } from '@/lib/supabase/cookies';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Without Supabase settings (e.g. a fresh clone) the site still renders; sign-in shows an error.
  if (!isSupabaseConfigured) {
    return response;
  }

  // Signed-out visitors have no session to refresh, so skip the round trip to Supabase.
  if (!request.cookies.getAll().some((c) => c.name.startsWith('sb-'))) {
    // Private areas go straight to sign-in, keeping the page they asked for. The layouts check real sessions.
    const { pathname, search } = request.nextUrl;
    const wanted = encodeURIComponent(pathname + search);
    if (pathname === '/account' || pathname.startsWith('/account/')) {
      return NextResponse.redirect(new URL(`/login?redirect=${wanted}`, request.url));
    }
    if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
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
        response = NextResponse.next({ request });
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
