'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { EyeOffIcon, PenLineIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/types/product';
import type { Review } from '@/types/user';
import { Stars } from '@/components/ui/Stars';
import { Button } from '@/components/ui/Button';
import { ReviewForm, type ReviewDraft } from '@/components/product/ReviewForm';
import { ReviewCard } from '@/components/product/ReviewCard';
import { useAuth } from '@/contexts/AuthContext';
import { deleteMyReview, fetchMyReview, saveReview } from '@/lib/reviews/actions';
import { reviewsLabel } from '@/lib/utils/products';

/**
 * A product's reviews (visible ones, loaded on the server) and the signed-in customer's own review. Any
 * customer with an account can review; one review each, which they can edit or delete.
 */
export function ReviewsSection({ product, reviews }: { product: Product; reviews: Review[] }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mine, setMine] = useState<Review | null>(null);
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    let stale = false;
    if (!user) return setMine(null);
    fetchMyReview(product.id)
      .then((r) => !stale && setMine(r))
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [user, product.id]);

  const save = async (d: ReviewDraft) => {
    const res = await saveReview({ productId: product.id, ...d });
    if (!res.ok) return res.error ?? 'We couldn’t save your review.';
    toast.success(mine ? 'Your review has been updated.' : 'Thank you! Your review has been posted.');
    setWriting(false);
    setMine(await fetchMyReview(product.id));
    router.refresh();
  };

  const remove = async () => {
    if (!window.confirm('Delete your review? This cannot be undone.')) return;
    const res = await deleteMyReview(product.id);
    if (!res.ok) return toast.error(res.error ?? 'We couldn’t delete your review.');
    toast('Your review has been deleted.');
    setMine(null);
    router.refresh();
  };

  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));
  const hiddenMine = mine && mine.status !== 'visible';

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[300px_1fr]">
      <aside>
        {product.reviewCount > 0 ? (
          <>
            <p className="font-display text-6xl leading-none text-ink">{product.rating.toFixed(1)}</p>
            <Stars rating={product.rating} size="md" className="mt-3" />
            <p className="mt-2 text-sm text-subtle">Based on {reviewsLabel(product.reviewCount)}</p>
            <div className="mt-6 space-y-2" aria-label="Rating distribution">
              {dist.map((d) => (
                <div key={d.star} className="flex items-center gap-3 text-xs">
                  <span className="w-8 tabular-nums text-subtle">{d.star}★</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                    <span
                      className="block h-full rounded-full bg-gold"
                      style={{ width: `${reviews.length ? (d.count / reviews.length) * 100 : 0}%` }}
                    />
                  </span>
                  <span className="w-6 text-right tabular-nums text-subtle">{d.count}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="font-display text-3xl leading-tight text-ink">No reviews yet</p>
        )}

        <div className="mt-8">
          {user ? (
            mine ? (
              <p className="text-sm text-subtle">You have reviewed this product. You can edit or delete your review.</p>
            ) : (
              !writing && (
                <Button onClick={() => setWriting(true)} variant="outline">
                  <PenLineIcon className="h-4 w-4" aria-hidden /> Write a Review
                </Button>
              )
            )
          ) : (
            <div className="rounded-2xl bg-blush/60 p-5 text-sm leading-relaxed text-charcoal">
              <p className="font-semibold text-ink">Reviews are for LUXICHIC account holders.</p>
              <p className="mt-1.5">
                Bought this online or in our store? Sign in or create a free account to share what you think.
              </p>
              <Link
                href={`/login?redirect=${encodeURIComponent(pathname)}`}
                className="mt-3 inline-block text-xs font-bold uppercase tracking-[0.14em] text-pink-deep underline-offset-4 hover:underline"
              >
                Sign in to write a review
              </Link>
            </div>
          )}
        </div>
      </aside>

      <div>
        {user && writing && (
          <div className="mb-8">
            <ReviewForm
              initial={
                mine
                  ? { rating: mine.rating, title: mine.title, body: mine.body, images: mine.images ?? [] }
                  : undefined
              }
              submitLabel={mine ? 'Save Changes' : 'Post Review'}
              onCancel={() => setWriting(false)}
              onSubmit={save}
            />
          </div>
        )}
        {hiddenMine && !writing && (
          <div className="mb-6 rounded-2xl bg-ivory p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <EyeOffIcon className="h-4 w-4" aria-hidden /> Your review isn’t shown publicly
            </p>
            <p className="mt-1 text-sm text-subtle">LUXICHIC has hidden it. Only you can see it here.</p>
            <ReviewCard review={mine} isOwn onEdit={() => setWriting(true)} onDelete={remove} />
          </div>
        )}
        {reviews.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-subtle">
            No written reviews yet. Be the first to share your thoughts.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {reviews.map((r) =>
              mine?.id === r.id && writing ? null : (
                <ReviewCard
                  key={r.id}
                  review={r}
                  isOwn={mine?.id === r.id}
                  onEdit={() => setWriting(true)}
                  onDelete={remove}
                />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
