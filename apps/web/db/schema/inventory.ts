import { boolean, index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { admins } from './admins';
import { productIsPublished, products } from './products';
import { createdAt, outOfStockBehaviour, publicRead, updatedAt } from './_shared';

/** Stock settings per product (1:1). Option-level stock lives on `product_option_values`. */
export const inventory = pgTable(
  'inventory',
  {
    productId: uuid('product_id')
      .primaryKey()
      .references(() => products.id, { onDelete: 'cascade' }),
    stock: integer('stock').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
    /** When false the product is always purchasable and stock isn't decremented. */
    trackInventory: boolean('track_inventory').notNull().default(true),
    outOfStockBehaviour: outOfStockBehaviour('out_of_stock_behaviour').notNull().default('show_sold_out'),
    updatedAt: updatedAt(),
  },
  () => [publicRead('inventory: public read', productIsPublished())],
);

/** Every stock change, for the inventory history and audits. */
export const stockMovements = pgTable(
  'stock_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    /** Option value label(s) when the change applies to a variant, e.g. `Length: 18"`. */
    variant: text('variant'),
    change: integer('change').notNull(),
    resultingStock: integer('resulting_stock').notNull(),
    reason: text('reason').notNull(),
    /** `null` for automatic changes (e.g. an order). */
    adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('stock_movements_product_idx').on(t.productId, t.createdAt)],
).enableRLS();
