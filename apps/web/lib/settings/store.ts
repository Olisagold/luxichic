import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { ensureEmailTemplates } from '@/lib/email/send';
import * as s from '@/db/schema';
import type { EmailTemplate, StoreSettings } from '@/types/admin';

/**
 * Store settings as the admin edits them, read from the `settings` rows (one JSON value per key), the delivery
 * rates table and the email templates. Missing rows get sensible defaults (a new project starts with only the
 * public ones).
 */

export interface EmailSender {
  senderName: string;
  senderEmail: string;
  replyTo: string;
}

export interface TelegramSettings {
  /** The appointments group (all bookings); falls back to TELEGRAM_ADMIN_CHAT_ID. */
  chatId: string;
  /** Its name in Telegram, saved when it's connected with a link. */
  chatTitle: string;
  /** The orders group (new orders only). No fallback: orders never go to the appointments group. */
  ordersChatId: string;
  ordersChatTitle: string;
  notifyOrders: boolean;
  notifyAppointments: boolean;
  /** Private messages to each specialist about their own bookings (they connect from Admin → Telegram). */
  notifySpecialists: boolean;
  orderTemplate: string;
  appointmentTemplate: string;
}

export const DEFAULT_TELEGRAM: TelegramSettings = {
  chatId: '',
  chatTitle: '',
  ordersChatId: '',
  ordersChatTitle: '',
  notifyOrders: true,
  notifyAppointments: true,
  notifySpecialists: true,
  orderTemplate:
    '🛍 New order {{order_number}}\n{{customer_name}} · {{customer_phone}}\n\n{{products}}\n\nSubtotal: {{subtotal}}\nDelivery: {{delivery_fee}}\n{{discount}}\nTotal: {{total_amount}} ({{payment_method}})\n\nDeliver to: {{delivery_address}}\n{{delivery_notes}}\nRef: {{transaction_reference}}',
  appointmentTemplate:
    '💅 New appointment {{appointment_reference}}\n{{customer_name}} · {{customer_phone}}\n{{service_name}} with {{specialist_name}}\n{{appointment_date}} at {{appointment_time}}',
};

/** The first new-order message, before it listed prices and the full address. */
const ORIGINAL_ORDER_TEMPLATE =
  '🛍 New order {{order_number}}\n{{customer_name}} · {{customer_phone}}\n{{products}}\nTotal: {{total_amount}} ({{payment_method}})\nDeliver to: {{delivery_state}}\nRef: {{transaction_reference}}';

/**
 * Saved Telegram settings with defaults for anything not saved yet. A message template still saved exactly as the
 * original default moves to the current default; one the admin has changed is kept as it is.
 */
export function withTelegramDefaults(saved: unknown): TelegramSettings {
  const t = { ...DEFAULT_TELEGRAM, ...((saved ?? {}) as Partial<TelegramSettings>) };
  if (t.orderTemplate === ORIGINAL_ORDER_TEMPLATE) t.orderTemplate = DEFAULT_TELEGRAM.orderTemplate;
  return t;
}

/** Telegram settings with defaults for anything not saved yet. */
export async function loadTelegramSettings(): Promise<TelegramSettings> {
  const [row] = await db.select({ value: s.settings.value }).from(s.settings).where(eq(s.settings.key, 'telegram'));
  return withTelegramDefaults(row?.value);
}

const value = <T>(rows: { key: string; value: unknown }[], key: string): T | undefined =>
  rows.find((r) => r.key === key)?.value as T | undefined;

export async function loadSettingsRows() {
  return db.select({ key: s.settings.key, value: s.settings.value }).from(s.settings);
}

/** Everything the operations and settings pages show. */
export async function loadStoreSettings(): Promise<{
  settings: StoreSettings;
  email: EmailSender;
  telegram: TelegramSettings;
}> {
  const rows = await loadSettingsRows();
  const rates = await db.select().from(s.deliveryRates).orderBy(asc(s.deliveryRates.state));
  const links = await db.select().from(s.socialLinks).orderBy(asc(s.socialLinks.sortOrder));
  const business = value<StoreSettings['business']>(rows, 'business') ?? {
    name: 'LUXICHIC',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    hours: '',
  };
  const instagram = value<{ urls: StoreSettings['instagram']; handles: StoreSettings['instagramHandles'] }>(
    rows,
    'instagram',
  ) ?? { urls: { hairs: '', salon: '', tools: '' }, handles: { hairs: '', salon: '', tools: '' } };
  const email = value<Partial<EmailSender>>(rows, 'email') ?? {};
  const settings: StoreSettings = {
    business,
    instagram: instagram.urls,
    instagramHandles: instagram.handles,
    tiktok: value<StoreSettings['tiktok']>(rows, 'tiktok'),
    socialLinks: links.map((l) => ({
      id: l.id,
      platform: l.platform,
      division: l.division,
      handle: l.handle,
      url: l.url,
      enabled: l.enabled,
    })),
    payOnDeliveryEnabled: value<{ enabled: boolean }>(rows, 'pay_on_delivery')?.enabled ?? false,
    bank: value<StoreSettings['bank']>(rows, 'bank') ?? {
      bankName: '',
      accountName: '',
      accountNumber: '',
      instructions: '',
    },
    delivery: {
      rates: rates.map((r) => ({ state: r.state, fee: r.fee, free: r.isFree, enabled: r.enabled })),
      estimate: value<{ text: string }>(rows, 'delivery_estimate')?.text ?? '',
    },
    whatsapp: value<StoreSettings['whatsapp']>(rows, 'whatsapp') ?? {
      status: 'disconnected',
      businessNumber: business.whatsapp,
      adminNumber: business.whatsapp,
      apiKeySet: false,
      apiKeyLast4: '',
      webhookUrl: '',
      notifyOrders: true,
      notifyAppointments: true,
      orderTemplate: '',
      appointmentTemplate: '',
    },
    // The SMTP form was replaced by Resend (sender details in `email`); kept for the type's other readers.
    smtp: {
      host: '',
      port: 0,
      username: '',
      passwordSet: false,
      encryption: 'TLS',
      senderName: email.senderName ?? 'LUXICHIC',
      senderEmail: email.senderEmail ?? '',
    },
    notifications: value<StoreSettings['notifications']>(rows, 'notifications') ?? {
      email: true,
      lowStock: true,
      newOrder: true,
      newAppointment: true,
      newReview: true,
    },
    security: {
      sessionTimeoutMinutes: 60,
      loginAlerts: true,
      ...value<Partial<StoreSettings['security']>>(rows, 'security'),
    },
  };
  return {
    settings,
    email: {
      senderName: email.senderName ?? 'LUXICHIC',
      senderEmail: email.senderEmail ?? '',
      replyTo: email.replyTo ?? '',
    },
    telegram: withTelegramDefaults(value(rows, 'telegram')),
  };
}

/** Sign-in alerts and the idle timeout (read by the admin layout on every page). */
export async function loadSecurity(): Promise<StoreSettings['security']> {
  const [row] = await db.select({ value: s.settings.value }).from(s.settings).where(eq(s.settings.key, 'security'));
  return {
    sessionTimeoutMinutes: 60,
    loginAlerts: true,
    ...((row?.value ?? {}) as Partial<StoreSettings['security']>),
  };
}

export async function loadEmailTemplates(): Promise<EmailTemplate[]> {
  await ensureEmailTemplates();
  const rows = await db.select().from(s.emailTemplates).orderBy(asc(s.emailTemplates.name));
  return rows.map((t) => ({
    id: t.key,
    name: t.name,
    subject: t.subject,
    body: t.body,
    variables: t.variables,
    enabled: t.enabled,
  }));
}
