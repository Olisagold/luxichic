import { sql } from 'drizzle-orm';
import { boolean, index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { profiles } from './users';
import { createdAt, ownRows, updatedAt } from './_shared';

/** Saved delivery addresses on a customer account. */
export const addresses = pgTable(
  'addresses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    label: text('label'),
    country: text('country').notNull().default('Nigeria'),
    state: text('state').notNull(),
    city: text('city').notNull(),
    street: text('street').notNull(),
    houseNumber: text('house_number'),
    landmark: text('landmark'),
    instructions: text('instructions'),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('addresses_user_idx').on(t.userId),
    // At most one default address per customer.
    uniqueIndex('addresses_one_default_per_user')
      .on(t.userId)
      .where(sql`${t.isDefault}`),
    ownRows('addresses: own', 'all'),
  ],
);
