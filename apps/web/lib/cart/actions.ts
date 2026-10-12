'use server';

import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { cartItems, carts } from '@/db/schema';
import { authReady } from '@/lib/auth/helpers';
import { getCustomer } from '@/lib/auth/session';
import { cartLineSchema } from '@/lib/cart/schema';
import { MAX_QUANTITY, clampQuantity, priceLine, selectionFromKey, type CartLine } from '@/lib/cart/items';
import { env } from '@/lib/env';
import { getStorefrontData } from '@/lib/storefront/data';
import { loadLiveProducts } from '@/lib/storefront/source';
import { priceForSelection } from '@/lib/utils/products';
import { isUuid } from '@/lib/utils/validation';
import type { CartItem } from '@/types/order';
import type { Product } from '@/types/product';
import type { Result } from '@/types/user';

/**
 * The cart, priced on the server. Signed-in customers keep it in `carts` / `cart_items`; guests keep it in the
 * browser and send it here to be repriced. Prices, names and images always come from the catalog, never from the
 * browser: a line is only a product id, an option selection and a quantity.
 */
export type CartResult = Result & {
  /** False for guests: their cart stays in the browser. */
  signedIn: boolean;
  items: CartItem[];
  /** Lines dropped because they can no longer be bought (product removed, option withdrawn). */
  removed: number;
};

const lineSchema = cartLineSchema;
const linesSchema = z.array(lineSchema).max(100);
const keySchema = z.string().min(1).max(1000);

const SIGNED_OUT: CartResult = {
  ok: false,
  error: 'Please sign in again to update your cart.',
  signedIn: false,
  items: [],
  removed: 0,
};
const INVALID = (signedIn: boolean): CartResult => ({
  ok: false,
  error: 'This item is no longer available.',
  signedIn,
  items: [],
  removed: 0,
});

async function customerId(): Promise<string | null> {
  if (!authReady()) return null;
  return (await getCustomer())?.id ?? null;
}

/** The customer's cart id, created on first use. */
async function cartIdFor(userId: string): Promise<string> {
  const [row] = await db
    .insert(carts)
    .values({ userId })
    .onConflictDoUpdate({ target: carts.userId, set: { updatedAt: new Date() } })
    .returning({ id: carts.id });
  return row.id;
}

/**
 * The products for `ids` as they are now, straight from the database: the same prices and stock `placeOrder`
 * uses, so the cart and checkout always agree. Without a database (a fresh clone), the prototype catalog.
 */
async function productsFor(ids: string[]): Promise<Map<string, Product>> {
  const list = env.DATABASE_URL
    ? await loadLiveProducts([...new Set(ids)].filter(isUuid))
    : (await getStorefrontData()).products;
  return new Map(list.map((p) => [p.id, p]));
}

/** Prices `lines` against the catalog, dropping any that can't be bought. */
async function priceLines(lines: CartLine[]): Promise<{ items: CartItem[]; removed: number }> {
  const products = await productsFor(lines.map((l) => l.productId));
  const items: CartItem[] = [];
  for (const line of lines) {
    const item = priceLine(products.get(line.productId), line);
    if (item && !items.some((i) => i.key === item.key)) items.push(item);
  }
  return { items, removed: lines.length - items.length };
}

/** The saved cart, newest first. Lines that can no longer be bought are deleted. */
async function readCart(userId: string): Promise<CartResult> {
  const rows = await db
    .select({
      id: cartItems.id,
      itemKey: cartItems.itemKey,
      productId: cartItems.productId,
      variants: cartItems.variants,
      quantity: cartItems.quantity,
      savedForLater: cartItems.savedForLater,
    })
    .from(cartItems)
    .innerJoin(carts, eq(carts.id, cartItems.cartId))
    .where(eq(carts.userId, userId))
    .orderBy(desc(cartItems.createdAt));

  const products = await productsFor(rows.map((r) => r.productId));
  const items: CartItem[] = [];
  const gone: string[] = [];
  for (const r of rows) {
    const item = priceLine(products.get(r.productId), {
      productId: r.productId,
      selection: r.variants,
      quantity: r.quantity,
      savedForLater: r.savedForLater,
    });
    if (!item || items.some((i) => i.key === item.key)) {
      gone.push(r.id);
      continue;
    }
    // Keys follow the product's option order; keep the stored key in step if the admin reorders options.
    if (item.key !== r.itemKey) {
      await db
        .update(cartItems)
        .set({ itemKey: item.key, variants: selectionFromKey(item.key) })
        .where(eq(cartItems.id, r.id));
    }
    items.push(item);
  }
  if (gone.length) await db.delete(cartItems).where(inArray(cartItems.id, gone));
  return { ok: true, signedIn: true, items, removed: gone.length };
}

