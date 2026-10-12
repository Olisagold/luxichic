import 'server-only';
import { and, isNull, sql } from 'drizzle-orm';
import type { User as AuthUser } from '@supabase/supabase-js';
import { db } from '@/db';
import { appointments, orders } from '@/db/schema';

/**
 * Whether the account has proven it owns its email address:
 * - a Google sign-in for that address (Google verified it), or
 * - an email + password sign-up whose confirmation email was sent and then clicked.
 *
 * While "Confirm email" is off on a project, Supabase marks new accounts confirmed without sending anything
 * (no `confirmation_sent_at`), so those don't count: anyone could sign up with someone else's address.
 */
export function hasVerifiedEmail(user: AuthUser): boolean {
  const email = user.email?.toLowerCase();
  if (!email) return false;
  const google = user.identities?.some(
    (i) =>
      i.provider === 'google' &&
      i.identity_data?.email_verified === true &&
      String(i.identity_data?.email ?? '').toLowerCase() === email,
  );
  if (google) return true;
  const sent = user.confirmation_sent_at;
  const confirmed = user.email_confirmed_at;
  return !!sent && !!confirmed && new Date(confirmed) >= new Date(sent);
}

/**
 * Moves guest orders and appointments made with the customer's email into their account, once that email is
 * verified. Runs at every sign-in, so anything placed while signed out joins the account the next time. `user`
 * must have a customer profile.
 */
export async function linkGuestRecords(user: AuthUser): Promise<void> {
  if (!hasVerifiedEmail(user)) return;
  await db
    .update(orders)
    .set({ userId: user.id, updatedAt: new Date() })
    .where(and(isNull(orders.userId), sql`lower(${orders.customerEmail}) = lower(${user.email})`));
  await db
    .update(appointments)
    .set({ userId: user.id, updatedAt: new Date() })
    .where(and(isNull(appointments.userId), sql`lower(${appointments.customerEmail}) = lower(${user.email})`));
}
