'use server';

import { and, eq, gte, like } from 'drizzle-orm';
import { after } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import * as s from '@/db/schema';
import { sendTemplateEmail } from '@/lib/email/send';
import { isValidEmail, isValidPhone } from '@/lib/utils/validation';
import type { Result } from '@/types/user';

/**
 * The contact page. A message is kept as a team notification (the bell and Admin → Notifications, with the full
 * text) and emailed to the business address, with the customer as reply-to so the team can answer from email.
 */

const SUBJECTS = ['Order enquiry', 'Product question', 'Salon appointment', 'Wholesale / business', 'Other'];

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().max(200),
  phone: z.string().trim().max(30),
  subject: z.string().refine((v) => SUBJECTS.includes(v)),
  message: z.string().trim().min(10).max(5000),
  /** A field people can't see; anything in it means a bot filled the form. */
  website: z.string().max(200).optional(),
});

export async function sendContactMessage(input: z.input<typeof schema>): Promise<Result> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Please check the form and try again.' };
  const d = parsed.data;
  if (!isValidEmail(d.email)) return { ok: false, error: 'Please enter a valid email address.' };
  if (d.phone && !isValidPhone(d.phone)) return { ok: false, error: 'Please enter a valid phone number.' };
  if (d.website) return { ok: true }; // bot: pretend it worked

  // At most 3 messages an hour from one address.
  const recent = await db
    .select({ id: s.notifications.id })
    .from(s.notifications)
    .where(
      and(
        eq(s.notifications.kind, 'customer'),
        like(s.notifications.title, `%<${d.email.toLowerCase()}>`),
        gte(s.notifications.createdAt, new Date(Date.now() - 3_600_000)),
      ),
    );
  if (recent.length >= 3) {
    return { ok: false, error: 'You’ve sent a few messages already. We’ll reply soon, or chat with us on WhatsApp.' };
  }

  await db.insert(s.notifications).values({
    kind: 'customer',
    title: `${d.subject} from ${d.name} <${d.email.toLowerCase()}>`,
    body: `${d.phone ? `${d.phone}\n` : ''}${d.message}`,
    link: `mailto:${d.email}?subject=${encodeURIComponent(`Re: ${d.subject}`)}`,
  });

  after(async () => {
    try {
      const [row] = await db.select({ value: s.settings.value }).from(s.settings).where(eq(s.settings.key, 'business'));
      const to = (row?.value as { email?: string } | undefined)?.email;
      if (!to || !isValidEmail(to)) {
        console.info('[contact] no business email to forward the message to (Settings → Business)');
        return;
      }
      await sendTemplateEmail(
        'contact_message',
        to,
        { name: d.name, email: d.email, phone: d.phone || 'not given', subject: d.subject, message: d.message },
        {},
        { replyTo: d.email },
      );
    } catch (e) {
      console.error('[contact] forwarding failed:', e);
    }
  });
  return { ok: true };
}
