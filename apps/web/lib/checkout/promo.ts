import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { discounts } from '@/db/schema';
import type { PromoRule } from '@/lib/checkout/pricing';

/** Today's date in Nigeria (promo codes start and end on whole days). */
export const lagosToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });

type Executor = Pick<typeof db, 'select'>;

/** The rule for a promo code customers can use today, or why they can't. Codes are case-insensitive. */
export async function findPromo(
  code: string,
  executor: Executor = db,
): Promise<{ rule: PromoRule; id: string } | { error: string }> {
  const clean = code.trim();
  if (!clean || clean.length > 40) return { error: 'That code is not valid.' };
  const [row] = await executor
    .select()
    .from(discounts)
    .where(sql`lower(${discounts.code}) = lower(${clean})`);
  const today = lagosToday();
  if (!row || !row.active || today < row.startsOn) return { error: 'That code is not valid.' };
  if (today > row.endsOn) return { error: 'That code has expired.' };
  if (row.usageLimit !== null && row.usedCount >= row.usageLimit) {
    return { error: 'That code has reached its usage limit.' };
  }
  return {
    id: row.id,
    rule: { code: row.code, type: row.type, value: row.value, minSpend: row.minSpend, scope: row.scope },
  };
}
