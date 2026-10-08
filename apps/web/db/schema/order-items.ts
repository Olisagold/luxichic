import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { orders } from './orders';
import { products } from './products';
import { division, ownRows } from './_shared';

/** Line items, snapshotted at checkout (name, image, price) so product edits don't change past orders. */
export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    /** `null` if the product was later deleted; the snapshot fields still describe it. */
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    productSlug: text('product_slug').notNull(),
    productName: text('product_name').notNull(),
    division: division('division').notNull(),
    imageUrl: text('image_url'),
    variants: jsonb('variants').$type<Record<string, string>>().notNull().default({}),
    unitPrice: integer('unit_price').notNull(),
    quantity: integer('quantity').notNull(),
  },
  (t) => [
    index('order_items_order_idx').on(t.orderId),
    check('order_items_quantity_check', sql`${t.quantity} > 0`),
    check('order_items_unit_price_check', sql`${t.unitPrice} >= 0`),
    ownRows('order_items: read own', 'select', sql`(select user_id from orders o where o.id = order_id)`),
  ],
);
