'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { reviews } from '@/db/schema';
import { ActionError, adminAction, audit } from '@/lib/auth/admin-action';
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

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Runs a moderation change (returns the review's title, or undefined if it doesn't exist) and logs it. */
async function moderate(id: string, change: (tx: Tx) => Promise<string | undefined>, action: string): Promise<Result> {
  return adminAction(
    'reviews.moderate',
    async (admin) => {
      if (!isUuid(id)) throw new ActionError('Review not found.');
      await db.transaction(async (tx) => {
        const title = await change(tx);
        if (title === undefined) throw new ActionError('Review not found.');
        await audit(tx, admin, { section: 'Reviews', action, target: title, link: '/admin/reviews' });
      });
      return { ok: true };
    },
    { revalidate: [REVIEWS_TAG, STOREFRONT_TAG] },
  );
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
    ACTION[status],
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
    'Deleted review',
  );
}
