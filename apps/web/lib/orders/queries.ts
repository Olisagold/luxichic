import 'server-only';
import { asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { authReady } from '@/lib/auth/helpers';
import { getCustomer } from '@/lib/auth/session';
import { placedOrderIds } from '@/lib/orders/references';
import type { Order, OrderStatus, PaymentStatus, TimelineEntry, TimelineStep } from '@/types/order';

/** Orders from the database, in the shape the storefront's order views use. Server code checks who may see them. */

const orderStatus: Record<(typeof s.orderStatus.enumValues)[number], OrderStatus> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
const paymentStatus: Record<(typeof s.paymentStatus.enumValues)[number], PaymentStatus> = {
  pending_verification: 'Pending Verification',
  payment_confirmed: 'Payment Confirmed',
  pay_on_delivery: 'Pay on Delivery',
  paid: 'Paid',
};
const stepLabel: Record<(typeof s.orderEventStep.enumValues)[number], TimelineStep> = {
  order_placed: 'Order Placed',
  awaiting_payment: 'Awaiting Payment',
  payment_confirmed: 'Payment Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
const TRANSFER_STEPS: TimelineStep[] = [
  'Order Placed',
  'Awaiting Payment',
  'Payment Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
];
const DELIVERY_STEPS: TimelineStep[] = ['Order Placed', 'Processing', 'Shipped', 'Delivered'];

/** Orders matching `where`, newest first, with items, payment and timeline. One query per table. */
export async function loadOrders(where: SQL | undefined): Promise<(Order & { id: string })[]> {
  const rows = await db.select().from(s.orders).where(where).orderBy(desc(s.orders.createdAt));
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const items = await db.select().from(s.orderItems).where(inArray(s.orderItems.orderId, ids));
  const payments = await db.select().from(s.payments).where(inArray(s.payments.orderId, ids));
  const events = await db
    .select()
    .from(s.orderEvents)
    .where(inArray(s.orderEvents.orderId, ids))
    .orderBy(asc(s.orderEvents.createdAt));

  return rows.map((o) => {
    const happened = new Map(
      events.filter((e) => e.orderId === o.id).map((e) => [stepLabel[e.step], e.createdAt.toISOString()]),
    );
    const steps = o.paymentMethod === 'bank_transfer' ? TRANSFER_STEPS : DELIVERY_STEPS;
    const timeline: TimelineEntry[] = steps.map((step) => ({ step, at: happened.get(step) ?? null }));
    if (happened.has('Cancelled')) timeline.push({ step: 'Cancelled', at: happened.get('Cancelled')! });
    const payment = payments.find((p) => p.orderId === o.id);

    return {
      id: o.id,
      orderNumber: o.orderNumber,
      reference: o.transactionReference,
      createdAt: o.createdAt.toISOString(),
      customer: { fullName: o.customerName, email: o.customerEmail, phone: o.customerPhone },
      address: {
        id: o.id,
        country: o.shipCountry,
        state: o.shipState,
        city: o.shipCity,
        street: o.shipStreet,
        houseNumber: o.shipHouseNumber ?? undefined,
        landmark: o.shipLandmark ?? undefined,
        instructions: o.shipInstructions ?? undefined,
      },
      items: items
        .filter((i) => i.orderId === o.id)
        .map((i) => ({
          key: i.id,
          productId: i.productId ?? '',
          slug: i.productSlug,
          division: i.division,
          name: i.productName,
          image: i.imageUrl ?? '',
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          variants: i.variants,
        })),
      subtotal: o.subtotal,
      deliveryFee: o.deliveryFee,
      discount: o.discountAmount,
      total: o.total,
      paymentMethod: o.paymentMethod,
      paymentStatus: payment
        ? paymentStatus[payment.status]
        : o.paymentMethod === 'bank_transfer'
          ? 'Pending Verification'
          : 'Pay on Delivery',
      status: orderStatus[o.status],
      timeline,
      // Marks the order as belonging to an account (the views use it to offer account features).
      accountEmail: o.userId ? o.customerEmail : undefined,
      cancelReason: o.cancelReason ?? undefined,
    };
  });
}

export const byNumber = (orderNumber: string) => sql`upper(${s.orders.orderNumber}) = upper(${orderNumber.trim()})`;

/**
 * An order for the confirmation page: only for the account that placed it or the browser that placed it
 * (`lx_orders` cookie). Anyone else gets null and can track it with the order number and email.
 */
export async function getOrderForViewer(orderNumber: string): Promise<Order | null> {
  if (!authReady() || orderNumber.length > 20) return null;
  const [row] = await db
    .select({ id: s.orders.id, userId: s.orders.userId })
    .from(s.orders)
    .where(byNumber(orderNumber));
  if (!row) return null;
  const customer = await getCustomer();
  const allowed = (customer && row.userId === customer.id) || (await placedOrderIds()).includes(row.id);
  if (!allowed) return null;
  const [order] = await loadOrders(eq(s.orders.id, row.id));
  return order ?? null;
}

/** The order with this number placed with this email (order tracking). */
export async function findOrderByNumberAndEmail(orderNumber: string, email: string): Promise<Order | null> {
  if (!authReady()) return null;
  const [order] = await loadOrders(
    sql`${byNumber(orderNumber)} and lower(${s.orders.customerEmail}) = lower(${email.trim()})`,
  );
  return order ?? null;
}

/** The signed-in customer's orders, newest first. */
export async function getCustomerOrders(): Promise<Order[]> {
  if (!authReady()) return [];
  const customer = await getCustomer();
  if (!customer) return [];
  return loadOrders(eq(s.orders.userId, customer.id));
}

/** One of the signed-in customer's orders. */
export async function getCustomerOrder(orderNumber: string): Promise<Order | null> {
  if (!authReady() || orderNumber.length > 20) return null;
  const customer = await getCustomer();
  if (!customer) return null;
  const [order] = await loadOrders(sql`${byNumber(orderNumber)} and ${s.orders.userId} = ${customer.id}`);
  return order ?? null;
}
