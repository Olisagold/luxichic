import { sql } from 'drizzle-orm';
import { boolean, integer, pgTable, smallint, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, publicRead, serviceStatus, updatedAt } from './_shared';

/** Salon & spa services. */
export const services = pgTable(
  'services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    category: text('category').notNull(),
    shortDescription: text('short_description').notNull().default(''),
    description: text('description').notNull().default(''),
    includes: text('includes')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** "From ₦…" price; `null` = price on consultation. */
    startingPrice: integer('starting_price'),
    /** Display text, e.g. "2–3 hours"; `null` hides it. */
    durationLabel: text('duration_label'),
    /** Used to compute booking slots. */
    durationMinutes: integer('duration_minutes').notNull().default(60),
    imageUrl: text('image_url'),
    /** WhatsApp number for enquiries about this service. */
    whatsapp: text('whatsapp'),
    status: serviceStatus('status').notNull().default('draft'),
    bookable: boolean('bookable').notNull().default(true),
    sortOrder: smallint('sort_order').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  () => [publicRead('services: public read published', sql`status = 'published'`)],
);
