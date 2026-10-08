import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { categories } from './categories';
import { createdAt, division, productDiscountMode, productStatus, publicRead, updatedAt } from './_shared';

/** Filterable attributes; keys match `ProductAttributes` in types/product.ts. */
export type ProductAttributes = {
  construction?: string;
  texture?: string;
  origin?: string;
  laceType?: string;
  lengths?: number[];
  brand?: string;
  features?: string[];
};

export type ProductShipping = { estimate: string; method: string; pickup: boolean; notes: string; handling: string };

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    division: division('division').notNull(),
    slug: text('slug').notNull().unique(),
    sku: text('sku').notNull().unique(),
    name: text('name').notNull(),
    shortDescription: text('short_description').notNull().default(''),
    description: text('description').notNull().default(''),
    /** Regular selling price in naira. */
    price: integer('price').notNull(),
    /** Previous price shown struck through; only meaningful when higher than `price`. */
    compareAtPrice: integer('compare_at_price'),
    status: productStatus('status').notNull().default('draft'),
    discountMode: productDiscountMode('discount_mode').notNull().default('none'),
    discountPercent: smallint('discount_percent'),
    discountStartsOn: date('discount_starts_on'),
    discountEndsOn: date('discount_ends_on'),
    attributes: jsonb('attributes').$type<ProductAttributes>().notNull().default({}),
    specs: jsonb('specs').$type<{ label: string; value: string }[]>().notNull().default([]),
    usage: text('usage'),
    benefits: text('benefits'),
    care: text('care'),
    shipping: jsonb('shipping').$type<ProductShipping>(),
    isFeatured: boolean('is_featured').notNull().default(false),
    featuredRank: integer('featured_rank').notNull().default(0),
    isBestseller: boolean('is_bestseller').notNull().default(false),
    isNew: boolean('is_new').notNull().default(false),
    /** Denormalised from visible reviews; recalculated when reviews change. */
    rating: numeric('rating', { precision: 2, scale: 1, mode: 'number' }).notNull().default(0),
    reviewCount: integer('review_count').notNull().default(0),
    salesCount: integer('sales_count').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('products_division_status_idx').on(t.division, t.status),
    check('products_price_check', sql`${t.price} >= 0`),
    check('products_discount_percent_check', sql`${t.discountPercent} between 1 and 99`),
    publicRead('products: public read published', sql`status = 'published'`),
  ],
);

/** Visible only when the product is published. Reused by product child tables. */
export const productIsPublished = (productIdColumn = sql`product_id`) =>
  sql`exists (select 1 from products p where p.id = ${productIdColumn} and p.status = 'published')`;

export const productImages = pgTable(
  'product_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    alt: text('alt'),
    sortOrder: smallint('sort_order').notNull().default(0),
  },
  (t) => [
    index('product_images_product_idx').on(t.productId),
    publicRead('product_images: public read', productIsPublished()),
  ],
);

export const productCategories = pgTable(
  'product_categories',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.categoryId] }),
    index('product_categories_category_idx').on(t.categoryId),
    publicRead('product_categories: public read', productIsPublished()),
  ],
);
