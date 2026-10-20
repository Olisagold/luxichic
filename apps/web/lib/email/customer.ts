import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { env } from '@/lib/env';
import { pushToCustomer } from '@/lib/push/send';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyToken } from '@/lib/auth/guest-records';
import type { EmailContent } from '@/lib/email/layout';
import { sendTemplateEmail } from '@/lib/email/send';
import { formatNaira } from '@/lib/utils/currency';
import { formatLongDate, formatSlot } from '@/lib/utils/dates';

/**
 * The emails customers get as their order or appointment moves along. Each is composed once (`compose…`) and
 * either sent (`email…`, after the response with `after()`; a failure is logged and never undoes the change) or
 * previewed in the admin (lib/email/preview.ts).
 */

export interface ComposedEmail {
  key: string;
  to: string;
  values: Record<string, string>;
  content: Omit<EmailContent, 'body' | 'preview'>;
}

const send = (e: ComposedEmail | null) => (e ? sendTemplateEmail(e.key, e.to, e.values, e.content) : null);

const site = () => env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

async function safely(label: string, run: () => Promise<unknown>) {
  try {
    await run();
  } catch (e) {
    console.error(`[email] ${label} failed:`, e);
  }
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

async function loadOrder(orderId: string) {
  const [order] = await db.select().from(s.orders).where(eq(s.orders.id, orderId));
  if (!order) return null;
  const items = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, orderId));
  return { order, items };
}

