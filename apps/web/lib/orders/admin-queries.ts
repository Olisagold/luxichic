import 'server-only';
import { desc, eq, inArray, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { byNumber, loadOrders } from '@/lib/orders/queries';
import type { Order } from '@/types/order';

/** Orders for the admin (callers check `orders.view`). */

export type AdminOrder = Order & { id: string };

export interface OrderNote {
  id: string;
  text: string;
  by: string;
  at: string;
}

export interface OrderActivity {
  id: string;
  adminName: string;
  action: string;
  at: string;
}

/** Who confirmed each bank transfer, by order id. */
async function confirmers(orderIds: string[]): Promise<Map<string, string>> {
  if (!orderIds.length) return new Map();
  const rows = await db
    .select({ orderId: s.payments.orderId, name: s.admins.fullName })
    .from(s.payments)
    .innerJoin(s.admins, eq(s.admins.id, s.payments.confirmedByAdminId))
    .where(inArray(s.payments.orderId, orderIds));
  return new Map(rows.map((r) => [r.orderId, r.name]));
}

async function withConfirmers(orders: AdminOrder[]): Promise<AdminOrder[]> {
  const by = await confirmers(orders.map((o) => o.id));
  return orders.map((o) => ({ ...o, confirmedBy: by.get(o.id) }));
}

/** Every order, newest first. */
export async function listOrdersForAdmin(): Promise<AdminOrder[]> {
  return withConfirmers(await loadOrders(undefined));
}

/** One order with its internal notes and the admin actions taken on it. */
export async function getOrderForAdmin(
  orderNumber: string,
): Promise<{ order: AdminOrder; notes: OrderNote[]; activity: OrderActivity[] } | null> {
  if (orderNumber.length > 20) return null;
  const [order] = await withConfirmers(await loadOrders(byNumber(orderNumber)));
  if (!order) return null;
  const notes = await db
    .select({ id: s.adminNotes.id, body: s.adminNotes.body, at: s.adminNotes.createdAt, by: s.admins.fullName })
    .from(s.adminNotes)
    .leftJoin(s.admins, eq(s.admins.id, s.adminNotes.adminId))
    .where(sql`${s.adminNotes.subject} = 'order' and ${s.adminNotes.subjectId} = ${order.id}`)
    .orderBy(desc(s.adminNotes.createdAt));
  const activity = await db
    .select()
    .from(s.auditLogs)
    .where(
      or(
        eq(s.auditLogs.link, `/admin/orders/${order.orderNumber}`),
        sql`${s.auditLogs.target} like ${`${order.orderNumber}%`}`,
      ),
    )
    .orderBy(desc(s.auditLogs.createdAt))
    .limit(20);
  return {
    order,
    notes: notes.map((n) => ({ id: n.id, text: n.body, by: n.by ?? 'Former admin', at: n.at.toISOString() })),
    activity: activity.map((a) => ({
      id: a.id,
      adminName: a.adminName,
      action: a.action,
      at: a.createdAt.toISOString(),
    })),
  };
}
