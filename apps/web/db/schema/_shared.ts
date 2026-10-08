import { sql } from 'drizzle-orm';
import { pgEnum, pgPolicy, timestamp } from 'drizzle-orm/pg-core';
import { anonRole, authenticatedRole, authUid } from 'drizzle-orm/supabase';

/*
 * Conventions for every table:
 * - Money is stored as whole naira in `integer` columns (the prototype never uses kobo).
 * - Timestamps are `timestamptz`; dates without a time (appointments, blocks, discounts) are `date`.
 * - RLS is on everywhere. Tables without policies are reachable only by server code using the
 *   service role / direct DB connection, after the server has checked admin permissions.
 */

export const createdAt = () => timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
export const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date());

/** Anyone (signed in or not) may read rows matching `using`. */
export const publicRead = (name: string, using = sql`true`) =>
  pgPolicy(name, { for: 'select', to: [anonRole, authenticatedRole], using });

/** A signed-in customer may run `op` on rows where `column` is their user id. */
export const ownRows = (name: string, op: 'select' | 'insert' | 'update' | 'delete' | 'all', column = sql`user_id`) =>
  pgPolicy(name, {
    for: op,
    to: authenticatedRole,
    using: op === 'insert' ? undefined : sql`${column} = ${authUid}`,
    withCheck: op === 'select' || op === 'delete' ? undefined : sql`${column} = ${authUid}`,
  });

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const division = pgEnum('division', ['hairs', 'tools']);

export const profileStatus = pgEnum('profile_status', ['active', 'blocked']);
export const adminStatus = pgEnum('admin_status', ['active', 'suspended']);

export const productStatus = pgEnum('product_status', ['draft', 'published', 'archived']);
export const outOfStockBehaviour = pgEnum('out_of_stock_behaviour', ['hide', 'show_sold_out']);
export const productDiscountMode = pgEnum('product_discount_mode', ['none', 'fixed', 'percent']);

export const discountType = pgEnum('discount_type', ['percent', 'fixed']);
export const discountScope = pgEnum('discount_scope', ['all', 'hairs', 'tools']);

export const orderStatus = pgEnum('order_status', [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]);
export const orderEventStep = pgEnum('order_event_step', [
  'order_placed',
  'awaiting_payment',
  'payment_confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]);
export const paymentMethod = pgEnum('payment_method', ['bank_transfer', 'pay_on_delivery']);
export const paymentStatus = pgEnum('payment_status', [
  'pending_verification',
  'payment_confirmed',
  'pay_on_delivery',
  'paid',
]);

export const reviewStatus = pgEnum('review_status', ['visible', 'hidden', 'archived']);

export const serviceStatus = pgEnum('service_status', ['draft', 'published', 'archived']);
export const specialistStatus = pgEnum('specialist_status', ['active', 'on_leave', 'archived']);
export const appointmentStatus = pgEnum('appointment_status', [
  'pending',
  'confirmed',
  'rescheduled',
  'completed',
  'rejected',
  'cancelled',
]);

export const testimonialStatus = pgEnum('testimonial_status', ['active', 'archived']);
export const socialPlatform = pgEnum('social_platform', [
  'instagram',
  'tiktok',
  'whatsapp',
  'facebook',
  'x',
  'youtube',
  'snapchat',
  'website',
]);
export const socialDivision = pgEnum('social_division', ['main', 'hairs', 'salon', 'tools']);
export const mediaFolder = pgEnum('media_folder', ['homepage', 'hairs', 'hair_tools', 'salon', 'products', 'services']);

export const notificationKind = pgEnum('notification_kind', [
  'order',
  'payment',
  'appointment',
  'stock',
  'customer',
  'review',
  'integration',
]);
export const noteSubject = pgEnum('note_subject', ['order', 'customer']);
