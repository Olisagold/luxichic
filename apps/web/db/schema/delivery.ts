import { sql } from 'drizzle-orm';
import { boolean, check, integer, pgTable, text } from 'drizzle-orm/pg-core';
import { publicRead, updatedAt } from './_shared';

/** Delivery fee per Nigerian state. The delivery estimate text lives in `settings`. */
export const deliveryRates = pgTable(
  'delivery_rates',
  {
    state: text('state').primaryKey(),
    fee: integer('fee').notNull().default(0),
    isFree: boolean('is_free').notNull().default(false),
    /** Disabled states can't be selected at checkout. */
    enabled: boolean('enabled').notNull().default(true),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('delivery_rates_fee_check', sql`${t.fee} >= 0`),
    publicRead('delivery_rates: public read enabled', sql`enabled`),
  ],
);
