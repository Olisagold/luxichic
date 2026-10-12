'use server';

import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { wishlists } from '@/db/schema';
import { authReady } from '@/lib/auth/helpers';
import { getCustomer } from '@/lib/auth/session';
import { findProductById } from '@/lib/storefront/catalog';
import { getStorefrontData } from '@/lib/storefront/data';
import type { Result } from '@/types/user';

/** The wishlist lives on the customer's account (`wishlists`). Guests are asked to sign in. */
export type WishlistResult = Result & {
  signedIn: boolean;
  /** Saved product ids, newest first. */
  ids: string[];
};

const idsSchema = z.array(z.string().min(1).max(64)).max(200);

async function customerId(): Promise<string | null> {
  if (!authReady()) return null;
  return (await getCustomer())?.id ?? null;
}

async function readWishlist(userId: string): Promise<WishlistResult> {
  const rows = await db
    .select({ productId: wishlists.productId })
    .from(wishlists)
    .where(eq(wishlists.userId, userId))
    .orderBy(desc(wishlists.createdAt));
  return { ok: true, signedIn: true, ids: rows.map((r) => r.productId) };
}

/** Only products on sale in the shop can be saved. */
async function publishedIds(ids: string[]): Promise<string[]> {
  const data = await getStorefrontData();
  return [...new Set(ids)].filter((id) => !!findProductById(data, id));
}

/**
 * The signed-in customer's wishlist. `pending` are products a guest tried to save before signing in (and the
 * prototype's browser wishlist); they're added first.
 */
export async function syncWishlist(pending: string[] = []): Promise<WishlistResult> {
  const userId = await customerId();
  if (!userId) return { ok: true, signedIn: false, ids: [] };
  const parsed = idsSchema.safeParse(pending);
  const ids = parsed.success ? await publishedIds(parsed.data) : [];
  if (ids.length) {
    await db
      .insert(wishlists)
      .values(ids.map((productId) => ({ userId, productId })))
      .onConflictDoNothing();
  }
  return readWishlist(userId);
}

/** Saves or unsaves one product. */
export async function setWishlisted(productId: string, saved: boolean): Promise<WishlistResult> {
  const userId = await customerId();
  if (!userId) return { ok: false, error: 'Please sign in to use your wishlist.', signedIn: false, ids: [] };
  if (saved) {
    const [id] = await publishedIds([productId]);
    if (!id) return { ...(await readWishlist(userId)), ok: false, error: 'This product is no longer available.' };
    await db.insert(wishlists).values({ userId, productId: id }).onConflictDoNothing();
  } else if (z.string().uuid().safeParse(productId).success) {
    await db.delete(wishlists).where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)));
  }
  return readWishlist(userId);
}
