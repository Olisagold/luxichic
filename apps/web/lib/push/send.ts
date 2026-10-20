import 'server-only';
import { eq, inArray, isNotNull, sql } from 'drizzle-orm';
import webpush from 'web-push';
import { db } from '@/db';
import * as s from '@/db/schema';
import { env } from '@/lib/env';
import { listAdmins } from '@/lib/admins/admin-queries';
import { canSee } from '@/lib/notifications/for-admin';

/**
 * Phone notifications (web push) for the installed apps. Admins get exactly what their bell shows; customers
 * get their order and appointment updates. Without the VAPID keys nothing is sent. A subscription the push
 * service reports as gone (404/410) is deleted.
 */

export interface PushMessage {
  title: string;
  body: string;
  /** The page to open when the notification is tapped. */
  url: string;
  /** Replaces an earlier notification with the same tag on the device. */
  tag?: string;
}

export const pushConfigured = () => !!(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);

let ready = false;
function setup() {
  if (!ready) {
    webpush.setVapidDetails(env.VAPID_SUBJECT!, env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
    ready = true;
  }
}

type Subscription = typeof s.pushSubscriptions.$inferSelect;

/** Sends to each subscription, removing the ones that no longer exist. Returns how many were delivered. */
export async function sendPush(subs: Subscription[], message: PushMessage): Promise<number> {
  if (!pushConfigured() || !subs.length) return 0;
  setup();
  const payload = JSON.stringify(message);
  let delivered = 0;
  const gone: string[] = [];
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 60 * 60 * 24, urgency: 'high' },
        );
        delivered++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(sub.id);
        else console.error('[push] send failed:', status ?? e);
      }
    }),
  );
  if (gone.length) await db.delete(s.pushSubscriptions).where(inArray(s.pushSubscriptions.id, gone));
  const sent = subs.filter((x) => !gone.includes(x.id)).map((x) => x.id);
  if (sent.length) {
    await db
      .update(s.pushSubscriptions)
      .set({ lastSentAt: sql`now()` })
      .where(inArray(s.pushSubscriptions.id, sent));
  }
  return delivered;
}

/** A bell notification, pushed to the phones of the admins whose bell shows it. */
export async function pushToAdmins(n: {
  kind: (typeof s.notificationKind.enumValues)[number];
  specialistId: string | null;
  title: string;
  body: string;
  link: string | null;
}) {
  if (!pushConfigured()) return;
  const subs = await db.select().from(s.pushSubscriptions).where(isNotNull(s.pushSubscriptions.adminId));
  if (!subs.length) return;
  const admins = (await listAdmins()).filter((a) => a.status === 'active' && canSee(a, n));
  const ids = new Set(admins.map((a) => a.id));
  await sendPush(
    subs.filter((x) => x.adminId && ids.has(x.adminId)),
    {
      title: n.title,
      body: n.body,
      // Contact messages link to the customer's email; the alert opens the Notifications page instead.
      url: n.link?.startsWith('/') ? n.link : '/admin/notifications',
    },
  );
}

/** An update for a signed-in customer's devices. */
export async function pushToCustomer(userId: string | null | undefined, message: PushMessage) {
  if (!userId || !pushConfigured()) return;
  const subs = await db.select().from(s.pushSubscriptions).where(eq(s.pushSubscriptions.userId, userId));
  await sendPush(subs, message);
}
