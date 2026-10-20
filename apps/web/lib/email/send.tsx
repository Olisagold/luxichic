import 'server-only';
import { render, toPlainText } from '@react-email/render';
import { eq, inArray } from 'drizzle-orm';
import { Resend } from 'resend';
import { db } from '@/db';
import * as s from '@/db/schema';
import { env } from '@/lib/env';
import { EmailLayout, type EmailBrand, type EmailContent } from '@/lib/email/layout';
import { fillTemplate } from '@/lib/utils/text';

/**
 * Sends customer emails through Resend (RESEND_API_KEY). The subject and text come from `email_templates`, which
 * the admin edits under Email → Templates; a switched-off template isn't sent. The sender name, address and
 * reply-to come from Email → Sender. Without a key or a sender, nothing is sent and the reason is logged.
 */

/** Templates added after the first seed; created on first use so every project has them. */
export const EXTRA_TEMPLATES: (typeof s.emailTemplates.$inferInsert)[] = [
  {
    key: 'order_shipped',
    name: 'Order shipped',
    subject: 'Your order {{order_number}} is on its way',
    body: 'Hi {{customer_name}},\n\nGood news: your order {{order_number}} has left our store and is on its way to you in {{delivery_state}}.',
    variables: ['customer_name', 'order_number', 'delivery_state'],
  },
  {
    key: 'order_delivered',
    name: 'Order delivered',
    subject: 'Your order {{order_number}} has been delivered',
    body: 'Hi {{customer_name}},\n\nYour order {{order_number}} has been delivered. We hope you love it.\n\nWe’d be grateful for a review of what you bought.',
    variables: ['customer_name', 'order_number'],
  },
  {
    key: 'verify_email',
    name: 'Confirm email (earlier orders)',
    subject: 'Confirm your email to see your LUXICHIC orders',
    body: 'Hi {{customer_name}},\n\nWe found {{found}} made with this email before you created your account. Confirm it’s you and they’ll appear in your account, with your delivery address saved for next time.\n\nIf you didn’t create a LUXICHIC account, you can ignore this email.',
    variables: ['customer_name', 'found'],
  },
  {
    key: 'contact_message',
    name: 'Contact form message (to the team)',
    subject: 'New message: {{subject}}',
    body: '{{name}} sent a message through the contact page.\n\nEmail: {{email}}\nPhone: {{phone}}\n\n{{message}}\n\nReply to this email to answer them.',
    variables: ['name', 'email', 'phone', 'subject', 'message'],
  },
  {
    key: 'appt_cancelled',
    name: 'Appointment cancelled',
    subject: 'Your {{service_name}} appointment was cancelled',
    body: 'Hi {{customer_name}},\n\nYour {{service_name}} appointment on {{appointment_date}} at {{appointment_time}} has been cancelled.\n{{reason}}\n\nYou can book a new time on our website whenever you like.',
    variables: ['customer_name', 'service_name', 'appointment_date', 'appointment_time', 'reason'],
  },
];

export async function ensureEmailTemplates() {
  await db.insert(s.emailTemplates).values(EXTRA_TEMPLATES).onConflictDoNothing({ target: s.emailTemplates.key });
}

export type EmailResult = { ok: true; id?: string } | { ok: false; skipped?: boolean; error: string };

let client: Resend | null = null;
const resend = () => (client ??= new Resend(env.RESEND_API_KEY));

/** The sender and the contact details shown in every email's footer. */
async function senderAndBrand() {
  const rows = await db
    .select({ key: s.settings.key, value: s.settings.value })
    .from(s.settings)
    .where(inArray(s.settings.key, ['email', 'business']));
  const value = <T,>(key: string) => (rows.find((r) => r.key === key)?.value ?? {}) as Partial<T>;
  const sender = value<{ senderName: string; senderEmail: string; replyTo: string }>('email');
  const business = value<{ name: string; email: string; phone: string; whatsapp: string }>('business');
  const brand: EmailBrand = {
    siteUrl: env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, ''),
    businessName: business.name || 'LUXICHIC',
    email: business.email ?? '',
    phone: business.phone ?? '',
    whatsapp: business.whatsapp ?? '',
  };
  return {
    from: sender.senderEmail ? `${sender.senderName || brand.businessName} <${sender.senderEmail}>` : null,
    replyTo: sender.replyTo || business.email || undefined,
    brand,
  };
}

async function findTemplate(key: string) {
  let [template] = await db.select().from(s.emailTemplates).where(eq(s.emailTemplates.key, key));
  if (!template && EXTRA_TEMPLATES.some((t) => t.key === key)) {
    await ensureEmailTemplates();
    [template] = await db.select().from(s.emailTemplates).where(eq(s.emailTemplates.key, key));
  }
  return template ?? null;
}

/** Template `key` filled with `values` and wrapped in the layout, as the customer would see it. */
export async function renderTemplateEmail(
  key: string,
  values: Record<string, string>,
  content: Omit<EmailContent, 'body' | 'preview'> = {},
) {
  const template = await findTemplate(key);
  if (!template) return null;
  const { from, replyTo, brand } = await senderAndBrand();
  // Variables with no value are dropped rather than shown as {{name}}.
  const subject = fillTemplate(template.subject, values)
    .replace(/\{\{\w+\}\}/g, '')
    .trim();
  const body = fillTemplate(template.body, values).replace(/\{\{\w+\}\}/g, '');
  const preview = body.split('\n').find((l) => l.trim()) ?? subject;
  const html = await render(<EmailLayout content={{ ...content, body, preview }} brand={brand} />);
  return { subject, html, enabled: template.enabled, from, replyTo };
}

/**
 * Sends template `key` to `to`. `values` fill the {{variables}} in the subject and text; `content` adds the
 * details, items and button around the text.
 */
export async function sendTemplateEmail(
  key: string,
  to: string,
  values: Record<string, string>,
  content: Omit<EmailContent, 'body' | 'preview'> = {},
  options: { replyTo?: string } = {},
): Promise<EmailResult> {
  if (!env.RESEND_API_KEY) return skip(key, 'RESEND_API_KEY is not set');
  const email = await renderTemplateEmail(key, values, content);
  if (!email) return skip(key, 'no such template');
  if (!email.enabled) return skip(key, 'template switched off');
  if (!email.from) return skip(key, 'no sender address (Admin → Email → Sender)');
  try {
    const { data, error } = await resend().emails.send({
      from: email.from,
      to,
      subject: email.subject,
      html: email.html,
      text: toPlainText(email.html),
      replyTo: options.replyTo ?? email.replyTo,
    });
    if (error) {
      console.error(`[email] ${key} to ${to} failed:`, error.message);
      return { ok: false, error: error.message };
    }
    console.info(`[email] sent ${key} to ${to} (${data?.id})`);
    return { ok: true, id: data?.id };
  } catch (e) {
    console.error(`[email] ${key} to ${to} failed:`, e);
    return { ok: false, error: 'Could not reach the email service.' };
  }
}

function skip(key: string, reason: string): EmailResult {
  console.info(`[email] ${key} not sent: ${reason}`);
  return { ok: false, skipped: true, error: reason };
}
