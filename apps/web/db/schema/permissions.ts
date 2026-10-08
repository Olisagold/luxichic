import { pgTable, smallint, text } from 'drizzle-orm/pg-core';

/**
 * Every permission an admin can hold, e.g. `orders.confirmPayment`.
 * Keys match the `Permission` type in types/admin.ts.
 */
export const permissions = pgTable('permissions', {
  key: text('key').primaryKey(),
  label: text('label').notNull(),
  groupLabel: text('group_label').notNull(),
  sortOrder: smallint('sort_order').notNull().default(0),
}).enableRLS();
