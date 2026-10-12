'use server';

import { inArray, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import * as s from '@/db/schema';
import { ActionError, adminAction, audit } from '@/lib/auth/admin-action';
import { requirePermission } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { loadSettingsRows, DEFAULT_TELEGRAM, type TelegramSettings } from '@/lib/settings/store';
import { STOREFRONT_TAG } from '@/lib/storefront/data';
import { sendTelegramMessage } from '@/lib/telegram/client';
import { fillTemplate } from '@/lib/utils/text';
import { isUuid, isValidEmail } from '@/lib/utils/validation';
import type { AdminUser, StoreSettings } from '@/types/admin';
import type { Result } from '@/types/user';

/**
 * Operations settings: payments, delivery, email, notifications and Telegram alerts. Each action checks its
 * permission on the server and writes to `audit_logs`. Settings customers see (bank details, Pay on Delivery,
 * delivery fees) refresh the storefront at once.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Writes one `settings` row (one JSON value per key). */
async function writeSetting(tx: Tx | typeof db, key: string, value: unknown, admin: AdminUser) {
  await tx
    .insert(s.settings)
    .values({ key, value, updatedByAdminId: admin.id })
    .onConflictDoUpdate({
      target: s.settings.key,
      set: { value, updatedByAdminId: admin.id, updatedAt: new Date() },
    });
}

/* ------------------------------------------------------------------ */
/* Payments                                                            */
/* ------------------------------------------------------------------ */

const bankSchema = z.object({
  bankName: z.string().trim().min(2, 'Enter the bank name.').max(80),
  accountName: z.string().trim().min(2, 'Enter the account name.').max(120),
  accountNumber: z.string().regex(/^\d{10}$/, 'Nigerian account numbers have 10 digits.'),
  instructions: z.string().trim().max(500),
});

/** The account customers transfer into, shown at checkout and on the confirmation page. */
export async function saveBankDetails(bank: StoreSettings['bank']): Promise<Result> {
  return adminAction(
    'settings.payment',
    async (admin) => {
      const parsed = bankSchema.safeParse(bank);
      if (!parsed.success) throw new ActionError(parsed.error.issues[0]?.message ?? 'Please check the bank details.');
      const b = parsed.data;
      await db.transaction(async (tx) => {
        await writeSetting(tx, 'bank', b, admin);
        await audit(tx, admin, {
          section: 'Payments',
          action: 'Changed bank details',
          target: `${b.bankName} · ••••${b.accountNumber.slice(-4)}`,
        });
      });
      return { ok: true };
    },
    { revalidate: [STOREFRONT_TAG] },
  );
}

export async function setPayOnDelivery(enabled: boolean): Promise<Result> {
  return adminAction(
    'settings.payment',
    async (admin) => {
      await db.transaction(async (tx) => {
        await writeSetting(tx, 'pay_on_delivery', { enabled: !!enabled }, admin);
        await audit(tx, admin, {
          section: 'Payments',
          action: enabled ? 'Enabled Pay on Delivery' : 'Disabled Pay on Delivery',
        });
      });
      return { ok: true };
    },
    { revalidate: [STOREFRONT_TAG] },
  );
}

/* ------------------------------------------------------------------ */
/* Delivery                                                            */
/* ------------------------------------------------------------------ */

const deliverySchema = z.object({
  rates: z
    .array(
      z.object({
        state: z.string().trim().min(1).max(60),
        fee: z.number().int().min(0).max(10_000_000),
        free: z.boolean(),
        enabled: z.boolean(),
      }),
    )
    .max(60),
  estimate: z.string().trim().max(300),
});

/** Delivery fee per state (free, or switched off) and the delivery-time text. Checkout uses them at once. */
export async function saveDelivery(value: StoreSettings['delivery']): Promise<Result> {
  return adminAction(
    'settings.delivery',
    async (admin) => {
      const parsed = deliverySchema.safeParse(value);
      if (!parsed.success) throw new ActionError('Please check the delivery fees.');
      const { rates, estimate } = parsed.data;
      await db.transaction(async (tx) => {
        if (rates.length) {
          await tx
            .insert(s.deliveryRates)
            .values(rates.map((r) => ({ state: r.state, fee: r.fee, isFree: r.free, enabled: r.enabled })))
            .onConflictDoUpdate({
              target: s.deliveryRates.state,
              set: {
                fee: sql`excluded.fee`,
                isFree: sql`excluded.is_free`,
                enabled: sql`excluded.enabled`,
                updatedAt: new Date(),
              },
            });
        }
        await writeSetting(tx, 'delivery_estimate', { text: estimate }, admin);
        await audit(tx, admin, { section: 'Delivery', action: 'Updated delivery fees' });
      });
      return { ok: true };
    },
    { revalidate: [STOREFRONT_TAG] },
  );
}

/* ------------------------------------------------------------------ */
/* Email (sent with Resend from Phase 9)                               */
/* ------------------------------------------------------------------ */

/** Who customer emails come from. The Resend API key stays in the environment (RESEND_API_KEY). */
export async function saveEmailSender(sender: {
  senderName: string;
  senderEmail: string;
  replyTo: string;
}): Promise<Result> {
  return adminAction('settings.email', async (admin) => {
    const senderName = String(sender?.senderName ?? '')
      .trim()
      .slice(0, 80);
    const senderEmail = String(sender?.senderEmail ?? '').trim();
    const replyTo = String(sender?.replyTo ?? '').trim();
    if (!senderName) throw new ActionError('Enter the sender name customers see.');
    if (!isValidEmail(senderEmail)) throw new ActionError('Enter the email address messages are sent from.');
    if (replyTo && !isValidEmail(replyTo)) throw new ActionError('Enter a valid reply-to address, or leave it empty.');
    await db.transaction(async (tx) => {
      await writeSetting(tx, 'email', { senderName, senderEmail, replyTo }, admin);
      await audit(tx, admin, { section: 'Email', action: 'Updated email sender', target: senderEmail });
    });
    return { ok: true };
  });
}

export async function saveEmailTemplate(t: {
  id: string;
  subject: string;
  body: string;
  enabled: boolean;
}): Promise<Result> {
  return adminAction('settings.email', async (admin) => {
    const subject = String(t?.subject ?? '').trim();
    const body = String(t?.body ?? '').trim();
    if (!subject || subject.length > 200) throw new ActionError('Enter a subject (up to 200 characters).');
    if (!body || body.length > 20000) throw new ActionError('Write the message.');
    await db.transaction(async (tx) => {
      const [row] = await tx
        .update(s.emailTemplates)
        .set({ subject, body, enabled: !!t.enabled, updatedAt: new Date() })
        .where(sql`${s.emailTemplates.key} = ${String(t.id)}`)
        .returning({ name: s.emailTemplates.name });
      if (!row) throw new ActionError('Template not found.');
      await audit(tx, admin, { section: 'Email', action: 'Edited email template', target: row.name });
    });
    return { ok: true };
  });
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

/** Marks in-app notifications read (or unread) for the team. Any signed-in admin. */
export async function markNotifications(ids: string[] | 'all', read = true): Promise<Result> {
  try {
    await requirePermission();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const list = ids === 'all' ? null : (Array.isArray(ids) ? ids : []).filter(isUuid).slice(0, 500);
  if (list && !list.length) return { ok: true };
  await db
    .update(s.notifications)
    .set({ readAt: read ? new Date() : null })
    .where(list ? inArray(s.notifications.id, list) : read ? isNull(s.notifications.readAt) : undefined);
  return { ok: true };
}

const prefsSchema = z.object({
  email: z.boolean(),
  lowStock: z.boolean(),
  newOrder: z.boolean(),
  newAppointment: z.boolean(),
  newReview: z.boolean(),
});

/** Which events create notifications for the team. */
export async function saveNotificationPrefs(prefs: StoreSettings['notifications']): Promise<Result> {
  return adminAction('settings.general', async (admin) => {
    const parsed = prefsSchema.safeParse(prefs);
    if (!parsed.success) throw new ActionError('Please check the notification settings.');
    await db.transaction(async (tx) => {
      await writeSetting(tx, 'notifications', parsed.data, admin);
      await audit(tx, admin, { section: 'Settings', action: 'Updated notification preferences' });
    });
    return { ok: true };
  });
}

/* ------------------------------------------------------------------ */
/* Telegram team alerts (sent from Phase 9)                            */
/* ------------------------------------------------------------------ */

const telegramSchema = z.object({
  chatId: z
    .string()
    .trim()
    .regex(/^(-?\d{1,20}|@[A-Za-z0-9_]{5,32})?$/, 'A chat ID is a number (groups start with -) or @channelname.'),
  notifyOrders: z.boolean(),
  notifyAppointments: z.boolean(),
  orderTemplate: z.string().trim().min(1, 'Write the new-order message.').max(3000),
  appointmentTemplate: z.string().trim().min(1, 'Write the new-appointment message.').max(3000),
});

/** The team chat, which alerts to send and their messages. The bot token is never stored. */
export async function saveTelegram(value: TelegramSettings): Promise<Result> {
  return adminAction('settings.general', async (admin) => {
    const parsed = telegramSchema.safeParse(value);
    if (!parsed.success)
      throw new ActionError(parsed.error.issues[0]?.message ?? 'Please check the Telegram settings.');
    await db.transaction(async (tx) => {
      await writeSetting(tx, 'telegram', parsed.data, admin);
      await audit(tx, admin, { section: 'Settings', action: 'Updated Telegram alerts' });
    });
    return { ok: true };
  });
}

const SAMPLE = {
  order_number: 'LXC-482913',
  customer_name: 'Test Customer',
  customer_phone: '0803 000 0000',
  products: '1 × Body Wave Wig (18")',
  total_amount: '₦287,500',
  payment_method: 'Bank Transfer',
  delivery_state: 'Lagos',
  transaction_reference: '58310472',
};

/** Sends a test new-order alert to the saved chat (or TELEGRAM_ADMIN_CHAT_ID). */
export async function sendTelegramTest(): Promise<Result> {
  return adminAction('settings.general', async (admin) => {
    const rows = await loadSettingsRows();
    const saved = {
      ...DEFAULT_TELEGRAM,
      ...((rows.find((r) => r.key === 'telegram')?.value ?? {}) as Partial<TelegramSettings>),
    };
    const chatId = saved.chatId || env.TELEGRAM_ADMIN_CHAT_ID;
    if (!chatId) throw new ActionError('Save the alert chat ID first.');
    const res = await sendTelegramMessage(
      chatId,
      `✅ Test from LUXICHIC admin\n\n${fillTemplate(saved.orderTemplate, SAMPLE)}`,
    );
    if (!res.ok) throw new ActionError(res.error);
    await audit(db, admin, { section: 'Settings', action: 'Sent Telegram test message' });
    return { ok: true };
  });
}
