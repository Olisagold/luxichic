'use server';

import { eq, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { discounts } from '@/db/schema';
import { ActionError, adminAction, audit } from '@/lib/auth/admin-action';
import { NO_END, toDiscount } from '@/lib/checkout/discount-rows';
import { lagosToday } from '@/lib/checkout/promo';
import { isUuid } from '@/lib/utils/validation';
import type { Discount } from '@/types/admin';
import type { Result } from '@/types/user';

/**
 * Promo codes (`discounts.manage`). Checkout checks codes against this table (lib/checkout/promo.ts), so a change
 * applies to the next checkout. Codes are case-insensitive and stored in capitals.
 */

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const discountSchema = z
  .object({
    id: z.string(),
    code: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{2,40}$/, 'Use 2–40 letters, digits, - or _.'),
    type: z.enum(['percent', 'fixed']),
    value: z.number().int().min(1, 'Enter an amount above 0.'),
    minSpend: z.number().int().min(0),
    startsAt: z.string().regex(DATE).or(z.literal('')),
    endsAt: z.string().regex(DATE).or(z.literal('')),
    usageLimit: z.number().int().min(1).nullable(),
    active: z.boolean(),
    scope: z.enum(['all', 'hairs', 'tools']),
  })
  .refine((d) => d.type !== 'percent' || d.value <= 100, { message: 'A percentage can be at most 100.' })
  .refine((d) => !d.endsAt || !d.startsAt || d.endsAt >= d.startsAt, {
    message: 'The end date is before the start date.',
  });

/** Creates a promo code, or saves one (by id). The code must be unique, ignoring case. */
export async function saveDiscount(input: Discount): Promise<Result & { discount?: Discount }> {
  return adminAction('discounts.manage', async (admin) => {
    const parsed = discountSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(parsed.error.issues[0]?.message ?? 'Please check the fields.');
    const d = parsed.data;
    const code = d.code.toUpperCase();
    const existingId = isUuid(d.id) ? d.id : null;
    const [clash] = await db
      .select({ id: discounts.id })
      .from(discounts)
      .where(
        existingId
          ? sql`lower(${discounts.code}) = lower(${code}) and ${ne(discounts.id, existingId)}`
          : sql`lower(${discounts.code}) = lower(${code})`,
      );
    if (clash) throw new ActionError('Another promo code already uses this code.');

    const values = {
      code,
      type: d.type,
      value: d.value,
      minSpend: d.minSpend,
      startsOn: d.startsAt || lagosToday(),
      endsOn: d.endsAt || NO_END,
      usageLimit: d.usageLimit,
      active: d.active,
      scope: d.scope,
    };
    const row = await db.transaction(async (tx) => {
      const [saved] = existingId
        ? await tx
            .update(discounts)
            .set({ ...values, updatedAt: new Date() })
            .where(eq(discounts.id, existingId))
            .returning()
        : await tx.insert(discounts).values(values).returning();
      if (!saved) throw new ActionError('Promo code not found.');
      await audit(tx, admin, {
        section: 'Discounts',
        action: existingId ? 'Edited discount' : 'Created discount',
        target: code,
      });
      return saved;
    });
    return { ok: true, discount: toDiscount(row) };
  });
}

/** Deletes a promo code. Orders that used it keep the code and discount they got. */
export async function deleteDiscount(id: string): Promise<Result> {
  return adminAction('discounts.manage', async (admin) => {
    if (!isUuid(id)) throw new ActionError('Promo code not found.');
    await db.transaction(async (tx) => {
      const [removed] = await tx.delete(discounts).where(eq(discounts.id, id)).returning({ code: discounts.code });
      if (!removed) throw new ActionError('Promo code not found.');
      await audit(tx, admin, { section: 'Discounts', action: 'Deleted discount', target: removed.code });
    });
    return { ok: true };
  });
}
