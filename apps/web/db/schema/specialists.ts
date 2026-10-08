import { sql } from 'drizzle-orm';
import { pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
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
