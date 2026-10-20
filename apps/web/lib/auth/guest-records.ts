import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import type { User as AuthUser } from '@supabase/supabase-js';
import { db } from '@/db';
import { addresses, appointments, orders, profiles } from '@/db/schema';
import { env } from '@/lib/env';

/**
 * Guest orders and appointments join the customer's account once they've proven they own the email they were
 * made with. Then their delivery addresses become saved addresses and their phone fills an empty profile.
 *
 * Proof is one of:
 * - a Google sign-in for that address (Google verified it);
 * - an email + password sign-up whose Supabase confirmation email was clicked (once "Confirm email" is on);
 * - our own confirmation link (`verifyToken`), sent when an account is created for an email with guest records.
 * Without proof anyone could sign up with someone else's address and read their orders, so nothing is linked.
 */

export function hasVerifiedEmail(user: AuthUser): boolean {
  const email = user.email?.toLowerCase();
  if (!email) return false;
  // Our confirmation link, for this exact address (an email change needs confirming again).
  if (String(user.app_metadata?.verified_email ?? '').toLowerCase() === email) return true;
  const google = user.identities?.some(
    (i) =>
      i.provider === 'google' &&
      i.identity_data?.email_verified === true &&
      String(i.identity_data?.email ?? '').toLowerCase() === email,
  );
  if (google) return true;
  // While "Confirm email" is off, Supabase marks accounts confirmed without sending anything (no
  // `confirmation_sent_at`), so only a confirmation that was actually sent counts.
  const sent = user.confirmation_sent_at;
  const confirmed = user.email_confirmed_at;
  return !!sent && !!confirmed && new Date(confirmed) >= new Date(sent);
}

const byEmail = (column: typeof orders.customerEmail | typeof appointments.customerEmail, email: string) =>
  sql`lower(${column}) = lower(${email})`;

/** How many guest orders and appointments were made with this email and aren't in an account yet. */
export async function countGuestRecords(email: string): Promise<{ orders: number; appointments: number }> {
  const [o] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(isNull(orders.userId), byEmail(orders.customerEmail, email)));
  const [a] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(appointments)
    .where(and(isNull(appointments.userId), byEmail(appointments.customerEmail, email)));
  return { orders: Number(o?.n ?? 0), appointments: Number(a?.n ?? 0) };
}

/**
 * Moves guest orders and appointments made with the customer's email into their account, once that email is
 * verified, and saves their details. Runs at every sign-in, so anything placed while signed out joins the
 * account the next time. `user` must have a customer profile. Returns how many were added.
 */
export async function linkGuestRecords(user: AuthUser): Promise<{ orders: number; appointments: number }> {
  const none = { orders: 0, appointments: 0 };
  if (!user.email || !hasVerifiedEmail(user)) return none;
  const email = user.email;
  return db.transaction(async (tx) => {
    const linked = await tx
      .update(orders)
      .set({ userId: user.id, updatedAt: new Date() })
      .where(and(isNull(orders.userId), byEmail(orders.customerEmail, email)))
      .returning();
    const booked = await tx
      .update(appointments)
      .set({ userId: user.id, updatedAt: new Date() })
      .where(and(isNull(appointments.userId), byEmail(appointments.customerEmail, email)))
      .returning({ id: appointments.id, phone: appointments.customerPhone });
    if (!linked.length && !booked.length) return none;

    // Delivery addresses from those orders become saved addresses (newest first, no duplicates).
    const saved = await tx
      .select()
      .from(addresses)
      .where(eq(addresses.userId, user.id))
      .orderBy(asc(addresses.createdAt));
    const key = (a: { state: string; city: string; street: string; houseNumber: string | null }) =>
      [a.state, a.city, a.street, a.houseNumber ?? ''].map((x) => x.trim().toLowerCase()).join('|');
    const known = new Set(saved.map(key));
    let hasDefault = saved.some((a) => a.isDefault);
    for (const o of [...linked].sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime())) {
      const address = { state: o.shipState, city: o.shipCity, street: o.shipStreet, houseNumber: o.shipHouseNumber };
      if (known.has(key(address))) continue;
      known.add(key(address));
      await tx.insert(addresses).values({
        userId: user.id,
        label: 'From an earlier order',
        country: o.shipCountry,
        ...address,
        landmark: o.shipLandmark,
        instructions: o.shipInstructions,
        isDefault: !hasDefault,
      });
      hasDefault = true;
    }

    // The phone they gave, if the profile has none.
    const [profile] = await tx.select({ phone: profiles.phone }).from(profiles).where(eq(profiles.id, user.id));
    if (profile && !profile.phone) {
      const [latest] = await tx
        .select({ phone: orders.customerPhone })
        .from(orders)
        .where(eq(orders.userId, user.id))
        .orderBy(desc(orders.createdAt))
        .limit(1);
      const phone = latest?.phone || booked.find((b) => b.phone)?.phone;
      if (phone) await tx.update(profiles).set({ phone, updatedAt: new Date() }).where(eq(profiles.id, user.id));
    }
    return { orders: linked.length, appointments: booked.length };
  });
}

/* ------------------------------------------------------------------ */
/* Our confirmation link                                               */
/* ------------------------------------------------------------------ */

const DAY = 86_400_000;
const sign = (payload: string) =>
  createHmac('sha256', env.SUPABASE_SECRET_KEY ?? '')
    .update(payload)
    .digest('base64url');

/** A signed link token proving whoever opens it received email at `email` (valid 3 days). */
export function verifyToken(userId: string, email: string): string {
  const payload = Buffer.from(JSON.stringify({ u: userId, e: email.toLowerCase(), x: Date.now() + 3 * DAY })).toString(
    'base64url',
  );
  return `${payload}.${sign(payload)}`;
}

/** The email the token was issued for, if it's genuine, unexpired and for this user. */
export function checkVerifyToken(token: string, userId: string): string | null {
  const [payload, signature] = String(token ?? '').split('.');
  if (!payload || !signature || !env.SUPABASE_SECRET_KEY) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { u: string; e: string; x: number };
    return data.u === userId && data.x > Date.now() ? data.e : null;
  } catch {
    return null;
  }
}
