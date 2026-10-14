'use server';

import { revalidateTag } from 'next/cache';
import { after } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { ActionError, adminAction, audit } from '@/lib/auth/admin-action';
import { emailOrderUpdate, type OrderEmail } from '@/lib/email/customer';
import { byNumber } from '@/lib/orders/queries';
import { STOREFRONT_TAG } from '@/lib/storefront/data';
import { formatNaira } from '@/lib/utils/currency';
import type { AdminUser } from '@/types/admin';
import type { OrderStatus } from '@/types/order';
import type { Result } from '@/types/user';

/**
 * Admin order actions (plan.md → Payment flow). Each checks its permission on the server and writes to
 * `audit_logs`, and emails the customer after the change (lib/email/customer.ts).
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbStatus = (typeof s.orderStatus.enumValues)[number];
type Step = (typeof s.orderEventStep.enumValues)[number];

/** Forward-only order of statuses; cancelling is separate. */
const FLOW: DbStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
const toDb = (status: OrderStatus) => status.toLowerCase() as DbStatus;

/** The order locked for this transaction, with its payment. */
async function lockOrder(tx: Tx, orderNumber: string) {
  if (typeof orderNumber !== 'string' || orderNumber.length > 20) throw new ActionError('Order not found.');
  const [row] = await tx
    .select({ order: s.orders, payment: s.payments })
    .from(s.orders)
    .leftJoin(s.payments, eq(s.payments.orderId, s.orders.id))
    .where(byNumber(orderNumber))
    .for('update', { of: s.orders });
  if (!row) throw new ActionError('Order not found.');
  return row;
}

/** An entry in the activity log, linked to the order. */
function orderAudit(tx: Tx, admin: AdminUser, action: string, orderNumber: string, detail?: string) {
  return audit(tx, admin, {
    section: 'Orders',
    action,
    target: detail ? `${orderNumber} · ${detail}` : orderNumber,
    link: `/admin/orders/${orderNumber}`,
  });
}

/** Adds timeline steps that haven't happened yet (marking "Shipped" also records "Processing"). */
async function stamp(tx: Tx, orderId: string, steps: Step[], adminId: string) {
  const done = await tx
    .select({ step: s.orderEvents.step })
    .from(s.orderEvents)
    .where(eq(s.orderEvents.orderId, orderId));
  const missing = steps.filter((st) => !done.some((d) => d.step === st));
  if (missing.length) await tx.insert(s.orderEvents).values(missing.map((step) => ({ orderId, step, adminId })));
}

/** Puts a cancelled order's items back in stock and gives back its promo-code use. */
async function restock(tx: Tx, order: typeof s.orders.$inferSelect) {
  const items = await tx.select().from(s.orderItems).where(eq(s.orderItems.orderId, order.id));
  const reason = `Cancelled ${order.orderNumber}`;
  const moves: (typeof s.stockMovements.$inferInsert)[] = [];
  for (const item of items) {
    if (!item.productId) continue;
    const [inv] = await tx
      .update(s.inventory)
      .set({ stock: sql`${s.inventory.stock} + ${item.quantity}`, updatedAt: new Date() })
      .where(and(eq(s.inventory.productId, item.productId), eq(s.inventory.trackInventory, true)))
      .returning({ stock: s.inventory.stock });
    if (inv) moves.push({ productId: item.productId, change: item.quantity, resultingStock: inv.stock, reason });
    // Option stock, matched by option name and value as snapshotted on the order item.
    for (const [name, label] of Object.entries(item.variants)) {
      const [value] = await tx.execute<{ stock: number }>(sql`
        update product_option_values v set stock = v.stock + ${item.quantity}
        from product_options o
        where v.option_id = o.id and o.product_id = ${item.productId}
          and o.name = ${name} and v.label = ${label} and v.stock is not null
        returning v.stock`);
      if (value) {
        moves.push({
          productId: item.productId,
          variant: `${name}: ${label}`,
          change: item.quantity,
          resultingStock: value.stock,
          reason,
        });
      }
    }
    await tx
      .update(s.products)
      .set({ salesCount: sql`greatest(0, ${s.products.salesCount} - ${item.quantity})` })
      .where(eq(s.products.id, item.productId));
  }
  if (moves.length) await tx.insert(s.stockMovements).values(moves);
  if (order.discountCode) {
    await tx
      .update(s.discounts)
      .set({ usedCount: sql`greatest(0, ${s.discounts.usedCount} - 1)` })
      .where(sql`lower(${s.discounts.code}) = lower(${order.discountCode})`);
  }
}

/**
 * Confirm Payment: after checking the bank statement, moves a bank transfer from `pending_verification` to
 * `payment_confirmed` and the order to Confirmed, recording who did it and when.
 */
export async function confirmPayment(orderNumber: string): Promise<Result> {
  return adminAction('orders.confirmPayment', async (admin) => {
    const orderId = await db.transaction(async (tx) => {
      const { order, payment } = await lockOrder(tx, orderNumber);
      if (order.paymentMethod !== 'bank_transfer' || payment?.status !== 'pending_verification') {
        throw new ActionError('This order isn’t waiting for a bank transfer to be confirmed.');
      }
      if (order.status !== 'pending') throw new ActionError('Only pending orders can have their payment confirmed.');
      const now = new Date();
      await tx
        .update(s.payments)
        .set({ status: 'payment_confirmed', confirmedByAdminId: admin.id, confirmedAt: now, updatedAt: now })
        .where(eq(s.payments.id, payment.id));
      await tx.update(s.orders).set({ status: 'confirmed', updatedAt: now }).where(eq(s.orders.id, order.id));
      await stamp(tx, order.id, ['payment_confirmed'], admin.id);
      await orderAudit(tx, admin, 'Confirmed payment', order.orderNumber, formatNaira(order.total));
      return order.id;
    });
    after(() => emailOrderUpdate(orderId, 'payment_confirmed'));
    return { ok: true };
  });
}

