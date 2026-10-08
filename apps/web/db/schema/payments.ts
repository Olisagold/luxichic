import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { admins } from './admins';
import { orders } from './orders';
import { createdAt, ownRows, paymentMethod, paymentStatus, updatedAt } from './_shared';

/**
 * One payment record per order.
 * Bank transfers start as `pending_verification` and only move to `payment_confirmed` when an admin
 * clicks Confirm Payment after checking the bank statement. A receipt sent on WhatsApp never changes
 * this row. Customers can read their own payment but never write it.
 */
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: 'cascade' }),
    method: paymentMethod('method').notNull(),
    status: paymentStatus('status').notNull(),
    amount: integer('amount').notNull(),
    confirmedByAdminId: uuid('confirmed_by_admin_id').references(() => admins.id, { onDelete: 'set null' }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('payments_status_idx').on(t.status),
    check('payments_amount_check', sql`${t.amount} >= 0`),
    // A confirmed bank transfer must record who confirmed it and when.
    check('payments_confirmation_check', sql`${t.status} <> 'payment_confirmed' or (${t.confirmedAt} is not null)`),
    ownRows('payments: read own', 'select', sql`(select user_id from orders o where o.id = order_id)`),
  ],
);
