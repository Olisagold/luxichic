'use server';

import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { getAdmin, hasPermission } from '@/lib/auth/session';
import {
  composeAppointment,
  composeOrderPlaced,
  composeOrderUpdate,
  type AppointmentEmail,
  type OrderEmail,
} from '@/lib/email/customer';
import { renderTemplateEmail } from '@/lib/email/send';
import { env } from '@/lib/env';

export type EmailPreviewRequest =
  { order: string; event: 'placed' | OrderEmail } | { appointment: string; event: AppointmentEmail };

export type EmailPreviewResult =
  | { ok: true; to: string; subject: string; html: string; sent: boolean; reason?: string }
  | { ok: false; error: string };

/** The email a customer gets for an order or appointment event, exactly as it's sent (admin only). */
export async function previewCustomerEmail(req: EmailPreviewRequest): Promise<EmailPreviewResult> {
  const admin = await getAdmin();
  const isOrder = 'order' in req;
  if (!admin || !hasPermission(admin, isOrder ? 'orders.view' : 'appointments.view')) {
    return { ok: false, error: 'You don’t have permission to see this email.' };
  }
  let composed = null;
  if (isOrder) {
    const [o] = await db
      .select({ id: s.orders.id })
      .from(s.orders)
      .where(eq(s.orders.orderNumber, String(req.order).toUpperCase()));
    if (o)
      composed = req.event === 'placed' ? await composeOrderPlaced(o.id) : await composeOrderUpdate(o.id, req.event);
  } else {
    const [a] = await db
      .select({ id: s.appointments.id })
      .from(s.appointments)
      .where(sql`upper(${s.appointments.reference}) = upper(${String(req.appointment)})`);
    if (a) composed = await composeAppointment(a.id, req.event);
  }
  if (!composed) return { ok: false, error: 'Not found.' };
  const email = await renderTemplateEmail(composed.key, composed.values, composed.content);
  if (!email) return { ok: false, error: 'This email template is missing.' };
  const reason = !env.RESEND_API_KEY
    ? 'Emails are off: RESEND_API_KEY isn’t set.'
    : !email.from
      ? 'Emails are off until a sender address is saved under Email → Sender.'
      : !email.enabled
        ? 'This template is switched off under Email → Templates, so it isn’t sent.'
        : undefined;
  return { ok: true, to: composed.to, subject: email.subject, html: email.html, sent: !reason, reason };
}
