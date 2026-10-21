import 'server-only';
import { after } from 'next/server';
import { eq } from 'drizzle-orm';
import type { User } from '@supabase/supabase-js';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { linkGuestRecords } from '@/lib/auth/guest-records';
import { emailWelcomeOnce } from '@/lib/email/customer';

/**
 * What follows a customer's Google sign-in or a click on an email link (/auth/callback, and Google's own button
 * through `finishGoogleSignIn`): a suspended customer is turned away (the caller signs them out), the visit is
 * noted, earlier guest orders and appointments join the account, and a new account gets the welcome email once.
 * Admin logins have no customer profile, so nothing happens for them.
 */
export async function afterCustomerSignIn(user: User): Promise<{ suspended: boolean }> {
  const [profile] = await db
    .select({ status: profiles.status, createdAt: profiles.createdAt })
    .from(profiles)
    .where(eq(profiles.id, user.id));
  if (!profile) return { suspended: false };
  if (profile.status === 'blocked') return { suspended: true };

  await db.update(profiles).set({ lastActiveAt: new Date() }).where(eq(profiles.id, user.id));
  // Google sign-in and confirmed sign-ups prove the email, so earlier guest orders and appointments join the account.
  await linkGuestRecords(user);
  // A new account (Google's first sign-in, or a confirmed sign-up) gets the welcome email once.
  const id = user.id;
  if (!user.app_metadata?.welcomed && Date.now() - profile.createdAt.getTime() < 86_400_000) {
    after(() => emailWelcomeOnce(id));
  }
  return { suspended: false };
}
