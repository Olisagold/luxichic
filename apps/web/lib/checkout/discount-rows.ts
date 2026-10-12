import 'server-only';
import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { discounts } from '@/db/schema';
import type { Discount } from '@/types/admin';

/** Promo codes need an end date in the database; this one stands for "no end" and shows as blank. */
export const NO_END = '2099-12-31';

export function toDiscount(r: typeof discounts.$inferSelect): Discount {
  return {
    id: r.id,
    code: r.code,
    type: r.type,
    value: r.value,
    minSpend: r.minSpend,
    startsAt: r.startsOn,
    endsAt: r.endsOn === NO_END ? '' : r.endsOn,
    usageLimit: r.usageLimit,
    used: r.usedCount,
    active: r.active,
    scope: r.scope,
  };
}

/** Every promo code, newest first (admin; callers check access). */
export async function listDiscounts(): Promise<Discount[]> {
  const rows = await db.select().from(discounts).orderBy(desc(discounts.createdAt));
  return rows.map(toDiscount);
}
