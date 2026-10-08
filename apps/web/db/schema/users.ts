import { sql } from 'drizzle-orm';
import { boolean, pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { authenticatedRole, authUid, authUsers } from 'drizzle-orm/supabase';
import { createdAt, profileStatus, updatedAt } from './_shared';

/** One row per customer account, keyed by the Supabase Auth user id. */
export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id')
      .primaryKey()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    fullName: text('full_name').notNull(),
    email: text('email').notNull().unique(),
    phone: text('phone'),
    status: profileStatus('status').notNull().default('active'),
    /** Created by an admin; the customer sets a password through an emailed setup link. */
    pendingSetup: boolean('pending_setup').notNull().default(false),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  () => [
    pgPolicy('profiles: read own', { for: 'select', to: authenticatedRole, using: sql`id = ${authUid}` }),
    // Customers may edit their own details; status and pending_setup are changed by server code only.
    pgPolicy('profiles: update own', {
      for: 'update',
      to: authenticatedRole,
      using: sql`id = ${authUid}`,
      withCheck: sql`id = ${authUid}`,
    }),
  ],
);
