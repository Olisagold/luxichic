import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/** Homepage newsletter sign-ups. Written by server code only (validates email, ignores duplicates). */
export const newsletterSubscribers = pgTable(
  'newsletter_subscribers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    /** Where the sign-up came from, e.g. "homepage". */
    source: text('source').notNull().default('homepage'),
    subscribedAt: timestamp('subscribed_at', { withTimezone: true }).defaultNow().notNull(),
    unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('newsletter_subscribers_email_lower_key').on(sql`lower(${t.email})`)],
).enableRLS();
