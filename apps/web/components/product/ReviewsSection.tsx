'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PenLineIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/types/product';
import { Stars } from '@/components/ui/Stars';
import { Button } from '@/components/ui/Button';
import { ReviewForm } from '@/components/product/ReviewForm';
import { ReviewCard } from '@/components/product/ReviewCard';
import { useAuth } from '@/contexts/AuthContext';
import { useReviews } from '@/contexts/ReviewsContext';
import { useOrders } from '@/contexts/OrdersContext';

export function ReviewsSection({ product }: { product: Product }) {
  const { user } = useAuth();
  const { forProduct, addReview, updateReview, deleteReview } = useReviews();
  const { ordersForAccount } = useOrders();
  const [writing, setWriting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const reviews = forProduct(product.id);
  /** Verified only when the signed-in customer has a confirmed order containing this product. */
  const purchased =
    !!user &&
    ordersForAccount(user.email).some(
      (o) => o.status !== 'Pending' && o.status !== 'Cancelled' && o.items.some((i) => i.productId === product.id),
    );
  const alreadyReviewed = !!user && reviews.some((r) => r.authorEmail?.toLowerCase() === user.email.toLowerCase());

  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[300px_1fr]">
      <aside>
        <p className="font-display text-6xl leading-none text-ink">{product.rating.toFixed(1)}</p>
        <Stars rating={product.rating} size="md" className="mt-3" />
        <p className="mt-2 text-sm text-subtle">Based on {product.reviewCount} ratings</p>
        <div className="mt-6 space-y-2" aria-label="Rating distribution of written reviews">
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
          <p className="pt-1 text-[11px] text-subtle">Distribution of {reviews.length} written reviews</p>
        </div>

        <div className="mt-8">
          {user ? (
            alreadyReviewed ? (
              <p className="text-sm text-subtle">You have reviewed this product. You can edit your review below.</p>
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
                Shopped as a guest? Once your order is confirmed, we will send you a link to create your account — then
                you can review your purchase.
              </p>
              <Link
                href="/login"
                className="mt-3 inline-block text-xs font-bold uppercase tracking-[0.14em] text-pink-deep underline-offset-4 hover:underline"
              >
                Sign in to write a review
              </Link>
            </div>
          )}
        </div>
      </aside>

      <div>
        {writing && user && (
          <div className="mb-8">
            <ReviewForm
              onCancel={() => setWriting(false)}
              onSubmit={(d) => {
                addReview({
                  productId: product.id,
                  authorName: user.fullName,
                  authorEmail: user.email,
                  rating: d.rating,
                  title: d.title,
                  body: d.body,
                  images: d.images,
                  verified: purchased,
                });
                setWriting(false);
                toast.success('Thank you! Your review has been posted.');
              }}
            />
          </div>
        )}
        {reviews.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-subtle">
            No written reviews yet. Be the first to share your thoughts.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {reviews.map((r) =>
              editingId === r.id ? (
                <div key={r.id} className="py-6">
                  <ReviewForm
                    initial={{ rating: r.rating, title: r.title, body: r.body, images: r.images ?? [] }}
                    submitLabel="Save Changes"
                    onCancel={() => setEditingId(null)}
                    onSubmit={(d) => {
                      updateReview(r.id, d);
                      setEditingId(null);
                      toast.success('Your review has been updated.');
                    }}
                  />
                </div>
              ) : (
                <ReviewCard
                  key={r.id}
                  review={r}
                  isOwn={!!user && r.authorEmail?.toLowerCase() === user.email.toLowerCase()}
                  onEdit={() => setEditingId(r.id)}
                  onDelete={() => {
                    if (window.confirm('Delete this review? This cannot be undone.')) {
                      deleteReview(r.id);
                      toast('Your review has been deleted.');
                    }
                  }}
                />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
