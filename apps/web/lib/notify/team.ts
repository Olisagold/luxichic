import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { env } from '@/lib/env';
import { DEFAULT_TELEGRAM, loadSettingsRows, type TelegramSettings } from '@/lib/settings/store';
import { sendTelegramMessage } from '@/lib/telegram/client';
import { formatNaira } from '@/lib/utils/currency';
import { formatDate, formatSlot } from '@/lib/utils/dates';
import { fillTemplate } from '@/lib/utils/text';
import type { StoreSettings } from '@/types/admin';

/**
 * Tells the team about new activity: an in-app notification (topbar bell, /admin/notifications) and, for new
 * orders and appointments, a Telegram message to the team chat. Each follows its switch under Notifications and
 * Telegram. Run these after the customer's request has finished (`after()`); a failure is logged, never shown to
 * the customer.
 */

type Kind = (typeof s.notificationKind.enumValues)[number];

const PREFS_DEFAULT: StoreSettings['notifications'] = {
  email: true,
  lowStock: true,
  newOrder: true,
  newAppointment: true,
  newReview: true,
};

async function loadTeamSettings() {
  const rows = await loadSettingsRows();
  const value = <T>(key: string) => rows.find((r) => r.key === key)?.value as T | undefined;
  return {
    prefs: { ...PREFS_DEFAULT, ...value<Partial<StoreSettings['notifications']>>('notifications') },
    telegram: { ...DEFAULT_TELEGRAM, ...value<Partial<TelegramSettings>>('telegram') },
  };
}

async function notify(kind: Kind, title: string, body: string, link: string) {
  await db.insert(s.notifications).values({ kind, title, body, link });
}

async function telegram(settings: TelegramSettings, template: string, values: Record<string, string>) {
  const chatId = settings.chatId || env.TELEGRAM_ADMIN_CHAT_ID;
  if (!chatId || !env.TELEGRAM_BOT_TOKEN) return;
  const res = await sendTelegramMessage(chatId, fillTemplate(template, values));
  if (!res.ok) console.error('[notify] Telegram alert failed:', res.error);
}

/** Runs an alert, logging instead of throwing. */
async function safely(label: string, run: () => Promise<void>) {
  try {
    await run();
  } catch (e) {
    console.error(`[notify] ${label} failed:`, e);
  }
}

const METHOD: Record<string, string> = { bank_transfer: 'Bank transfer', pay_on_delivery: 'Pay on Delivery' };

/** A new order: notification, Telegram alert, and low-stock warnings for anything it took below the threshold. */
export async function alertNewOrder(orderId: string) {
  await safely('new order', async () => {
    const [order] = await db.select().from(s.orders).where(eq(s.orders.id, orderId));
    if (!order) return;
    const items = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, orderId));
    const { prefs, telegram: tg } = await loadTeamSettings();
    const link = `/admin/orders/${order.orderNumber}`;
    const method = METHOD[order.paymentMethod] ?? order.paymentMethod;

    if (prefs.newOrder) {
      await notify(
        'order',
        `New order ${order.orderNumber}`,
        `${order.customerName} · ${formatNaira(order.total)} · ${method}`,
        link,
      );
    }
    if (tg.notifyOrders) {
      await telegram(tg, tg.orderTemplate, {
        order_number: order.orderNumber,
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        products: items.map((i) => `${i.quantity} × ${i.productName}`).join('\n'),
        total_amount: formatNaira(order.total),
        payment_method: method,
        delivery_state: order.shipState,
        transaction_reference: order.transactionReference,
      });
    }

    if (prefs.lowStock) {
      // Only products this order took from above the threshold to at or below it, so each warns once.
      const crossed = await db.execute<{ id: string; name: string; stock: number }>(sql`
        select p.id, p.name, m.resulting_stock as stock
        from stock_movements m
        join inventory i on i.product_id = m.product_id
        join products p on p.id = m.product_id
        where m.reason = ${`Order ${order.orderNumber}`} and m.variant is null
          and m.resulting_stock <= i.low_stock_threshold
          and m.resulting_stock - m.change > i.low_stock_threshold`);
      for (const p of crossed) {
        await notify(
          'stock',
          p.stock <= 0 ? `Sold out: ${p.name}` : `Low stock: ${p.name}`,
          p.stock <= 0 ? 'No stock left. Restock or hide it.' : `${p.stock} left after order ${order.orderNumber}.`,
          `/admin/inventory?q=${encodeURIComponent(p.name)}`,
        );
      }
    }
  });
}

async function appointmentValues(appointmentId: string) {
  const [a] = await db.select().from(s.appointments).where(eq(s.appointments.id, appointmentId));
  if (!a) return null;
  const time = formatSlot(a.time.slice(0, 5));
  return {
    a,
    link: `/admin/appointments?ref=${a.reference}`,
    when: `${formatDate(a.date)} at ${time}`,
    values: {
      appointment_reference: a.reference,
      customer_name: a.customerName,
      customer_phone: a.customerPhone,
      service_name: a.serviceName,
      specialist_name: a.specialistName ?? 'Any specialist',
      appointment_date: formatDate(a.date),
      appointment_time: time,
    },
  };
}

/** A new booking request: notification and Telegram alert. */
export async function alertNewAppointment(appointmentId: string) {
  await safely('new appointment', async () => {
    const found = await appointmentValues(appointmentId);
    if (!found) return;
    const { prefs, telegram: tg } = await loadTeamSettings();
    if (prefs.newAppointment) {
      await notify(
        'appointment',
        `New appointment ${found.a.reference}`,
        `${found.a.customerName} · ${found.a.serviceName} · ${found.when}`,
        found.link,
      );
    }
    if (tg.notifyAppointments) await telegram(tg, tg.appointmentTemplate, found.values);
  });
}

/** The customer cancelled or moved their appointment online. */
export async function alertAppointmentChanged(appointmentId: string, change: 'cancelled' | 'rescheduled') {
  await safely(`appointment ${change}`, async () => {
    const found = await appointmentValues(appointmentId);
    if (!found) return;
    const { prefs, telegram: tg } = await loadTeamSettings();
    if (!prefs.newAppointment) return;
    const title =
      change === 'cancelled'
        ? `Appointment cancelled ${found.a.reference}`
        : `Appointment rescheduled ${found.a.reference}`;
    const body =
      change === 'cancelled'
        ? `${found.a.customerName} cancelled ${found.a.serviceName}.`
        : `${found.a.customerName} moved ${found.a.serviceName} to ${found.when}. Confirm the new time.`;
    await notify('appointment', title, body, found.link);
    if (tg.notifyAppointments) await telegram(tg, `📅 ${title}\n${body}`, {});
  });
}

/** A new or edited product review. */
export async function alertReview(productId: string, rating: number, author: string) {
  await safely('review', async () => {
    const { prefs } = await loadTeamSettings();
    if (!prefs.newReview) return;
    const [p] = await db.select({ name: s.products.name }).from(s.products).where(eq(s.products.id, productId));
    await notify(
      'review',
      `New ${rating}★ review`,
      `${author} reviewed ${p?.name ?? 'a product'}.`,
      `/admin/reviews?q=${encodeURIComponent(author)}`,
    );
  });
}
