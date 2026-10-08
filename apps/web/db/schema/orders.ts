import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { admins } from './admins';
import { profiles } from './users';
import { createdAt, noteSubject, orderEventStep, orderStatus, ownRows, paymentMethod, updatedAt } from './_shared';

/**
 * Two identifiers per order (see plan.md → Payment flow):
 * - `order_number`: internal, e.g. LXC-123456.
 * - `transaction_reference`: customer-facing random 8 digits, used as the bank-transfer narration.
 * Both are unique, and they can never be equal.
 *
 * Customer and address fields are a snapshot at checkout, so later profile edits don't rewrite orders.
 */
export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderNumber: text('order_number').notNull().unique(),
    transactionReference: text('transaction_reference').notNull().unique(),
    /** Set when placed by (or later linked to) a customer account; guests have `null`. */
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'set null' }),
    customerName: text('customer_name').notNull(),
    customerEmail: text('customer_email').notNull(),
    customerPhone: text('customer_phone').notNull(),
    shipCountry: text('ship_country').notNull().default('Nigeria'),
    shipState: text('ship_state').notNull(),
    shipCity: text('ship_city').notNull(),
    shipStreet: text('ship_street').notNull(),
    shipHouseNumber: text('ship_house_number'),
    shipLandmark: text('ship_landmark'),
    shipInstructions: text('ship_instructions'),
    subtotal: integer('subtotal').notNull(),
    deliveryFee: integer('delivery_fee').notNull().default(0),
    discountAmount: integer('discount_amount').notNull().default(0),
    discountCode: text('discount_code'),
    total: integer('total').notNull(),
    paymentMethod: paymentMethod('payment_method').notNull(),
    status: orderStatus('status').notNull().default('pending'),
    cancelReason: text('cancel_reason'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('orders_transaction_reference_check', sql`${t.transactionReference} ~ '^[0-9]{8}$'`),
    check('orders_references_distinct_check', sql`${t.transactionReference} <> ${t.orderNumber}`),
    check(
      'orders_totals_check',
      sql`${t.total} = ${t.subtotal} + ${t.deliveryFee} - ${t.discountAmount} and ${t.total} >= 0`,
    ),
    index('orders_user_idx').on(t.userId),
    index('orders_customer_email_idx').on(sql`lower(${t.customerEmail})`),
    index('orders_status_created_idx').on(t.status, t.createdAt),
    ownRows('orders: read own', 'select'),
  ],
);

/** Order timeline shown to customers and admins. */
export const orderEvents = pgTable(
  'order_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    step: orderEventStep('step').notNull(),
    /** Admin who triggered the step; `null` for the customer or the system. */
    adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [
    index('order_events_order_idx').on(t.orderId, t.createdAt),
    ownRows('order_events: read own', 'select', sql`(select user_id from orders o where o.id = order_id)`),
  ],
);

/** Internal notes admins leave on an order or a customer. Never shown to customers. */
export const adminNotes = pgTable(
  'admin_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subject: noteSubject('subject').notNull(),
    /** Order id or customer (profile) id, depending on `subject`. */
    subjectId: uuid('subject_id').notNull(),
    body: text('body').notNull(),
    adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('admin_notes_subject_idx').on(t.subject, t.subjectId)],
).enableRLS();
