import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createdAt } from './_shared';
import { admins } from './admins';
import { profiles } from './users';

/**
 * Phones and computers that turned on notifications (web push). One row per device and browser: an admin's
 * device gets the same alerts as their bell, a customer's their order and appointment updates. Written by the
 * server only (RLS on, no policies); a subscription the push service says is gone is deleted.
 */
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }),
    userAgent: text('user_agent'),
    createdAt: createdAt(),
    lastSentAt: timestamp('last_sent_at', { withTimezone: true }),
  },
  (t) => [
    index('push_subscriptions_admin_idx').on(t.adminId),
    index('push_subscriptions_user_idx').on(t.userId),
    check('push_subscriptions_owner_check', sql`(${t.adminId} is null) <> (${t.userId} is null)`),
  ],
).enableRLS();
