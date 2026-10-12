import 'server-only';
import { randomInt } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * Order identifiers (plan.md → Payment flow). The database enforces that both are unique and never equal;
 * `placeOrder` retries with new ones on a collision.
 */

/** Customer-facing 8-digit transaction reference, used as the bank-transfer narration. */
export const newTransactionReference = () => String(randomInt(10_000_000, 100_000_000));

/** Internal order number, e.g. LXC-482913. */
export const newOrderNumber = () => `LXC-${randomInt(100_000, 1_000_000)}`;

export const isTransactionReference = (v: unknown): v is string => typeof v === 'string' && /^[1-9]\d{7}$/.test(v);

/* ------------------------------------------------------------------ */
/* Which orders this browser placed                                    */
/* ------------------------------------------------------------------ */

/**
 * Order ids (random UUIDs, so they can't be guessed) of orders placed in this browser. The confirmation page
 * only shows an order to its account or to the browser that placed it; anyone else tracks it with the order
 * number and email.
 */
const PLACED_COOKIE = 'lx_orders';
const MAX_REMEMBERED = 20;

export async function placedOrderIds(): Promise<string[]> {
  const raw = (await cookies()).get(PLACED_COOKIE)?.value ?? '';
  return raw.split('.').filter((id) => /^[0-9a-f-]{36}$/.test(id));
}

export async function rememberPlacedOrder(id: string): Promise<void> {
  const ids = [id, ...(await placedOrderIds()).filter((x) => x !== id)].slice(0, MAX_REMEMBERED);
  (await cookies()).set(PLACED_COOKIE, ids.join('.'), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  });
}
