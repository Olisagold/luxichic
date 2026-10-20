import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { env } from '@/lib/env';
import { DEFAULT_TELEGRAM, loadSettingsRows, type TelegramSettings } from '@/lib/settings/store';
import { pushToAdmins } from '@/lib/push/send';
import { sendTelegramMessage } from '@/lib/telegram/client';
import { formatNaira } from '@/lib/utils/currency';
import { formatDate, formatSlot } from '@/lib/utils/dates';
import { fillTemplate } from '@/lib/utils/text';
import type { StoreSettings } from '@/types/admin';

/**
 * Tells the team about new activity: an in-app notification (the bell, /admin/notifications) and Telegram:
 * - new orders go to the orders group only;
 * - bookings go to the appointments group (new bookings and the customer's own changes), and privately to the
 *   specialist they're for (new bookings and every change to them, including the salon's).
 * Each follows its switch under Notifications and Telegram. Run these after the request has finished
 * (`after()`); a failure is logged, never shown to the customer.
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

/**
 * A bell notification, also sent to the phones of the admins who see it. `specialistId` also shows an
 * appointment one to that specialist's own login.
 */
async function notify(kind: Kind, title: string, body: string, link: string, specialistId?: string | null) {
  const n = { kind, title, body, link, specialistId: specialistId ?? null };
  await db.insert(s.notifications).values(n);
  await pushToAdmins(n);
}

async function send(chatId: string | undefined | null, text: string, label: string) {
  if (!chatId || !env.TELEGRAM_BOT_TOKEN) return;
  const res = await sendTelegramMessage(chatId, text);
  if (!res.ok) console.error(`[notify] Telegram ${label} (${chatId}) failed:`, res.error);
}

/** The appointments group (all bookings). */
const appointmentsGroup = (tg: TelegramSettings, text: string) =>
  send(tg.chatId || env.TELEGRAM_ADMIN_CHAT_ID, text, 'appointments group');

/** A specialist's private chat, if they've connected it. */
async function toSpecialist(tg: TelegramSettings, specialistId: string | null | undefined, text: string) {
  if (!tg.notifySpecialists || !specialistId) return;
  const [account] = await db
    .select({ chatId: s.specialistAccounts.telegramChatId })
    .from(s.specialistAccounts)
    .where(eq(s.specialistAccounts.specialistId, specialistId));
  await send(account?.chatId, text, 'specialist message');
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
      // Orders go to the orders group only, never the appointments group.
      await send(
        tg.ordersChatId,
        fillTemplate(tg.orderTemplate, {
          order_number: order.orderNumber,
          customer_name: order.customerName,
          customer_phone: order.customerPhone,
          products: items.map((i) => `${i.quantity} × ${i.productName}`).join('\n'),
          total_amount: formatNaira(order.total),
          payment_method: method,
          delivery_state: order.shipState,
          transaction_reference: order.transactionReference,
        }),
        'orders group',
      );
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

const summary = (f: NonNullable<Awaited<ReturnType<typeof appointmentValues>>>) =>
  `${f.a.serviceName} · ${f.a.customerName} (${f.a.customerPhone})\n${f.when} · ${f.a.reference}`;

/** A new booking request: notification, the appointments group, and the specialist it's for. */
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
        found.a.specialistId,
      );
    }
    if (tg.notifyAppointments) await appointmentsGroup(tg, fillTemplate(tg.appointmentTemplate, found.values));
    await toSpecialist(
      tg,
      found.a.specialistId,
      `💅 New booking for you\n${summary(found)}\n\nIt’s waiting to be confirmed.`,
    );
  });
}

/**
 * The customer cancelled or moved their appointment online. `previousSpecialistId` is who had it before a move
 * (the booking may have gone to someone else who's free then).
 */
export async function alertAppointmentChanged(
  appointmentId: string,
  change: 'cancelled' | 'rescheduled',
  previousSpecialistId?: string | null,
) {
  await safely(`appointment ${change}`, async () => {
    const found = await appointmentValues(appointmentId);
    if (!found) return;
    const { prefs, telegram: tg } = await loadTeamSettings();
    const title =
      change === 'cancelled'
        ? `Appointment cancelled ${found.a.reference}`
        : `Appointment rescheduled ${found.a.reference}`;
    const body =
      change === 'cancelled'
        ? `${found.a.customerName} cancelled ${found.a.serviceName}.`
        : `${found.a.customerName} moved ${found.a.serviceName} to ${found.when}. Confirm the new time.`;
    if (prefs.newAppointment) await notify('appointment', title, body, found.link, found.a.specialistId);
    if (tg.notifyAppointments) await appointmentsGroup(tg, `📅 ${title}\n${body}`);
    await tellSpecialists(
      tg,
      found,
      change === 'cancelled' ? 'cancelled' : 'rescheduled',
      previousSpecialistId,
      'the customer',
    );
  });
}

export type SalonChange = 'confirmed' | 'rejected' | 'cancelled' | 'rescheduled';

/** The salon changed a booking in the admin: the specialist(s) it concerns hear about it privately. */
export async function alertAppointmentUpdated(
  appointmentId: string,
  change: SalonChange,
  previousSpecialistId?: string | null,
) {
  await safely(`appointment ${change} (salon)`, async () => {
    const found = await appointmentValues(appointmentId);
    if (!found) return;
    const { telegram: tg } = await loadTeamSettings();
    await tellSpecialists(tg, found, change, previousSpecialistId, 'the salon');
  });
}

/** Private messages for a change: the specialist who has it now, and the one it was moved away from. */
async function tellSpecialists(
  tg: TelegramSettings,
  found: NonNullable<Awaited<ReturnType<typeof appointmentValues>>>,
  change: SalonChange,
  previousSpecialistId: string | null | undefined,
  by: string,
) {
  const now = found.a.specialistId;
  const reason = found.a.reason ? `\nReason: ${found.a.reason}` : '';
  if (previousSpecialistId && now !== previousSpecialistId) {
    await toSpecialist(
      tg,
      previousSpecialistId,
      `↪️ ${found.a.reference} (${found.a.serviceName} · ${found.a.customerName}) was moved to ${found.a.specialistName ?? 'another specialist'} by ${by}. It’s no longer in your diary.`,
    );
    await toSpecialist(tg, now, `💅 Booking moved to you\n${summary(found)}`);
    return;
  }
  const text = {
    confirmed: `✅ Confirmed\n${summary(found)}`,
    rejected: `❌ Not accepted by ${by}\n${summary(found)}${reason}`,
    cancelled: `❌ Cancelled by ${by}\n${summary(found)}${reason}`,
    rescheduled: `📅 Moved by ${by}, now:\n${summary(found)}`,
  }[change];
  await toSpecialist(tg, now, text);
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
