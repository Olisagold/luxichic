import { sql } from 'drizzle-orm';
import { boolean, check, integer, jsonb, pgTable, smallint, text, uuid } from 'drizzle-orm/pg-core';
import { admins } from './admins';
import {
  createdAt,
  mediaFolder,
  publicRead,
  socialDivision,
  socialPlatform,
  testimonialStatus,
  updatedAt,
} from './_shared';

/**
 * Editable homepage/about/contact blocks, one row per block. `key` is one of:
 * sections, hero, intro, divisions, featured, salon_section, why, about, contact.
 * Shapes match the matching fields of `SiteContent` in types/admin.ts.
 */
export const siteContent = pgTable(
  'site_content',
  {
    key: text('key').primaryKey(),
    value: jsonb('value').notNull(),
    updatedByAdminId: uuid('updated_by_admin_id').references(() => admins.id, { onDelete: 'set null' }),
    updatedAt: updatedAt(),
  },
  () => [publicRead('site_content: public read')],
);

export const faqs = pgTable(
  'faqs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    category: text('category').notNull(),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    sortOrder: smallint('sort_order').notNull().default(0),
    updatedAt: updatedAt(),
  },
  () => [publicRead('faqs: public read')],
);

export const policies = pgTable(
  'policies',
  {
    slug: text('slug').primaryKey(),
    title: text('title').notNull(),
    sections: jsonb('sections').$type<{ heading: string; body: string }[]>().notNull().default([]),
    updatedAt: updatedAt(),
  },
  () => [publicRead('policies: public read')],
);

export const announcements = pgTable(
  'announcements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    text: text('text').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    sortOrder: smallint('sort_order').notNull().default(0),
  },
  () => [publicRead('announcements: public read enabled', sql`enabled`)],
);

export const testimonials = pgTable(
  'testimonials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    initials: text('initials').notNull(),
    rating: smallint('rating').notNull(),
    /** What they bought or booked, e.g. "Body Wave Wig". */
    item: text('item').notNull(),
    text: text('text').notNull(),
    status: testimonialStatus('status').notNull().default('active'),
    sortOrder: smallint('sort_order').notNull().default(0),
  },
  (t) => [
    check('testimonials_rating_check', sql`${t.rating} between 1 and 5`),
    publicRead('testimonials: public read active', sql`status = 'active'`),
  ],
);

/** Media library. Files live in Supabase Storage; this table indexes them for the admin. */
export const media = pgTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Public URL (Supabase Storage or /images during the migration). */
  url: text('url').notNull(),
  /** Object path in the storage bucket; `null` for files not in Storage yet. */
  storagePath: text('storage_path'),
  name: text('name').notNull(),
  folder: mediaFolder('folder').notNull(),
  width: integer('width'),
  height: integer('height'),
  sizeKb: integer('size_kb'),
  uploadedByAdminId: uuid('uploaded_by_admin_id').references(() => admins.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
}).enableRLS();

export const socialLinks = pgTable(
  'social_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    platform: socialPlatform('platform').notNull(),
    division: socialDivision('division').notNull(),
    /** Display handle, e.g. @luxichic.hairs. */
    handle: text('handle').notNull(),
    url: text('url').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    sortOrder: smallint('sort_order').notNull().default(0),
  },
  () => [publicRead('social_links: public read enabled', sql`enabled`)],
);

/**
 * Store settings, one JSON value per key: business, bank, pay_on_delivery, delivery_estimate,
 * telegram, whatsapp, email, notifications, security.
 * Secrets (API keys, bot tokens) are NEVER stored here; they live in environment variables.
 * Server code exposes only the public parts (business contact, bank details at checkout).
 */
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedByAdminId: uuid('updated_by_admin_id').references(() => admins.id, { onDelete: 'set null' }),
  updatedAt: updatedAt(),
}).enableRLS();

export const emailTemplates = pgTable('email_templates', {
  /** Stable key, e.g. "order_received", "payment_confirmed". */
  key: text('key').primaryKey(),
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  variables: text('variables')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  enabled: boolean('enabled').notNull().default(true),
  updatedAt: updatedAt(),
}).enableRLS();