function orderSummary({ order, items }: NonNullable<Awaited<ReturnType<typeof loadOrder>>>) {
  return {
    items: items.map((i) => ({
      name: i.productName,
      detail: Object.entries(i.variants ?? {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · '),
      quantity: i.quantity,
      amount: formatNaira(i.unitPrice * i.quantity),
    })),
    totals: [
      { label: 'Subtotal', value: formatNaira(order.subtotal) },
      ...(order.discountAmount
        ? [
            {
              label: `Discount${order.discountCode ? ` (${order.discountCode})` : ''}`,
              value: `−${formatNaira(order.discountAmount)}`,
            },
          ]
        : []),
      { label: 'Delivery', value: order.deliveryFee ? formatNaira(order.deliveryFee) : 'Free' },
      { label: 'Total', value: formatNaira(order.total), strong: true },
    ],
  };
}

const trackButton = (orderNumber: string) => ({
  label: 'Track your order',
  href: `${site()}/track-order?order=${encodeURIComponent(orderNumber)}`,
});

/** Right after checkout: transfer instructions with the bank details, or the order received (Pay on Delivery). */
export async function composeOrderPlaced(orderId: string): Promise<ComposedEmail | null> {
  const found = await loadOrder(orderId);
  if (!found) return null;
  const { order } = found;
  const values = {
    customer_name: firstName(order.customerName),
    order_number: order.orderNumber,
    transaction_reference: order.transactionReference,
    total_amount: formatNaira(order.total),
  };
  if (order.paymentMethod === 'bank_transfer') {
    const [bank] = await db.select({ value: s.settings.value }).from(s.settings).where(eq(s.settings.key, 'bank'));
    const b = (bank?.value ?? {}) as { bankName?: string; accountName?: string; accountNumber?: string };
    return {
      key: 'payment_pending',
      to: order.customerEmail,
      values,
      content: {
        details: [
          { label: 'Bank', value: b.bankName ?? '' },
          { label: 'Account name', value: b.accountName ?? '' },
          { label: 'Account number', value: b.accountNumber ?? '' },
          { label: 'Amount', value: formatNaira(order.total) },
          { label: 'Narration', value: order.transactionReference },
        ],
        ...orderSummary(found),
        button: trackButton(order.orderNumber),
        note: 'Use your transaction reference as the narration so we can match your payment quickly.',
      },
    };
  }
  return {
    key: 'order_placed',
    to: order.customerEmail,
    values,
    content: {
      details: [
        { label: 'Order', value: order.orderNumber },
        { label: 'Payment', value: 'Pay on Delivery' },
      ],
      ...orderSummary(found),
      button: trackButton(order.orderNumber),
    },
  };
}

export async function emailOrderPlaced(orderId: string) {
  await safely('order placed', async () => send(await composeOrderPlaced(orderId)));
}

export type OrderEmail = 'payment_confirmed' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

/** When the salon confirms the payment or moves the order on. Processing has no email. */
export async function composeOrderUpdate(orderId: string, event: OrderEmail): Promise<ComposedEmail | null> {
  const found = await loadOrder(orderId);
  if (!found) return null;
  const { order } = found;
  const values: Record<string, string> = {
    customer_name: firstName(order.customerName),
    order_number: order.orderNumber,
    transaction_reference: order.transactionReference,
    total_amount: formatNaira(order.total),
    delivery_state: order.shipState,
    reason: order.cancelReason ?? '',
    account_link: order.userId
      ? `Follow it any time in your account: ${site()}/account/orders`
      : `Create an account to follow your orders: ${site()}/register`,
  };
  const key = {
    payment_confirmed: 'payment_confirmed',
    confirmed: 'order_confirmed',
    shipped: 'order_shipped',
    delivered: 'order_delivered',
    cancelled: 'order_cancelled',
  }[event];
  return {
    key,
    to: order.customerEmail,
    values,
    content: {
      ...(event === 'cancelled' ? {} : orderSummary(found)),
      button:
        event === 'delivered' && order.userId
          ? { label: 'Review your items', href: `${site()}/account/orders/${order.orderNumber}` }
          : trackButton(order.orderNumber),
    },
  };
}

const ORDER_PUSH: Record<OrderEmail, string> = {
  payment_confirmed: 'Payment received',
  confirmed: 'Order confirmed',
  shipped: 'Your order is on its way',
  delivered: 'Order delivered',
  cancelled: 'Order cancelled',
};

/** The customer's email for an order update, and a phone notification if they've turned them on. */
export async function emailOrderUpdate(orderId: string, event: OrderEmail) {
  await safely(`order ${event}`, async () => send(await composeOrderUpdate(orderId, event)));
  await safely(`order ${event} push`, async () => {
    const [o] = await db
      .select({ number: s.orders.orderNumber, userId: s.orders.userId })
      .from(s.orders)
      .where(eq(s.orders.id, orderId));
    if (!o?.userId) return;
    await pushToCustomer(o.userId, {
      title: ORDER_PUSH[event],
      body: `Order ${o.number}`,
      url: `/account/orders/${o.number}`,
      tag: `order-${o.number}`,
    });
  });
}

/* ------------------------------------------------------------------ */
/* Appointments                                                        */
/* ------------------------------------------------------------------ */

export type AppointmentEmail = 'booked' | 'confirmed' | 'rejected' | 'cancelled' | 'rescheduled' | 'reminder';

const APPOINTMENT_TEMPLATE: Record<AppointmentEmail, string> = {
  booked: 'appt_booked',
  confirmed: 'appt_confirmed',
  rejected: 'appt_rejected',
  cancelled: 'appt_cancelled',
  rescheduled: 'appt_rescheduled',
  reminder: 'appt_reminder',
};

export async function composeAppointment(
  appointmentId: string,
  event: AppointmentEmail,
): Promise<ComposedEmail | null> {
  const [a] = await db.select().from(s.appointments).where(eq(s.appointments.id, appointmentId));
  if (!a) return null;
  const date = formatLongDate(a.date);
  const time = formatSlot(a.time.slice(0, 5));
  const values: Record<string, string> = {
    customer_name: firstName(a.customerName),
    service_name: a.serviceName,
    appointment_date: date,
    appointment_time: time,
    appointment_reference: a.reference,
    specialist_name: a.specialistName ?? 'our team',
    original_date: a.originalDate ? formatLongDate(a.originalDate) : date,
    original_time: a.originalTime ? formatSlot(a.originalTime.slice(0, 5)) : time,
    reason: event === 'cancelled' ? (a.reason ? `Reason: ${a.reason}` : '') : (a.reason ?? ''),
  };
  const active = !['rejected', 'cancelled'].includes(event);
  return {
    key: APPOINTMENT_TEMPLATE[event],
    to: a.customerEmail,
    values,
    content: {
      details: active
        ? [
            { label: 'Service', value: a.serviceName },
            { label: 'Date', value: date },
            { label: 'Time', value: time },
            { label: 'Specialist', value: a.specialistName ?? 'Any available specialist' },
            { label: 'Reference', value: a.reference },
          ]
        : undefined,
      button: active
        ? { label: 'View your appointment', href: `${site()}/salon/appointment/${a.reference}` }
        : { label: 'Book a new time', href: `${site()}/salon/book` },
      note: event === 'booked' ? 'We’ll email you again once the salon confirms your time.' : undefined,
    },
  };
}

const APPOINTMENT_PUSH: Partial<Record<AppointmentEmail, string>> = {
  confirmed: 'Appointment confirmed',
  rescheduled: 'Appointment moved',
  rejected: 'About your appointment request',
  cancelled: 'Appointment cancelled',
  reminder: 'Your appointment is tomorrow',
};

/** The customer's email about their appointment, and a phone notification (not for their own new request). */
export async function emailAppointment(appointmentId: string, event: AppointmentEmail) {
  await safely(`appointment ${event}`, async () => send(await composeAppointment(appointmentId, event)));
  const title = APPOINTMENT_PUSH[event];
  if (!title) return;
  await safely(`appointment ${event} push`, async () => {
    const [a] = await db.select().from(s.appointments).where(eq(s.appointments.id, appointmentId));
    if (!a?.userId) return;
    await pushToCustomer(a.userId, {
      title,
      body: `${a.serviceName} · ${formatLongDate(a.date)} at ${formatSlot(a.time.slice(0, 5))}`,
      url: `/salon/appointment/${a.reference}`,
      tag: `appointment-${a.reference}`,
    });
  });
}

/* ------------------------------------------------------------------ */
/* Accounts                                                            */
/* ------------------------------------------------------------------ */

/**
 * The welcome email, once per account: the login is marked `welcomed` (app metadata, which only the server can
 * set) after it's sent, so signing in again with Google doesn't repeat it.
 */
export async function emailWelcomeOnce(userId: string) {
  await safely('welcome', async () => {
    const auth = createAdminClient().auth.admin;
    const { data } = await auth.getUserById(userId);
    const user = data.user;
    if (!user?.email || user.app_metadata?.welcomed) return;
    const [profile] = await db
      .select({ fullName: s.profiles.fullName })
      .from(s.profiles)
      .where(eq(s.profiles.id, userId));
    if (!profile) return; // admins have no customer profile
    const sent = await sendTemplateEmail(
      'welcome',
      user.email,
      { customer_name: firstName(profile.fullName || user.email) },
      { button: { label: 'Start shopping', href: site() } },
    );
    if (sent.ok) await auth.updateUserById(userId, { app_metadata: { ...user.app_metadata, welcomed: true } });
  });
}

/** Sign-in alert for an admin (Settings → Security → "Email me when someone signs in"). */
export async function emailAdminLogin(admin: { email: string; fullName: string }, device: string) {
  await safely('admin login alert', async () => {
    const now = new Date();
    const lagos = (o: Intl.DateTimeFormatOptions) => now.toLocaleString('en-NG', { timeZone: 'Africa/Lagos', ...o });
    await sendTemplateEmail('admin_login', admin.email, {
      admin_name: firstName(admin.fullName),
      admin_email: admin.email,
      login_date: lagos({ day: 'numeric', month: 'long', year: 'numeric' }),
      login_time: lagos({ hour: 'numeric', minute: '2-digit' }),
      device,
    });
  });
}

/** "Confirm your email": proves the new account owns the address its earlier guest orders were made with. */
export async function emailVerifyLink(user: { id: string; email: string; fullName: string }, found: string) {
  return sendTemplateEmail(
    'verify_email',
    user.email,
    { customer_name: firstName(user.fullName || user.email), found },
    {
      button: {
        label: 'Confirm my email',
        href: `${site()}/auth/verify-email?token=${encodeURIComponent(verifyToken(user.id, user.email))}`,
      },
      note: 'The link works for 3 days.',
    },
  );
}
