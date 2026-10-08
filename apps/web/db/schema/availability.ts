import { sql } from 'drizzle-orm';
import { check, date, index, pgTable, primaryKey, smallint, text, time, uuid } from 'drizzle-orm/pg-core';
import { admins } from './admins';
import { services } from './services';
import { specialists } from './specialists';
import { createdAt } from './_shared';

/**
 * Weekly working hours per specialist (one row per working weekday).
 * Booking slots are computed on the server (Phase 6), so there's no public access.
 */
export const availability = pgTable(
  'availability',
  {
    specialistId: uuid('specialist_id')
      .notNull()
      .references(() => specialists.id, { onDelete: 'cascade' }),
    /** 0 = Sunday … 6 = Saturday. */
    weekday: smallint('weekday').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.specialistId, t.weekday] }),
    check('availability_weekday_check', sql`${t.weekday} between 0 and 6`),
    check('availability_hours_check', sql`${t.endTime} > ${t.startTime}`),
  ],
).enableRLS();

/** Closed days or hours, for the whole salon, one service or one specialist. */
export const blocks = pgTable(
  'blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    date: date('date').notNull(),
    /** Both `null` = the entire day. */
    startTime: time('start_time'),
    endTime: time('end_time'),
    /** `null` = applies to every service. */
    serviceId: uuid('service_id').references(() => services.id, { onDelete: 'cascade' }),
    /** `null` = applies to every specialist. */
    specialistId: uuid('specialist_id').references(() => specialists.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull().default(''),
    createdByAdminId: uuid('created_by_admin_id').references(() => admins.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [
    index('blocks_date_idx').on(t.date),
    check(
      'blocks_times_check',
      sql`(${t.startTime} is null and ${t.endTime} is null) or (${t.startTime} is not null and ${t.endTime} is not null and ${t.endTime} > ${t.startTime})`,
    ),
  ],
).enableRLS();
