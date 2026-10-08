import { sql } from 'drizzle-orm';
import { boolean, check, integer, jsonb, pgTable, unique, uuid, text } from 'drizzle-orm/pg-core';
import { products } from './products';
import { profiles } from './users';
import { createdAt, ownRows, updatedAt } from './_shared';

/** Saved cart for a signed-in customer. Guests keep their cart in the browser and it merges on sign-in. */
export const carts = pgTable(
  'carts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  () => [ownRows('carts: own', 'all')],
);

export const cartItems = pgTable(
  'cart_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cartId: uuid('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    /** Product id + sorted variant selection; one row per distinct selection. */
    itemKey: text('item_key').notNull(),
    /** Option key → selected value label, e.g. `{ "length": "18\"" }`. */
    variants: jsonb('variants').$type<Record<string, string>>().notNull().default({}),
    quantity: integer('quantity').notNull().default(1),
    savedForLater: boolean('saved_for_later').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    unique('cart_items_cart_item_key_key').on(t.cartId, t.itemKey),
    check('cart_items_quantity_check', sql`${t.quantity} between 1 and 99`),
    ownRows('cart_items: own', 'all', sql`(select user_id from carts c where c.id = cart_id)`),
  ],
);
