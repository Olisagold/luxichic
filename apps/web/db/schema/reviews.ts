import { sql } from 'drizzle-orm';
import { boolean, check, index, pgTable, smallint, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { products } from './products';
import { profiles } from './users';
import { createdAt, ownRows, publicRead, reviewStatus, updatedAt } from './_shared';

/**
 * Product reviews. Any signed-in customer can review any product (many buy in the physical store); `verified`
 * marks those who also ordered it online. Each product's `rating` and `review_count` are recalculated from its
 * visible reviews by a trigger (migration `review_ratings`).
 */
export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    /** `null` for imported reviews or deleted accounts. */
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'set null' }),
    authorName: text('author_name').notNull(),
    authorEmail: text('author_email'),
    rating: smallint('rating').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    images: text('images')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** True when the author bought the product. */
    verified: boolean('verified').notNull().default(false),
    status: reviewStatus('status').notNull().default('visible'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('reviews_rating_check', sql`${t.rating} between 1 and 5`),
    index('reviews_product_status_idx').on(t.productId, t.status),
    index('reviews_user_idx').on(t.userId),
    // One review per customer per product (they edit it instead). Imported reviews have no user.
    uniqueIndex('reviews_product_user_key').on(t.productId, t.userId).where(sql`${t.userId} is not null`),
    // Visible reviews are public (author_email is never selected by storefront queries).
    publicRead('reviews: public read visible', sql`status = 'visible'`),
    // Authors also see their own hidden/archived reviews in their account.
    ownRows('reviews: read own', 'select'),
  ],
);
