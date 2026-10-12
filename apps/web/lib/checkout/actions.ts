'use server';

import { env } from '@/lib/env';
import { findPromo } from '@/lib/checkout/promo';
import type { PromoRule } from '@/lib/checkout/pricing';
import type { Result } from '@/types/user';

/** Checks a promo code for the cart. The cart shows the discount; `placeOrder` checks the code again. */
export async function checkPromoCode(code: string): Promise<Result & { rule?: PromoRule }> {
  if (!env.DATABASE_URL) return { ok: false, error: 'Promo codes are not available right now.' };
  if (typeof code !== 'string') return { ok: false, error: 'That code is not valid.' };
  const found = await findPromo(code);
  if ('error' in found) return { ok: false, error: found.error };
  return { ok: true, rule: found.rule };
}
