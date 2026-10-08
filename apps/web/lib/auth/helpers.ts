import 'server-only';
import { headers } from 'next/headers';
import { createClient as createStatelessClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured, requireEnv } from '@/lib/env';
import type { Result } from '@/types/user';

export const NOT_CONFIGURED: Result = {
  ok: false,
  error: 'Sign-in is not available right now. Please try again later.',
};

/** Sign-in needs both Supabase Auth and the database (profiles, admins). */
export function authReady(): boolean {
  return isSupabaseConfigured && !!env.DATABASE_URL;
}

/** The address this request came in on (works for localhost, Vercel previews and production). */
export async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (host) {
    const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
    return `${proto}://${host}`;
  }
  return env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

/** Turns Supabase Auth errors into messages a customer can act on. */
export function authErrorMessage(
  error: { code?: string } | null | undefined,
  fallback = 'Something went wrong.',
): string {
  switch (error?.code) {
    case 'invalid_credentials':
      return 'The email or password you entered is incorrect.';
    case 'email_not_confirmed':
      return 'Please confirm your email address first. Check your inbox for the link.';
    case 'user_already_exists':
    case 'email_exists':
      return 'An account with this email already exists. Please sign in instead.';
    case 'weak_password':
      return 'Please choose a stronger password: at least 8 characters with letters and numbers.';
    case 'same_password':
      return 'Your new password must be different from your current one.';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'user_banned':
      return 'This account has been suspended. Please contact LUXICHIC for help.';
    default:
      return fallback;
  }
}

/** Checks an email + password without touching the visitor's session cookies (e.g. "current password"). */
export async function passwordMatches(email: string, password: string): Promise<boolean> {
  const client = createStatelessClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) return false;
  // Revoke only this throwaway session.
  await client.auth.signOut({ scope: 'local' });
  return true;
}
