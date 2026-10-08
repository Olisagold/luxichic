'use server';

import { cookies, headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { admins, auditLogs, loginHistory } from '@/db/schema';
import { authErrorMessage, authReady, NOT_CONFIGURED, passwordMatches } from '@/lib/auth/helpers';
import { getAdmin } from '@/lib/auth/session';
import { REMEMBER_COOKIE } from '@/lib/supabase/cookies';
import { createClient } from '@/lib/supabase/server';
import { isValidEmail, passwordError } from '@/lib/utils/validation';
import type { Result } from '@/types/user';

const WRONG = 'Incorrect email or password.';

function describeDevice(ua: string) {
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Safari\//.test(ua)
        ? 'Safari'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : 'Browser';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /iPhone|iPad/.test(ua)
      ? 'iOS'
      : /Android/.test(ua)
        ? 'Android'
        : /Mac OS/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'Unknown OS';
  const kind = /Mobi|iPhone|Android/.test(ua) ? 'Mobile' : 'Desktop';
  return { browser, device: `${os} · ${kind}` };
}

/** Vercel adds the visitor's approximate location; locally there is none. */
function describeLocation(h: Headers): string | null {
  const city = h.get('x-vercel-ip-city');
  const country = h.get('x-vercel-ip-country');
  const parts = [city && decodeURIComponent(city), country].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

export async function adminSignIn(email: string, password: string, remember: boolean): Promise<Result> {
  if (!authReady()) return NOT_CONFIGURED;
  if (!isValidEmail(email) || !password) return { ok: false, error: WRONG };

  const store = await cookies();
  store.set(REMEMBER_COOKIE, remember ? '1' : '0', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(remember ? { maxAge: 60 * 60 * 24 * 400 } : {}),
  });

  const supabase = await createClient({ remember });
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user) {
    return { ok: false, error: error?.code === 'invalid_credentials' ? WRONG : authErrorMessage(error, WRONG) };
  }

  const [admin] = await db.select().from(admins).where(eq(admins.id, data.user.id));
  if (!admin || admin.status !== 'active') {
    await supabase.auth.signOut();
    // Customers get the same message as a wrong password, so the form doesn't reveal who is staff.
    return {
      ok: false,
      error: admin ? 'This administrator account is suspended. Contact the main administrator.' : WRONG,
    };
  }

  const h = await headers();
  const { browser, device } = describeDevice(h.get('user-agent') ?? '');
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(admins).set({ lastLoginAt: now }).where(eq(admins.id, admin.id));
    await tx
      .insert(loginHistory)
      .values({ adminId: admin.id, browser, device, location: describeLocation(h), ipAddress: ip, at: now });
    await tx.insert(auditLogs).values({
      adminId: admin.id,
      adminName: admin.fullName,
      section: 'Security',
      action: 'Signed in',
      target: `${browser} · ${device}`,
    });
  });
  return { ok: true };
}

export async function adminSignOut(): Promise<void> {
  if (!authReady()) return;
  const admin = await getAdmin();
  if (admin) {
    await db
      .insert(auditLogs)
      .values({ adminId: admin.id, adminName: admin.fullName, section: 'Security', action: 'Signed out' });
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(REMEMBER_COOKIE);
}

export async function adminChangePassword(current: string, next: string): Promise<Result> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: 'Not signed in.' };
  const pw = passwordError(next);
  if (pw) return { ok: false, error: pw };
  if (!(await passwordMatches(admin.email, current))) {
    return { ok: false, error: 'Your current password is incorrect.' };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { ok: false, error: authErrorMessage(error, 'Could not update password.') };
  await db
    .insert(auditLogs)
    .values({ adminId: admin.id, adminName: admin.fullName, section: 'Security', action: 'Changed password' });
  return { ok: true };
}
