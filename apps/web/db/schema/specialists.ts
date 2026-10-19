import { sql } from 'drizzle-orm';
import { pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { admins } from './admins';
import { services } from './services';
import { createdAt, publicRead, specialistStatus, updatedAt } from './_shared';

export const specialists = pgTable(
  'specialists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    title: text('title').notNull(),
    imageUrl: text('image_url'),
    bio: text('bio').notNull().default(''),
    specialties: text('specialties')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    status: specialistStatus('status').notNull().default('active'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  () => [publicRead('specialists: public read active', sql`status = 'active'`)],
);

/** Which specialists perform which services. */
export const specialistServices = pgTable(
  'specialist_services',
  {
    specialistId: uuid('specialist_id')
      .notNull()
      .references(() => specialists.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.specialistId, t.serviceId] }),
    publicRead(
      'specialist_services: public read',
      sql`exists (select 1 from specialists s where s.id = specialist_id and s.status = 'active')`,
    ),
  ],
);

/**
 * The private side of a specialist, never shown on the website (RLS on, no policies: server only):
 * - the admin login that belongs to them (an admin linked here sees only their own bookings), and
 * - their Telegram chat, for private booking alerts. A specialist connects by opening a one-time link to the bot
 *   (`telegramToken`, created from Admin → Telegram); the bot then stores their chat here.
 */
export const specialistAccounts = pgTable('specialist_accounts', {
  specialistId: uuid('specialist_id')
    .primaryKey()
    .references(() => specialists.id, { onDelete: 'cascade' }),
  adminId: uuid('admin_id')
    .unique()
    .references(() => admins.id, { onDelete: 'set null' }),
  telegramChatId: text('telegram_chat_id'),
  /** The Telegram name shown in the admin, e.g. "Ada (@ada_nails)". */
  telegramName: text('telegram_name'),
  telegramConnectedAt: timestamp('telegram_connected_at', { withTimezone: true }),
  /** One-time code in the connect link; cleared once used. */
  telegramToken: text('telegram_token').unique(),
  telegramTokenCreatedAt: timestamp('telegram_token_created_at', { withTimezone: true }),
}).enableRLS();
