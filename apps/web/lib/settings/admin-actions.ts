'use server';

import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { socialPlatforms } from '@/data/socialLinks';
import { db } from '@/db';
import * as s from '@/db/schema';
import { ActionError, adminAction, audit } from '@/lib/auth/admin-action';
import { requirePermission } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { markReadFor } from '@/lib/notifications/for-admin';
import { loadTelegramSettings, type TelegramSettings } from '@/lib/settings/store';
import { STOREFRONT_TAG } from '@/lib/storefront/data';
import { botInfo, sendTelegramMessage } from '@/lib/telegram/client';
import { newGroupToken, newSpecialistToken, type GroupKind } from '@/lib/telegram/connect';
import { fillTemplate } from '@/lib/utils/text';
import { isUuid, isValidEmail } from '@/lib/utils/validation';
import type { AdminUser, SocialLink, StoreSettings } from '@/types/admin';
import type { Result } from '@/types/user';

/**
 * Store settings: business details, social links and security, plus the operations settings (payments, delivery,
 * email, notifications and Telegram alerts). Each action checks its
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
/* Business, social links and security                                 */
/* ------------------------------------------------------------------ */

const whatsappNumber = z
  .string()
  .regex(/^(\d{10,15})?$/, 'WhatsApp: use international format digits, e.g. 2348012345678.');

const businessSchema = z.object({
  name: z.string().trim().min(2, 'Enter the business name.').max(80),
  email: z.string().trim().refine(isValidEmail, 'Enter a valid email.'),
  phone: z.string().trim().max(40),
  whatsapp: whatsappNumber,
  address: z.string().trim().max(300),
  hours: z.string().trim().max(200),
});

async function currentBusiness(tx: Tx) {
  const [row] = await tx.select({ value: s.settings.value }).from(s.settings).where(eq(s.settings.key, 'business'));
  return (row?.value ?? {}) as Partial<StoreSettings['business']>;
}

/** The store name and contact details shown on the Contact page, footer, emails and WhatsApp buttons. */
export async function saveBusiness(
  business: StoreSettings['business'],
  mode: 'general' | 'business' = 'business',
): Promise<Result> {
  return adminAction(
    'settings.general',
    async (admin) => {
      const parsed = businessSchema.safeParse(business);
      if (!parsed.success) throw new ActionError(parsed.error.issues[0]?.message ?? 'Please check the details.');
      await db.transaction(async (tx) => {
        await writeSetting(tx, 'business', parsed.data, admin);
        await audit(tx, admin, {
          section: 'Settings',
          action: mode === 'general' ? 'Updated general settings' : 'Updated business information',
        });
      });
      return { ok: true };
    },
    { revalidate: [STOREFRONT_TAG] },
  );
}

const socialSchema = z
  .array(
    z.object({
      platform: z.enum(Object.keys(socialPlatforms) as [SocialLink['platform'], ...SocialLink['platform'][]]),
      division: z.enum(['main', 'hairs', 'salon', 'tools']),
      handle: z.string().trim().max(80),
      url: z.string().trim().min(1).max(500),
      enabled: z.boolean(),
    }),
  )
  .max(60);

/** Replaces the footer social links (in the order given) and sets the floating WhatsApp chat number. */
export async function saveSocialLinks(links: SocialLink[], chatNumber: string): Promise<Result> {
  return adminAction(
    'settings.general',
    async (admin) => {
      const parsed = socialSchema.safeParse(links);
      if (!parsed.success) throw new ActionError('Please check the social links.');
      const bad = parsed.data.find((l) => {
        const pattern = socialPlatforms[l.platform].pattern;
        return pattern && !pattern.test(l.url);
      });
      if (bad) throw new ActionError(`Check the ${socialPlatforms[bad.platform].label} link (${bad.url}).`);
      const chat = whatsappNumber.safeParse(String(chatNumber ?? ''));
      if (!chat.success) throw new ActionError('Floating chat number: use international format digits.');
      await db.transaction(async (tx) => {
        await tx.delete(s.socialLinks);
        if (parsed.data.length) {
          await tx.insert(s.socialLinks).values(parsed.data.map((l, i) => ({ ...l, sortOrder: i })));
        }
        const business = await currentBusiness(tx);
        if ((business.whatsapp ?? '') !== chat.data) {
          await writeSetting(tx, 'business', { ...business, whatsapp: chat.data }, admin);
        }
        await audit(tx, admin, {
          section: 'Settings',
          action: 'Updated footer social links',
          target: `${parsed.data.filter((l) => l.enabled).length} visible`,
        });
      });
      return { ok: true };
    },
    { revalidate: [STOREFRONT_TAG] },
  );
}

