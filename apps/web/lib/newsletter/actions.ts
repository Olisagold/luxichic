'use server';

import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { isValidEmail } from '@/lib/utils/validation';
import type { Result } from '@/types/user';

/** Homepage newsletter sign-up. Signing up again is fine (and re-subscribes someone who left). */
export async function subscribeToNewsletter(email: string, source = 'homepage'): Promise<Result> {
  const address = String(email ?? '')
    .trim()
    .toLowerCase();
  if (!isValidEmail(address) || address.length > 200)
    return { ok: false, error: 'Please enter a valid email address.' };
  // The unique index is on lower(email), which Drizzle's conflict target can't name.
  await db.execute(sql`
    insert into newsletter_subscribers (email, source) values (${address}, ${String(source).slice(0, 40)})
    on conflict (lower(email)) do update set unsubscribed_at = null`);
  return { ok: true };
}
