import { boolean, index, integer, pgTable, smallint, text, unique, uuid } from 'drizzle-orm/pg-core';
import { productIsPublished, products } from './products';
import { publicRead } from './_shared';

/** An option the customer picks, e.g. "Length" or "Colour". */
export const productOptions = pgTable(
  'product_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    /** Stable key used in cart/order variant selections, e.g. "length". */
    key: text('key').notNull(),
    name: text('name').notNull(),
    sortOrder: smallint('sort_order').notNull().default(0),
  },
  (t) => [
    unique('product_options_product_key_key').on(t.productId, t.key),
    publicRead('product_options: public read', productIsPublished()),
  ],
);

/** A value of an option, e.g. `18"`, with its own price change, stock and SKU. */
export const productOptionValues = pgTable(
  'product_option_values',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    optionId: uuid('option_id')
      .notNull()
      .references(() => productOptions.id, { onDelete: 'cascade' }),
    /** Denormalised so the public-read policy can check the product's status cheaply. */
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    /** Naira added to the product price when selected (can be negative). */
    priceDelta: integer('price_delta').notNull().default(0),
    /** `null` = use the product's stock. */
    stock: integer('stock'),
    sku: text('sku'),
    enabled: boolean('enabled').notNull().default(true),
    sortOrder: smallint('sort_order').notNull().default(0),
  },
  (t) => [
    unique('product_option_values_option_label_key').on(t.optionId, t.label),
    index('product_option_values_product_idx').on(t.productId),
    publicRead('product_option_values: public read', productIsPublished()),
  ],
);