const SESSION_TIMEOUTS = [15, 30, 60, 240, 1440] as const;

/** Sign-in alerts and how long an idle admin stays signed in. */
export async function saveSecuritySettings(security: StoreSettings['security']): Promise<Result> {
  return adminAction('settings.general', async (admin) => {
    const minutes = Number(security?.sessionTimeoutMinutes);
    if (!(SESSION_TIMEOUTS as readonly number[]).includes(minutes)) throw new ActionError('Choose a timeout.');
    const value = { sessionTimeoutMinutes: minutes, loginAlerts: !!security?.loginAlerts };
    await db.transaction(async (tx) => {
      const [row] = await tx.select({ value: s.settings.value }).from(s.settings).where(eq(s.settings.key, 'security'));
      const before = row?.value as StoreSettings['security'] | undefined;
      await writeSetting(tx, 'security', value, admin);
      await audit(tx, admin, {
        section: 'Security',
        action:
          before && before.loginAlerts !== value.loginAlerts
            ? value.loginAlerts
              ? 'Enabled login alerts'
              : 'Disabled login alerts'
            : 'Changed session timeout',
      });
    });
    return { ok: true };
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

/** Marks this admin's notifications read (or unread). Any signed-in admin; others' bells aren't affected. */
export async function markNotifications(ids: string[] | 'all', read = true): Promise<Result> {
  let admin: AdminUser;
  try {
    admin = await requirePermission();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const list = ids === 'all' ? 'all' : (Array.isArray(ids) ? ids : []).filter(isUuid).slice(0, 500);
  if (list !== 'all' && !list.length) return { ok: true };
  await markReadFor(admin, list, !!read);
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

const chatIdField = z
  .string()
  .trim()
  .regex(/^(-?\d{1,20}|@[A-Za-z0-9_]{5,32})?$/, 'A chat ID is a number (groups start with -) or @channelname.');

const telegramSchema = z.object({
  chatId: chatIdField,
  ordersChatId: chatIdField,
  notifyOrders: z.boolean(),
  notifyAppointments: z.boolean(),
  notifySpecialists: z.boolean(),
  orderTemplate: z.string().trim().min(1, 'Write the new-order message.').max(3000),
  appointmentTemplate: z.string().trim().min(1, 'Write the new-appointment message.').max(3000),
});

/** The two groups, which alerts to send and their messages. The bot token is never stored. */
export async function saveTelegram(value: TelegramSettings): Promise<Result> {
  return adminAction('settings.general', async (admin) => {
    const parsed = telegramSchema.safeParse(value);
    if (!parsed.success)
      throw new ActionError(parsed.error.issues[0]?.message ?? 'Please check the Telegram settings.');
    const saved = await loadTelegramSettings();
    const d = parsed.data;
    // A group's name is only known for a chat connected with a link; typing a different ID forgets it.
    const next: TelegramSettings = {
      ...d,
      chatTitle: d.chatId === saved.chatId ? saved.chatTitle : '',
      ordersChatTitle: d.ordersChatId === saved.ordersChatId ? saved.ordersChatTitle : '',
    };
    await db.transaction(async (tx) => {
      await writeSetting(tx, 'telegram', next, admin);
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

const SAMPLE_APPOINTMENT = {
  appointment_reference: 'APT-482913',
  customer_name: 'Test Customer',
  customer_phone: '0803 000 0000',
  service_name: 'Manicure',
  specialist_name: 'Specialist A',
  appointment_date: '18 Oct 2026',
  appointment_time: '10:00 AM',
};

export type TelegramTarget = 'appointments' | 'orders' | { specialistId: string };

/** Sends a test message to a group or a specialist's private chat. */
export async function sendTelegramTest(target: TelegramTarget = 'appointments'): Promise<Result> {
  return adminAction('settings.general', async (admin) => {
    const tg = await loadTelegramSettings();
    let chatId: string | null | undefined;
    let text: string;
    let label: string;
    if (target === 'orders') {
      chatId = tg.ordersChatId;
      text = `✅ Test from LUXICHIC admin: new orders will look like this.\n\n${fillTemplate(tg.orderTemplate, SAMPLE)}`;
      label = 'orders group';
    } else if (target === 'appointments') {
      chatId = tg.chatId || env.TELEGRAM_ADMIN_CHAT_ID;
      text = `✅ Test from LUXICHIC admin: new bookings will look like this.\n\n${fillTemplate(tg.appointmentTemplate, SAMPLE_APPOINTMENT)}`;
      label = 'appointments group';
    } else {
      if (!isUuid(target?.specialistId)) throw new ActionError('Specialist not found.');
      const [row] = await db
        .select({ chatId: s.specialistAccounts.telegramChatId, name: s.specialists.name })
        .from(s.specialists)
        .leftJoin(s.specialistAccounts, eq(s.specialistAccounts.specialistId, s.specialists.id))
        .where(eq(s.specialists.id, target.specialistId));
      if (!row) throw new ActionError('Specialist not found.');
      chatId = row.chatId;
      text = `✅ Test from LUXICHIC admin, ${row.name}: your booking alerts will arrive here.`;
      label = row.name;
    }
    if (!chatId) throw new ActionError(`Connect the ${label} first.`);
    const res = await sendTelegramMessage(chatId, text);
    if (!res.ok) throw new ActionError(res.error);
    await audit(db, admin, { section: 'Settings', action: 'Sent Telegram test message', target: label });
    return { ok: true };
  });
}

/** The bot's username, for t.me links. */
async function botUsername() {
  const info = await botInfo();
  if (!info.ok) throw new ActionError(info.error);
  return info.username;
}

/** A link that adds the bot to a group and makes it the appointments or orders group (valid 7 days). */
export async function createTelegramGroupLink(kind: GroupKind): Promise<Result & { link?: string }> {
  return adminAction('settings.general', async (admin) => {
    if (kind !== 'appointments' && kind !== 'orders') throw new ActionError('Choose a group.');
    const bot = await botUsername();
    const token = await newGroupToken(kind);
    await audit(db, admin, { section: 'Settings', action: `Created Telegram link for the ${kind} group` });
    return { ok: true, link: `https://t.me/${bot}?startgroup=${token}` };
  });
}

/** Forgets a group, so its alerts stop. */
export async function disconnectTelegramGroup(kind: GroupKind): Promise<Result> {
  return adminAction('settings.general', async (admin) => {
    const tg = await loadTelegramSettings();
    const next =
      kind === 'orders' ? { ...tg, ordersChatId: '', ordersChatTitle: '' } : { ...tg, chatId: '', chatTitle: '' };
    await db.transaction(async (tx) => {
      await writeSetting(tx, 'telegram', next, admin);
      await audit(tx, admin, { section: 'Settings', action: `Disconnected the Telegram ${kind} group` });
    });
    return { ok: true };
  });
}

/** A personal link for a specialist to connect their Telegram (valid 7 days, single use). */
export async function createSpecialistTelegramLink(specialistId: string): Promise<Result & { link?: string }> {
  return adminAction('settings.general', async (admin) => {
    if (!isUuid(specialistId)) throw new ActionError('Specialist not found.');
    const [sp] = await db
      .select({ name: s.specialists.name })
      .from(s.specialists)
      .where(eq(s.specialists.id, specialistId));
    if (!sp) throw new ActionError('Specialist not found.');
    const bot = await botUsername();
    const token = await newSpecialistToken(specialistId);
    await audit(db, admin, { section: 'Settings', action: 'Created Telegram link for a specialist', target: sp.name });
    return { ok: true, link: `https://t.me/${bot}?start=${token}` };
  });
}

/** Stops a specialist's private alerts (they can connect again with a new link). */
export async function disconnectSpecialistTelegram(specialistId: string): Promise<Result> {
  return adminAction('settings.general', async (admin) => {
    if (!isUuid(specialistId)) throw new ActionError('Specialist not found.');
    const [row] = await db
      .update(s.specialistAccounts)
      .set({ telegramChatId: null, telegramName: null, telegramConnectedAt: null, telegramToken: null })
      .where(eq(s.specialistAccounts.specialistId, specialistId))
      .returning({ id: s.specialistAccounts.specialistId });
    if (!row) throw new ActionError('This specialist isn’t connected.');
    await audit(db, admin, { section: 'Settings', action: 'Disconnected a specialist’s Telegram' });
    return { ok: true };
  });
}
