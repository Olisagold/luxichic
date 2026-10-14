'use server';

import { revalidateTag } from 'next/cache';
import { after } from 'next/server';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import * as s from '@/db/schema';
import { authReady } from '@/lib/auth/helpers';
import { getCustomer } from '@/lib/auth/session';
import { priceLine, selectionFromKey } from '@/lib/cart/items';
import { cartLineSchema } from '@/lib/cart/schema';
import { promoDiscount } from '@/lib/checkout/pricing';
import { findPromo } from '@/lib/checkout/promo';
import { findOrderByNumberAndEmail } from '@/lib/orders/queries';
import {
  isTransactionReference,
  newOrderNumber,
  newTransactionReference,
  rememberPlacedOrder,
} from '@/lib/orders/references';
import { STOREFRONT_TAG } from '@/lib/storefront/data';
import { loadLiveProducts } from '@/lib/storefront/source';
import { formatNaira } from '@/lib/utils/currency';
import { priceForSelection } from '@/lib/utils/products';
import { isUuid, isValidEmail, isValidPhone } from '@/lib/utils/validation';
import { emailOrderPlaced } from '@/lib/email/customer';
import { alertNewOrder } from '@/lib/notify/team';
import type { CartItem, Order } from '@/types/order';
import type { Product } from '@/types/product';
import type { Result } from '@/types/user';

const UNAVAILABLE: Result = { ok: false, error: 'Checkout is not available right now. Please try again later.' };

const field = (max: number) => z.string().trim().max(max);
const placeOrderSchema = z.object({
  lines: z.array(cartLineSchema).min(1).max(50),
  customer: z.object({ fullName: field(120), email: field(254), phone: field(30) }),
  address: z.object({
    country: field(60).optional(),
    state: field(60),
    city: field(120),
    street: field(300),
    houseNumber: field(60).optional(),
    landmark: field(200).optional(),
    instructions: field(500).optional(),
  }),
  paymentMethod: z.enum(['bank_transfer', 'pay_on_delivery']),
  promoCode: z.string().max(40).nullish(),
  /** The reference shown on the payment step; used if it's still free. */
  reference: z.string().max(20).optional(),
  /** The total the customer saw. If ours differs, they review it before anything is placed. */
  expectedTotal: z.number().int().nonnegative(),
  /** Remove these lines from the signed-in customer's saved cart once ordered (not for Buy Now). */
  fromCart: z.boolean(),
});

export type PlaceOrderInput = z.input<typeof placeOrderSchema>;

export type PlaceOrderResult = Result & {
  orderNumber?: string;
  /** Prices, stock or availability changed: the customer should review their order. */
  changed?: boolean;
  /** The promo code can't be used: remove it and try again. */
  promoInvalid?: boolean;
};

/** A reason the order can't be placed, shown to the customer. Thrown inside the transaction to roll it back. */
class CheckoutError extends Error {
  constructor(
    message: string,
    readonly extra: Pick<PlaceOrderResult, 'changed' | 'promoInvalid'> = {},
  ) {
    super(message);
  }
}

/** A clash on the order number or transaction reference (retry with new ones). */
function identifierClash(e: unknown): boolean {
  for (let err = e as { code?: string; constraint_name?: string; cause?: unknown } | undefined; err;) {
    if (err.code === '23505' && /order_number|transaction_reference/.test(err.constraint_name ?? '')) return true;
    err = err.cause as typeof err;
  }
  return false;
}

/** Prices the lines from the database (merging repeats of the same product and options). */
function priceItems(products: Product[], lines: z.infer<typeof cartLineSchema>[]): CartItem[] | null {
  const items: CartItem[] = [];
  for (const line of lines) {
    const item = priceLine(
      products.find((p) => p.id === line.productId),
      { ...line, savedForLater: false },
    );
    if (!item) return null;
    const same = items.find((i) => i.key === item.key);
    if (same) same.quantity += item.quantity;
    else items.push(item);
  }
  return items;
}

/** A transaction reference for the payment step, not used by any order yet. */
export async function issueTransactionReference(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const ref = newTransactionReference();
    if (!authReady()) return ref;
    const [taken] = await db.select({ id: s.orders.id }).from(s.orders).where(eq(s.orders.transactionReference, ref));
    if (!taken) return ref;
  }
  return newTransactionReference();
}

