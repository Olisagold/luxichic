import 'server-only';
import { and, desc, eq, ne } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db } from '@/db';
import { products, reviews } from '@/db/schema';
import { env } from '@/lib/env';
import type { Review } from '@/types/user';

/** Cache tag for public reviews; review changes call `revalidateTag(REVIEWS_TAG)`. */
export const REVIEWS_TAG = 'reviews';

type Row = typeof reviews.$inferSelect;

/** A review as the storefront shows it. Never includes the author's email. */
export function toReview(r: Row): Review {
  return {
    id: r.id,
    productId: r.productId,
    authorName: r.authorName,
    rating: r.rating,
    title: r.title,
    body: r.body,
    images: r.images,
    verified: r.verified,
    date: r.createdAt.toISOString().slice(0, 10),
    status: r.status,
  };
}

/** A product's visible reviews, newest first. Cached; refreshed when any review changes. */
export const getProductReviews = unstable_cache(
  async (productId: string): Promise<Review[]> => {
    if (!env.DATABASE_URL) return [];
    const rows = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.productId, productId), eq(reviews.status, 'visible')))
      .orderBy(desc(reviews.createdAt));
    return rows.map(toReview);
  },
  ['product-reviews-v1', process.env.VERCEL_DEPLOYMENT_ID ?? 'local'],
  { tags: [REVIEWS_TAG], revalidate: 3600 },
);

/** A customer's reviews for their account, including hidden ones (archived ones are gone for them). */
export async function reviewsByUser(userId: string): Promise<Review[]> {
  const rows = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.userId, userId), ne(reviews.status, 'archived')))
    .orderBy(desc(reviews.createdAt));
  return rows.map(toReview);
}

export type AdminReview = Review & { authorEmail?: string; productName: string };

/** Every review with its author's email and product, newest first (admin moderation; caller checks access). */
export async function reviewsForAdmin(): Promise<AdminReview[]> {
  const rows = await db
    .select({ r: reviews, productName: products.name })
    .from(reviews)
    .leftJoin(products, eq(products.id, reviews.productId))
    .orderBy(desc(reviews.createdAt));
  return rows.map(({ r, productName }) => ({
    ...toReview(r),
    authorEmail: r.authorEmail ?? undefined,
    productName: productName ?? 'Removed product',
  }));
}