/** A line from a cart item key, priced; null if the product or option is gone. */
async function lineForKey(key: string): Promise<CartItem | null> {
  const productId = key.split('|')[0];
  const products = await productsFor([productId]);
  return priceLine(products.get(productId), { productId, selection: selectionFromKey(key), quantity: 1 });
}

/**
 * Loads the cart. Signed in: the browser's guest cart (`lines`) merges into the saved cart, keeping the larger
 * quantity of any line in both, and the merged cart comes back. Guest: `lines` come back repriced.
 */
export async function syncCart(lines: CartLine[]): Promise<CartResult> {
  const parsed = linesSchema.safeParse(lines);
  const guestLines = parsed.success ? parsed.data : [];
  const userId = await customerId();
  if (!userId) return { ok: true, signedIn: false, ...(await priceLines(guestLines)) };

  const { items: guest, removed } = await priceLines(guestLines);
  if (guest.length) {
    const cartId = await cartIdFor(userId);
    await db
      .insert(cartItems)
      .values(
        guest.map((item) => ({
          cartId,
          productId: item.productId,
          itemKey: item.key,
          variants: selectionFromKey(item.key),
          quantity: item.quantity,
          savedForLater: !!item.savedForLater,
        })),
      )
      .onConflictDoUpdate({
        target: [cartItems.cartId, cartItems.itemKey],
        set: {
          quantity: sql`greatest(cart_items.quantity, excluded.quantity)`,
          savedForLater: sql`cart_items.saved_for_later and excluded.saved_for_later`,
        },
      });
  }
  const cart = await readCart(userId);
  return { ...cart, removed: cart.removed + removed };
}

/** Adds a line to the saved cart (or adds to its quantity) and moves it out of "saved for later". */
export async function addCartItem(line: CartLine): Promise<CartResult> {
  const userId = await customerId();
  if (!userId) return SIGNED_OUT;
  const parsed = lineSchema.safeParse(line);
  if (!parsed.success) return INVALID(true);
  const product = (await productsFor([parsed.data.productId])).get(parsed.data.productId);
  const item = priceLine(product, parsed.data);
  if (!product || !item) return INVALID(true);
  if (priceForSelection(product, parsed.data.selection).stock <= 0) {
    return { ...INVALID(true), error: 'This option is currently out of stock.' };
  }

  const cartId = await cartIdFor(userId);
  await db
    .insert(cartItems)
    .values({
      cartId,
      productId: item.productId,
      itemKey: item.key,
      variants: selectionFromKey(item.key),
      quantity: item.quantity,
    })
    .onConflictDoUpdate({
      target: [cartItems.cartId, cartItems.itemKey],
      set: {
        quantity: sql`least(${MAX_QUANTITY}, cart_items.quantity + excluded.quantity)`,
        savedForLater: false,
      },
    });
  return readCart(userId);
}

/** Changes a saved line's quantity and/or moves it in or out of "saved for later". */
export async function updateCartItem(
  key: string,
  patch: { quantity?: number; savedForLater?: boolean },
): Promise<CartResult> {
  const userId = await customerId();
  if (!userId) return SIGNED_OUT;
  const item = keySchema.safeParse(key).success ? await lineForKey(key) : null;
  if (!item) return { ...(await readCart(userId)), ok: false, error: INVALID(true).error };
  const set: Partial<typeof cartItems.$inferInsert> = {};
  if (typeof patch.quantity === 'number') set.quantity = clampQuantity(patch.quantity);
  if (typeof patch.savedForLater === 'boolean') set.savedForLater = patch.savedForLater;
  if (Object.keys(set).length) {
    const cartId = await cartIdFor(userId);
    await db
      .update(cartItems)
      .set(set)
      .where(and(eq(cartItems.cartId, cartId), eq(cartItems.itemKey, item.key)));
  }
  return readCart(userId);
}

export async function removeCartItem(key: string): Promise<CartResult> {
  const userId = await customerId();
  if (!userId) return SIGNED_OUT;
  if (keySchema.safeParse(key).success) {
    const cartId = await cartIdFor(userId);
    await db.delete(cartItems).where(and(eq(cartItems.cartId, cartId), eq(cartItems.itemKey, key)));
  }
  return readCart(userId);
}

/** Empties the cart, keeping lines saved for later. */
export async function clearCart(): Promise<CartResult> {
  const userId = await customerId();
  if (!userId) return SIGNED_OUT;
  const cartId = await cartIdFor(userId);
  await db.delete(cartItems).where(and(eq(cartItems.cartId, cartId), eq(cartItems.savedForLater, false)));
  return readCart(userId);
}

/** Prices lines without saving them (Buy Now at checkout). */
export async function priceCartLines(lines: CartLine[]): Promise<CartItem[]> {
  const parsed = linesSchema.safeParse(lines);
  return parsed.success ? (await priceLines(parsed.data)).items : [];
}
