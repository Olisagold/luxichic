import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';

/** Only same-site paths, never `//evil.com`. */
function safeNext(value: string | null, fallback = '/account'): string {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : fallback;
}

/**
 * Where Google sign-in and every Supabase email link (confirm sign-up, reset password, change email) land.
 * Supports both link styles: `?code=` (PKCE, same browser) and `?token_hash=&type=` (works on any device).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const next = safeNext(url.searchParams.get('next'), type === 'recovery' ? '/reset-password' : '/account');
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, url.origin));

  const supabase = await createClient();
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');

  let userId: string | undefined;
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail(next === '/reset-password' ? 'reset_link' : 'link');
    userId = data.user?.id;
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return fail(type === 'recovery' ? 'reset_link' : 'link');
    userId = data.user?.id;
  } else {
    // Expired or already-used email links come back as ?error_code=otp_expired; Google sends ?error=… on cancel.
    const errorCode = url.searchParams.get('error_code');
    if (errorCode === 'otp_expired' || !url.searchParams.has('error')) {
      return fail(next === '/reset-password' ? 'reset_link' : 'link');
    }
    return fail('cancelled');
  }

  if (userId && !next.startsWith('/admin')) {
    const [profile] = await db.select({ status: profiles.status }).from(profiles).where(eq(profiles.id, userId));
    if (profile?.status === 'blocked') {
      await supabase.auth.signOut();
      return fail('suspended');
    }
    if (profile) await db.update(profiles).set({ lastActiveAt: new Date() }).where(eq(profiles.id, userId));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
