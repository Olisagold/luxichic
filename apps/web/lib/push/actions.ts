'use server';

import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { z } from 'zod';
import { db } from '@/db';
import * as s from '@/db/schema';
import { getAdmin, getCustomer } from '@/lib/auth/session';
import { pushConfigured, sendPush } from '@/lib/push/send';
import type { Result } from '@/types/user';

/**
 * Turning phone notifications on or off for this device. `audience` says whose alerts it gets: the signed-in
 * admin's (same as their bell) or the signed-in customer's (their order and appointment updates).
 */

export type PushAudience = 'admin' | 'customer';

const subscriptionSchema = z.object({
  endpoint: z
    .string()
    .url()
    .max(1000)
    .refine((u) => u.startsWith('https://'), 'Not a push address.'),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
});

async function owner(audience: PushAudience) {
  if (audience === 'admin') {
    const admin = await getAdmin();
    return admin ? { adminId: admin.id, userId: null } : null;
  }
  const customer = await getCustomer();
  return customer ? { adminId: null, userId: customer.id } : null;
}

export async function savePushSubscription(input: unknown, audience: PushAudience): Promise<Result> {
  if (!pushConfigured()) return { ok: false, error: 'Notifications aren’t set up on the server yet.' };
  const who = await owner(audience);
  if (!who) return { ok: false, error: 'Please sign in first.' };
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'This browser gave an invalid subscription. Please try again.' };
  const { endpoint, keys } = parsed.data;
  const userAgent = (await headers()).get('user-agent')?.slice(0, 300) ?? null;
  // One row per device: signing in as someone else on it moves the device to them.
  await db
    .insert(s.pushSubscriptions)
    .values({ endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent, ...who })
    .onConflictDoUpdate({
      target: s.pushSubscriptions.endpoint,
      set: { p256dh: keys.p256dh, auth: keys.auth, userAgent, ...who },
    });
  return { ok: true };
}

export async function deletePushSubscription(endpoint: string, audience: PushAudience): Promise<Result> {
  const who = await owner(audience);
  if (!who || typeof endpoint !== 'string') return { ok: true };
  const mine = who.adminId ? eq(s.pushSubscriptions.adminId, who.adminId) : eq(s.pushSubscriptions.userId, who.userId!);
  await db.delete(s.pushSubscriptions).where(and(eq(s.pushSubscriptions.endpoint, endpoint), mine));
  return { ok: true };
}

/** A test notification to this device. */
export async function sendTestPush(endpoint: string, audience: PushAudience): Promise<Result> {
  const who = await owner(audience);
  if (!who) return { ok: false, error: 'Please sign in first.' };
  const [sub] = await db
    .select()
    .from(s.pushSubscriptions)
    .where(eq(s.pushSubscriptions.endpoint, String(endpoint)));
  if (!sub || (who.adminId ? sub.adminId !== who.adminId : sub.userId !== who.userId)) {
    return { ok: false, error: 'Turn notifications on first.' };
  }
  const delivered = await sendPush([sub], {
    title: 'LUXICHIC notifications are on',
    body:
      audience === 'admin'
        ? 'You’ll get the same alerts as your bell on this device.'
        : 'You’ll get updates about your orders and appointments here.',
    url: audience === 'admin' ? '/admin/notifications' : '/account',
    tag: 'test',
  });
  return delivered
    ? { ok: true }
    : { ok: false, error: 'The test couldn’t be delivered. Turn notifications off and on again.' };
}
