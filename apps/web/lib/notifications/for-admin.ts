import 'server-only';
import { and, desc, eq, inArray, notExists, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { bookingScope, hasPermission } from '@/lib/auth/session';
import type { AdminNotification, AdminUser, Permission } from '@/types/admin';

/**
 * Each admin's bell. An admin sees the kinds of notification their permissions cover; a specialist's own login
 * sees only appointment notifications for their bookings. Read/unread is kept per admin (notification_reads).
 */

type Kind = (typeof s.notificationKind.enumValues)[number];

/** Who sees each kind: any one of these permissions. */
const SEEN_WITH: Record<Kind, Permission[]> = {
  order: ['orders.view'],
  payment: ['orders.view', 'orders.confirmPayment'],
  stock: ['orders.view', 'products.view', 'inventory.manage'],
  appointment: ['appointments.view'],
  review: ['reviews.view'],
  // Contact-form messages: decided by role below (the Order Manager can view customers but shouldn't get these).
  customer: [],
  integration: ['settings.general'],
};

/** Who gets contact-form messages, besides the owner. */
const CONTACT_ROLES: AdminUser['role'][] = ['Super Admin', 'Customer Support'];

/** The notifications this admin may see, as a SQL condition (null: none). */
function visibleTo(admin: AdminUser): SQL | null {
  if (admin.isOwner) return sql`true`;
  const kinds = (Object.keys(SEEN_WITH) as Kind[]).filter((k) =>
    k === 'customer' ? CONTACT_ROLES.includes(admin.role) : SEEN_WITH[k].some((p) => hasPermission(admin, p)),
  );
  if (!kinds.length) return null;
  const scope = bookingScope(admin);
  if (!scope) return inArray(s.notifications.kind, kinds);
  // Their own bookings only; nothing else from the salon.
  const others = kinds.filter((k) => k !== 'appointment');
  const own = and(eq(s.notifications.kind, 'appointment'), eq(s.notifications.specialistId, scope));
  return kinds.includes('appointment')
    ? others.length
      ? or(inArray(s.notifications.kind, others), own)!
      : own!
    : inArray(s.notifications.kind, others);
}

const readBy = (adminId: string) =>
  db
    .select({ one: sql`1` })
    .from(s.notificationReads)
    .where(and(eq(s.notificationReads.notificationId, s.notifications.id), eq(s.notificationReads.adminId, adminId)));

export async function notificationsFor(admin: AdminUser, limit = 200): Promise<AdminNotification[]> {
  const where = visibleTo(admin);
  if (!where) return [];
  const rows = await db
    .select({ n: s.notifications, readAt: s.notificationReads.readAt })
    .from(s.notifications)
    .leftJoin(
      s.notificationReads,
      and(eq(s.notificationReads.notificationId, s.notifications.id), eq(s.notificationReads.adminId, admin.id)),
    )
    .where(where)
    .orderBy(desc(s.notifications.createdAt))
    .limit(limit);
  return rows.map(({ n, readAt }) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    at: n.createdAt.toISOString(),
    read: !!readAt,
    link: n.link ?? undefined,
  }));
}

export async function unreadCountFor(admin: AdminUser): Promise<number> {
  const where = visibleTo(admin);
  if (!where) return 0;
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.notifications)
    .where(and(where, notExists(readBy(admin.id))));
  return Number(row?.n ?? 0);
}

/** Marks notifications read (or unread) for this admin only; 'all' means all they can see. */
export async function markReadFor(admin: AdminUser, ids: string[] | 'all', read: boolean) {
  const where = visibleTo(admin);
  if (!where) return;
  const visible = ids === 'all' ? where : and(where, inArray(s.notifications.id, ids))!;
  if (!read) {
    if (ids === 'all') {
      await db.delete(s.notificationReads).where(eq(s.notificationReads.adminId, admin.id));
      return;
    }
    await db
      .delete(s.notificationReads)
      .where(and(eq(s.notificationReads.adminId, admin.id), inArray(s.notificationReads.notificationId, ids)));
    return;
  }
  const targets = await db
    .select({ id: s.notifications.id })
    .from(s.notifications)
    .where(and(visible, notExists(readBy(admin.id))));
  if (!targets.length) return;
  await db
    .insert(s.notificationReads)
    .values(targets.map((t) => ({ notificationId: t.id, adminId: admin.id })))
    .onConflictDoNothing();
}
