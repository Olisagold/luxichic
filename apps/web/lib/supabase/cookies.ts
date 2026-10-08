import type { CookieOptions } from '@supabase/ssr';

/** Set to "0" when someone signs in without "Remember me"; their session then ends with the browser. */
export const REMEMBER_COOKIE = 'lx_remember';

/** Drops the expiry from Supabase's session cookies when the visitor chose not to be remembered. */
export function sessionCookieOptions(options: CookieOptions, remember: boolean): CookieOptions {
  if (remember) return options;
  // A maxAge of 0 deletes the cookie (sign-out); keep that.
  if (options.maxAge === 0) return options;
  const { maxAge: _maxAge, expires: _expires, ...rest } = options;
  return rest;
}
