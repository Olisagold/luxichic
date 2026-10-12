import 'server-only';
import { asc, desc } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import type { AdminNotification, EmailTemplate, StoreSettings } from '@/types/admin';

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
  /** The team chat that receives alerts; falls back to TELEGRAM_ADMIN_CHAT_ID. */
  chatId: string;
  notifyOrders: boolean;
  notifyAppointments: boolean;
  orderTemplate: string;
  appointmentTemplate: string;
}

export const DEFAULT_TELEGRAM: TelegramSettings = {
  chatId: '',
  notifyOrders: true,
  notifyAppointments: true,
  orderTemplate:
    '🛍 New order {{order_number}}\n{{customer_name}} · {{customer_phone}}\n{{products}}\nTotal: {{total_amount}} ({{payment_method}})\nDeliver to: {{delivery_state}}\nRef: {{transaction_reference}}',
  appointmentTemplate:
    '💅 New appointment {{appointment_reference}}\n{{customer_name}} · {{customer_phone}}\n{{service_name}} with {{specialist_name}}\n{{appointment_date}} at {{appointment_time}}',
};

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
    security: value<StoreSettings['security']>(rows, 'security') ?? { sessionTimeoutMinutes: 60, loginAlerts: true },
  };
  return {
    settings,
    email: {
      senderName: email.senderName ?? 'LUXICHIC',
      senderEmail: email.senderEmail ?? '',
      replyTo: email.replyTo ?? '',
    },
    telegram: { ...DEFAULT_TELEGRAM, ...(value<Partial<TelegramSettings>>(rows, 'telegram') ?? {}) },
  };
}

export async function loadEmailTemplates(): Promise<EmailTemplate[]> {
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

export async function loadNotifications(limit = 200): Promise<AdminNotification[]> {
  const rows = await db.select().from(s.notifications).orderBy(desc(s.notifications.createdAt)).limit(limit);
  return rows.map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    at: n.createdAt.toISOString(),
    read: !!n.readAt,
    link: n.link ?? undefined,
  }));
}