/** Statuses the customer is emailed about (Processing isn't). */
const EMAILED: Partial<Record<DbStatus, OrderEmail>> = {
  confirmed: 'confirmed',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

/** Emails the customer about a status change, after the response. */
function emailStatus(orderId: string, status: DbStatus) {
  const event = EMAILED[status];
  if (event) after(() => emailOrderUpdate(orderId, event));
}

/** Moves one order forward (or cancels it), returning the order's id. Throws an ActionError when it can't. */
async function changeStatus(
  tx: Tx,
  admin: AdminUser,
  orderNumber: string,
  status: OrderStatus,
  reason?: string,
): Promise<string> {
  const { order, payment } = await lockOrder(tx, orderNumber);
  const target = toDb(status);
  if (order.status === 'cancelled' || order.status === 'delivered') {
    throw new ActionError(`${order.orderNumber} is already ${order.status}.`);
  }
  const now = new Date();

  if (target === 'cancelled') {
    const why = reason?.trim();
    if (!why || why.length < 3) throw new ActionError('Please give a reason for cancelling.');
    await tx
      .update(s.orders)
      .set({ status: 'cancelled', cancelReason: why.slice(0, 500), updatedAt: now })
      .where(eq(s.orders.id, order.id));
    await stamp(tx, order.id, ['cancelled'], admin.id);
    await restock(tx, order);
    await orderAudit(tx, admin, 'Cancelled order', order.orderNumber, why.slice(0, 200));
    return order.id;
  }

  const from = FLOW.indexOf(order.status);
  const to = FLOW.indexOf(target);
  if (to <= from) throw new ActionError(`${order.orderNumber} is already ${order.status}.`);
  // A bank transfer moves on only once its payment is confirmed (Confirm Payment).
  if (order.paymentMethod === 'bank_transfer' && payment?.status === 'pending_verification') {
    throw new ActionError(`${order.orderNumber} is waiting for its bank transfer to be confirmed.`);
  }
  await tx.update(s.orders).set({ status: target, updatedAt: now }).where(eq(s.orders.id, order.id));
  const steps = (['processing', 'shipped', 'delivered'] as Step[]).filter((st) => FLOW.indexOf(st as DbStatus) <= to);
  await stamp(tx, order.id, steps, admin.id);
  // Pay on Delivery is paid when it's delivered.
  if (target === 'delivered' && order.paymentMethod === 'pay_on_delivery' && payment) {
    await tx.update(s.payments).set({ status: 'paid', updatedAt: now }).where(eq(s.payments.id, payment.id));
  }
  await orderAudit(tx, admin, `Marked as ${target}`, order.orderNumber);
  return order.id;
}

/** Confirms a Pay on Delivery order, moves an order on (Processing → Shipped → Delivered) or cancels it. */
export async function setOrderStatus(orderNumber: string, status: OrderStatus, reason?: string): Promise<Result> {
  return adminAction('orders.edit', async (admin) => {
    const orderId = await db.transaction((tx) => changeStatus(tx, admin, orderNumber, status, reason));
    if (status === 'Cancelled') revalidateTag(STOREFRONT_TAG);
    emailStatus(orderId, toDb(status));
    return { ok: true };
  });
}

/** The same change for several orders; each is done (or refused) on its own. */
export async function setOrdersStatus(
  orderNumbers: string[],
  status: OrderStatus,
  reason?: string,
): Promise<Result & { updated: number; skipped: string[] }> {
  let updated = 0;
  const skipped: string[] = [];
  const res = await adminAction('orders.edit', async (admin) => {
    for (const orderNumber of orderNumbers.slice(0, 200)) {
      try {
        const orderId = await db.transaction((tx) => changeStatus(tx, admin, orderNumber, status, reason));
        emailStatus(orderId, toDb(status));
        updated++;
      } catch (e) {
        if (!(e instanceof ActionError)) throw e;
        skipped.push(e.message);
      }
    }
    if (status === 'Cancelled' && updated) revalidateTag(STOREFRONT_TAG);
    return { ok: true };
  });
  return { ...res, updated, skipped };
}

/** Deletes an order for good. Its stock and promo use come back unless it was already cancelled or delivered. */
export async function deleteOrder(orderNumber: string): Promise<Result> {
  return adminAction('orders.delete', async (admin) => {
    await db.transaction(async (tx) => {
      const { order } = await lockOrder(tx, orderNumber);
      if (order.status !== 'cancelled' && order.status !== 'delivered') await restock(tx, order);
      await tx
        .delete(s.adminNotes)
        .where(sql`${s.adminNotes.subject} = 'order' and ${s.adminNotes.subjectId} = ${order.id}`);
      await tx.delete(s.orders).where(eq(s.orders.id, order.id));
      await orderAudit(tx, admin, 'Deleted order', order.orderNumber, formatNaira(order.total));
    });
    revalidateTag(STOREFRONT_TAG);
    return { ok: true };
  });
}

/** An internal note on an order, only visible to admins. */
export async function addOrderNote(orderNumber: string, text: string): Promise<Result> {
  return adminAction('orders.view', async (admin) => {
    const body = typeof text === 'string' ? text.trim().slice(0, 2000) : '';
    if (!body) return { ok: false, error: 'Write a note first.' };
    await db.transaction(async (tx) => {
      const { order } = await lockOrder(tx, orderNumber);
      await tx.insert(s.adminNotes).values({ subject: 'order', subjectId: order.id, body, adminId: admin.id });
      await orderAudit(tx, admin, 'Added a note', order.orderNumber);
    });
    return { ok: true };
  });
}
