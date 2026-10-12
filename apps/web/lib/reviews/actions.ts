'use server';

import { revalidateTag } from 'next/cache';
import { and, eq, ne, notInArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { orderItems, orders, reviews } from '@/db/schema';
import { authReady } from '@/lib/auth/helpers';
import { getCustomer } from '@/lib/auth/session';
import { env, requireEnv } from '@/lib/env';
import { MEDIA_BUCKET, mediaUrl, resizedUrl } from '@/lib/media/urls';
import { processImage } from '@/lib/media/variants';
import { REVIEWS_TAG, toReview } from '@/lib/reviews/queries';
import { findProductById } from '@/lib/storefront/catalog';
import { STOREFRONT_TAG, getStorefrontData } from '@/lib/storefront/data';
import { createAdminClient } from '@/lib/supabase/admin';
import { isUuid } from '@/lib/utils/validation';
import type { Result, Review } from '@/types/user';

/**
 * Reviews by signed-in customers. Anyone with an account can review any product (many buy in the physical
 * store); `verified` marks those who also ordered it online. One review per customer per product: posting again
 * edits it.
 */

const SIGNED_OUT: Result = { ok: false, error: 'Please sign in to review products.' };
const MAX_PHOTOS = 3;
/** The browser shrinks photos before sending (lib/media/shrink.ts), so this is generous. */
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

async function customer() {
  return authReady() ? getCustomer() : null;
}

/** Our resized uploads only, never arbitrary links. */
const isOurPhoto = (url: string) =>
  !!env.NEXT_PUBLIC_SUPABASE_URL &&
  url.startsWith(env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')) &&
  resizedUrl(url, 1200) === url;

const reviewSchema = z.object({
  productId: z.string().refine(isUuid),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(10).max(2000),
  images: z.array(z.string().max(500).refine(isOurPhoto)).max(MAX_PHOTOS),
});

/** Ratings and the product's reviews changed: refresh the cached catalog and review lists. */
function refreshCaches() {
  revalidateTag(REVIEWS_TAG);
  revalidateTag(STOREFRONT_TAG);
}

/** The signed-in customer's review of a product (also when hidden by the admin), or null. */
export async function fetchMyReview(productId: string): Promise<Review | null> {
  const me = await customer();
  if (!me || !isUuid(productId)) return null;
  const [row] = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.userId, me.id), ne(reviews.status, 'archived')));
  return row ? toReview(row) : null;
}

/**
 * Stores one review photo: resized to WebP at the standard widths (lib/media/variants.ts). The original isn't
 * kept, so nothing from the camera (such as location) is published. Returns the 1200px URL.
 */
export async function uploadReviewPhoto(form: FormData): Promise<Result & { url?: string }> {
  const me = await customer();
  if (!me) return SIGNED_OUT;
  const file = form.get('photo');
  if (!(file instanceof File) || !file.type.startsWith('image/')) return { ok: false, error: 'Please choose a photo.' };
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, error: 'That photo is too large.' };
  try {
    const image = await processImage(Buffer.from(await file.arrayBuffer()));
    const storage = createAdminClient().storage.from(MEDIA_BUCKET);
    for (const f of image.files.filter((x) => !x.path.includes('/original.'))) {
      const { error } = await storage.upload(f.path, f.body, {
        contentType: f.contentType,
        cacheControl: '31536000',
        upsert: true,
      });
      if (error) throw error;
    }
    return { ok: true, url: mediaUrl(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), image.key) };
  } catch {
    return { ok: false, error: 'We couldn’t use that photo. Please try a JPEG or PNG.' };
  }
}

/** Posts the customer's review of a product, or saves changes to the one they already wrote. */
export async function saveReview(input: z.input<typeof reviewSchema>): Promise<Result> {
  const me = await customer();
  if (!me) return SIGNED_OUT;
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Please add a rating, a short title and a few words.' };
  const d = parsed.data;
  if (!findProductById(await getStorefrontData(), d.productId)) {
    return { ok: false, error: 'This product can’t be reviewed right now.' };
  }

  // Bought it online (any order that wasn't cancelled or left unconfirmed).
  const [bought] = await db
    .select({ id: orders.id })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orders.userId, me.id),
        eq(orderItems.productId, d.productId),
        notInArray(orders.status, ['pending', 'cancelled']),
      ),
    )
    .limit(1);

  const content = {
    authorName: me.fullName,
    authorEmail: me.email,
    rating: d.rating,
    title: d.title,
    body: d.body,
    images: d.images,
    verified: !!bought,
  };
  await db
    .insert(reviews)
    .values({ productId: d.productId, userId: me.id, ...content })
    .onConflictDoUpdate({
      target: [reviews.productId, reviews.userId],
      targetWhere: sql`${reviews.userId} is not null`,
      // A review the salon hid stays hidden when edited.
      set: { ...content, updatedAt: new Date() },
    });
  refreshCaches();
  return { ok: true };
}

export async function deleteMyReview(productId: string): Promise<Result> {
  const me = await customer();
  if (!me) return SIGNED_OUT;
  if (!isUuid(productId)) return { ok: false, error: 'Review not found.' };
  await db.delete(reviews).where(and(eq(reviews.productId, productId), eq(reviews.userId, me.id)));
  refreshCaches();
  return { ok: true };
}
