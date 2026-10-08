import { pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { products } from './products';
import { profiles } from './users';
import { createdAt, ownRows } from './_shared';

export const wishlists = pgTable(
  'wishlists',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] }), ownRows('wishlists: own', 'all')],
);
