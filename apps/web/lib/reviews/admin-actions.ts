'use server';

import { revalidateTag } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { auditLogs, reviews } from '@/db/schema';
import { AuthorizationError, requirePermission } from '@/lib/auth/session';
import { REVIEWS_TAG } from '@/lib/reviews/queries';
import { STOREFRONT_TAG } from '@/lib/storefront/data';
import { isUuid } from '@/lib/utils/validation';
import type { Result } from '@/types/user';

/**
 * Review moderation. Each action checks `reviews.moderate` on the server and writes to `audit_logs`. Product
 * ratings follow automatically (database trigger), so the catalog cache is refreshed too.
 */

type Status = 'visible' | 'hidden' | 'archived';
const STATUSES: Status[] = ['visible', 'hidden', 'archived'];
const ACTION: Record<Status, string> = {
  visible: 'Restored review',
  hidden: 'Hid review',
  archived: 'Archived review',
};

async function moderate(
  id: string,
  change: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<string | undefined>,
  action: (title: string) => string,
): Promise<Result> {
  try {
    const admin = await requirePermission('reviews.moderate');
    if (!isUuid(id)) return { ok: false, error: 'Review not found.' };
    const done = await db.transaction(async (tx) => {
      const title = await change(tx);
      if (title === undefined) return false;
      await tx.insert(auditLogs).values({
        adminId: admin.id,
        adminName: admin.fullName,
        section: 'Reviews',
        action: action(title),
        target: title,
        link: '/admin/reviews',
      });
      return true;
    });
    if (!done) return { ok: false, error: 'Review not found.' };
    revalidateTag(REVIEWS_TAG);
    revalidateTag(STOREFRONT_TAG);
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: e.message };
    throw e;
  }
}

/** Shows (visible), hides or archives a review. Hidden and archived reviews don't count towards ratings. */
export async function setReviewStatus(id: string, status: Status): Promise<Result> {
  if (!STATUSES.includes(status)) return { ok: false, error: 'Unknown status.' };
  return moderate(
    id,
    async (tx) => {
      const [row] = await tx
        .update(reviews)
        .set({ status, updatedAt: new Date() })
        .where(eq(reviews.id, id))
        .returning({ title: reviews.title });
      return row?.title;
    },
    () => ACTION[status],
  );
}

/** Deletes a review for good. */
export async function deleteReview(id: string): Promise<Result> {
  return moderate(
    id,
    async (tx) => {
      const [row] = await tx.delete(reviews).where(eq(reviews.id, id)).returning({ title: reviews.title });
      return row?.title;
    },
    () => 'Deleted review',
  );
}