/**
 * Places an order (plan.md → Payment flow). Everything is recomputed from the database: prices, stock, the
 * delivery fee for the state, the promo code and whether the payment method is offered. Nothing the browser
 * says about money is trusted, apart from checking that the customer saw the same total.
 *
 * In one transaction: uses the promo code, creates the order, its items, payment and timeline, and takes the
 * items out of stock. Bank transfers start as `pending_verification`, Pay on Delivery as `pay_on_delivery`.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  if (!authReady()) return UNAVAILABLE;
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Please check your details and try again.' };
  const d = parsed.data;

  if (d.customer.fullName.length < 2) return { ok: false, error: 'Please enter your full name.' };
  if (!isValidEmail(d.customer.email)) return { ok: false, error: 'Please enter a valid email address.' };
  if (!isValidPhone(d.customer.phone)) return { ok: false, error: 'Please enter a valid phone number.' };
  if (!d.address.state || d.address.city.length < 2 || d.address.street.length < 3) {
    return { ok: false, error: 'Please complete your delivery address.' };
  }

  const customer = await getCustomer();
  if (!customer) {
    const [blocked] = await db
      .select({ id: s.profiles.id })
      .from(s.profiles)
      .where(and(sql`lower(${s.profiles.email}) = lower(${d.customer.email})`, eq(s.profiles.status, 'blocked')));
    if (blocked) {
      return { ok: false, error: 'This account can’t place orders right now. Please contact LUXICHIC for help.' };
    }
  }

  // Prices and stock as they are now, not from the storefront cache.
  const products = await loadLiveProducts([...new Set(d.lines.map((l) => l.productId))].filter(isUuid));
  const items = priceItems(products, d.lines);
  if (!items) {
    return {
      ok: false,
      changed: true,
      error: 'Some items in your order are no longer available. Please review your cart.',
    };
  }
  for (const item of items) {
    const product = products.find((p) => p.id === item.productId)!;
    const { stock } = priceForSelection(product, selectionFromKey(item.key));
    if (stock < item.quantity) {
      return {
        ok: false,
        changed: true,
        error:
          stock > 0
            ? `Only ${stock} of ${item.name} ${stock === 1 ? 'is' : 'are'} left. Please update your cart.`
            : `${item.name} has just sold out. Please remove it from your cart.`,
      };
    }
  }

  // Payment method and delivery, from the current settings.
  const settings = await db
    .select()
    .from(s.settings)
    .where(inArray(s.settings.key, ['bank', 'pay_on_delivery']));
  const setting = <T>(key: string) => settings.find((r) => r.key === key)?.value as T | undefined;
  if (d.paymentMethod === 'pay_on_delivery' && !setting<{ enabled: boolean }>('pay_on_delivery')?.enabled) {
    return { ok: false, changed: true, error: 'Pay on Delivery isn’t available. Please choose bank transfer.' };
  }
  if (d.paymentMethod === 'bank_transfer' && !setting<{ accountNumber?: string }>('bank')?.accountNumber) {
    return {
      ok: false,
      error: 'Bank transfer isn’t available right now. Please contact LUXICHIC on WhatsApp to order.',
    };
  }
  const [rate] = await db.select().from(s.deliveryRates).where(eq(s.deliveryRates.state, d.address.state));
  if (!rate?.enabled) {
    return {
      ok: false,
      error: `We don’t currently deliver to ${d.address.state}. Please contact us on WhatsApp.`,
    };
  }

  const deliveryFee = rate.isFree ? 0 : rate.fee;
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const transfer = d.paymentMethod === 'bank_transfer';

  for (let attempt = 0; ; attempt++) {
    try {
      const placed = await db.transaction(async (tx) => {
        let discount = 0;
        let discountCode: string | null = null;
        if (d.promoCode) {
          const found = await findPromo(d.promoCode, tx);
          if ('error' in found)
            throw new CheckoutError(`${found.error} Remove it to continue.`, { promoInvalid: true });
          discount = promoDiscount(found.rule, items);
          if (!discount) {
            throw new CheckoutError('Your order no longer qualifies for this promo code. Remove it to continue.', {
              promoInvalid: true,
            });
          }
          // Counted only while under the limit, so two last-minute orders can't both use the final one.
          const [used] = await tx
            .update(s.discounts)
            .set({ usedCount: sql`${s.discounts.usedCount} + 1` })
            .where(
              and(
                eq(s.discounts.id, found.id),
                sql`(${s.discounts.usageLimit} is null or ${s.discounts.usedCount} < ${s.discounts.usageLimit})`,
              ),
            )
            .returning({ id: s.discounts.id });
          if (!used) {
            throw new CheckoutError('That code has reached its usage limit. Remove it to continue.', {
              promoInvalid: true,
            });
          }
          discountCode = found.rule.code;
        }

        const total = subtotal + deliveryFee - discount;
        if (total !== d.expectedTotal) {
          throw new CheckoutError(
            `Your order total is now ${formatNaira(total)}. Please check it before placing your order.`,
            { changed: true },
          );
        }

        const orderNumber = newOrderNumber();
        const reference =
          attempt === 0 && isTransactionReference(d.reference) ? d.reference : newTransactionReference();
        const a = d.address;
        const [order] = await tx
          .insert(s.orders)
          .values({
            orderNumber,
            transactionReference: reference,
            userId: customer?.id ?? null,
            customerName: d.customer.fullName,
            customerEmail: d.customer.email,
            customerPhone: d.customer.phone,
            shipCountry: a.country || 'Nigeria',
            shipState: a.state,
            shipCity: a.city,
            shipStreet: a.street,
            shipHouseNumber: a.houseNumber || null,
            shipLandmark: a.landmark || null,
            shipInstructions: a.instructions || null,
            subtotal,
            deliveryFee,
            discountAmount: discount,
            discountCode,
            total,
            paymentMethod: d.paymentMethod,
          })
          .returning({ id: s.orders.id });

        await tx.insert(s.orderItems).values(
          items.map((i) => ({
            orderId: order.id,
            productId: i.productId,
            productSlug: i.slug,
            productName: i.name,
            division: i.division,
            imageUrl: i.image ?? null,
            variants: i.variants,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
          })),
        );
        await tx.insert(s.payments).values({
          orderId: order.id,
          method: d.paymentMethod,
          status: transfer ? 'pending_verification' : 'pay_on_delivery',
          amount: total,
        });
        await tx.insert(s.orderEvents).values(
          (transfer ? (['order_placed', 'awaiting_payment'] as const) : (['order_placed'] as const)).map((step) => ({
            orderId: order.id,
            step,
          })),
        );

        // Take the items out of stock. A result below zero means someone else bought the last ones first.
        const reason = `Order ${orderNumber}`;
        const moves: (typeof s.stockMovements.$inferInsert)[] = [];
        const soldOut = (name: string) =>
          new CheckoutError(`${name} has just sold out. Please update your cart.`, { changed: true });
        for (const item of items) {
          const [inv] = await tx
            .update(s.inventory)
            .set({ stock: sql`${s.inventory.stock} - ${item.quantity}`, updatedAt: new Date() })
            .where(and(eq(s.inventory.productId, item.productId), eq(s.inventory.trackInventory, true)))
            .returning({ stock: s.inventory.stock });
          if (inv) {
            if (inv.stock < 0) throw soldOut(item.name);
            moves.push({
              productId: item.productId,
              change: -item.quantity,
              resultingStock: inv.stock,
              reason,
            });
          }
          const product = products.find((p) => p.id === item.productId)!;
          for (const [key, label] of Object.entries(selectionFromKey(item.key))) {
            const group = product.variants.find((g) => g.key === key);
            if (group?.values.find((v) => v.label === label)?.stock === undefined) continue;
            const [value] = await tx.execute<{ stock: number }>(sql`
              update product_option_values v set stock = v.stock - ${item.quantity}
              from product_options o
              where v.option_id = o.id and o.product_id = ${item.productId}
                and o.key = ${key} and v.label = ${label} and v.stock is not null
              returning v.stock`);
            if (!value) continue;
            if (value.stock < 0) throw soldOut(item.name);
            moves.push({
              productId: item.productId,
              variant: `${group!.name}: ${label}`,
              change: -item.quantity,
              resultingStock: value.stock,
              reason,
            });
          }
          await tx
            .update(s.products)
            .set({ salesCount: sql`${s.products.salesCount} + ${item.quantity}` })
            .where(eq(s.products.id, item.productId));
        }
        if (moves.length) await tx.insert(s.stockMovements).values(moves);

        if (customer && d.fromCart) {
          await tx.delete(s.cartItems).where(
            and(
              sql`${s.cartItems.cartId} in (select id from carts where user_id = ${customer.id})`,
              inArray(
                s.cartItems.itemKey,
                items.map((i) => i.key),
              ),
              eq(s.cartItems.savedForLater, false),
            ),
          );
        }
        return { id: order.id, orderNumber };
      });

      await rememberPlacedOrder(placed.id);
      // Stock and sales counts changed.
      revalidateTag(STOREFRONT_TAG);
      after(async () => {
        await alertNewOrder(placed.id);
        await emailOrderPlaced(placed.id);
      });
      return { ok: true, orderNumber: placed.orderNumber };
    } catch (e) {
      if (e instanceof CheckoutError) return { ok: false, error: e.message, ...e.extra };
      if (identifierClash(e) && attempt < 5) continue;
      throw e;
    }
  }
}

/** Order tracking for anyone with the order number and the email used at checkout. */
export async function trackOrder(orderNumber: string, email: string): Promise<Order | null> {
  if (typeof orderNumber !== 'string' || typeof email !== 'string') return null;
  if (!orderNumber.trim() || orderNumber.length > 20 || !isValidEmail(email)) return null;
  return findOrderByNumberAndEmail(orderNumber, email);
}
