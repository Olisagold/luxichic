import { sql } from 'drizzle-orm';
import { boolean, check, date, integer, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createdAt, discountScope, discountType, updatedAt } from './_shared';

/** Promo codes. Validated and applied by server code at checkout, so no public access. */
export const discounts = pgTable(
  'discounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),
    type: discountType('type').notNull(),
    /** Percent (1–100) for `percent`, naira for `fixed`. */
    value: integer('value').notNull(),
    minSpend: integer('min_spend').notNull().default(0),
    startsOn: date('starts_on').notNull(),
    endsOn: date('ends_on').notNull(),
    /** `null` = unlimited. */
    usageLimit: integer('usage_limit'),
    usedCount: integer('used_count').notNull().default(0),
    active: boolean('active').notNull().default(true),
    scope: discountScope('scope').notNull().default('all'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // Codes are case-insensitive: "WELCOME10" and "welcome10" are the same code.
    uniqueIndex('discounts_code_lower_key').on(sql`lower(${t.code})`),
    check('discounts_value_check', sql`${t.value} > 0 and (${t.type} <> 'percent' or ${t.value} <= 100)`),
    check('discounts_dates_check', sql`${t.endsOn} >= ${t.startsOn}`),
  ],
).enableRLS();
