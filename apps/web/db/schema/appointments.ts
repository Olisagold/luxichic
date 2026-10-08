import { sql } from 'drizzle-orm';
import { date, index, pgTable, text, time, uuid } from 'drizzle-orm/pg-core';
import { admins } from './admins';
import { services } from './services';
import { specialists } from './specialists';
import { profiles } from './users';
import { appointmentStatus, createdAt, ownRows, updatedAt } from './_shared';

/**
 * Salon bookings. Service, specialist and customer details are snapshotted at booking time.
 * Double-booking prevention (a constraint on specialist + slot) is added with the booking flow in Phase 6.
 */
export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Customer-facing reference, e.g. APT-123456. */
    reference: text('reference').notNull().unique(),
    serviceId: uuid('service_id').references(() => services.id, { onDelete: 'set null' }),
    serviceName: text('service_name').notNull(),
    specialistId: uuid('specialist_id').references(() => specialists.id, { onDelete: 'set null' }),
    specialistName: text('specialist_name'),
    date: date('date').notNull(),
    time: time('time').notNull(),
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'set null' }),
    customerName: text('customer_name').notNull(),
    customerEmail: text('customer_email').notNull(),
    customerPhone: text('customer_phone').notNull(),
    notes: text('notes'),
    status: appointmentStatus('status').notNull().default('pending'),
    /** Reason given when rejected or rescheduled. */
    reason: text('reason'),
    /** The originally requested slot, kept when an admin reschedules. */
    originalDate: date('original_date'),
    originalTime: time('original_time'),
    originalSpecialistName: text('original_specialist_name'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('appointments_date_idx').on(t.date, t.time),
    index('appointments_user_idx').on(t.userId),
    index('appointments_specialist_date_idx').on(t.specialistId, t.date),
    ownRows('appointments: read own', 'select'),
  ],
);

/** Appointment history (requested, confirmed, rescheduled, …). */
export const appointmentEvents = pgTable(
  'appointment_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    note: text('note'),
    adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [
    index('appointment_events_appointment_idx').on(t.appointmentId, t.createdAt),
    ownRows(
      'appointment_events: read own',
      'select',
      sql`(select user_id from appointments a where a.id = appointment_id)`,
    ),
  ],
);
