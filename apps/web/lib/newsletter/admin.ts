'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { ActionError, adminAction, audit } from '@/lib/auth/admin-action';
import { isUuid } from '@/lib/utils/validation';
import type { Result } from '@/types/user';

/** Removes a subscriber for good (when someone asks to be taken off the list). */
export async function removeSubscriber(id: string): Promise<Result> {
  return adminAction('customers.edit', async (admin) => {
    if (!isUuid(id)) throw new ActionError('Subscriber not found.');
    const [row] = await db
      .delete(s.newsletterSubscribers)
      .where(eq(s.newsletterSubscribers.id, id))
      .returning({ email: s.newsletterSubscribers.email });
    if (!row) throw new ActionError('Subscriber not found.');
    await audit(db, admin, { section: 'Customers', action: 'Removed newsletter subscriber', target: row.email });
    return { ok: true };
  });
}
