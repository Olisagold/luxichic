'use client';

import React, { createContext, useContext } from 'react';
import type { Review } from '@/types/user';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { seedReviews } from '@/data/seed';
import { generatedReviews } from '@/data/adminSeed';
import { generateId } from '@/lib/utils/references';
import { pushNotification, updateDb } from '@/lib/mock-db/db';

type ReviewStatus = NonNullable<Review['status']>;

interface ReviewsContextValue {
  /** Every review regardless of moderation status (admin only). */
  all: Review[];
  forProduct: (productId: string) => Review[];
  byAuthor: (email: string) => Review[];
  addReview: (r: Omit<Review, 'id' | 'date'>) => void;
  updateReview: (id: string, patch: Partial<Pick<Review, 'rating' | 'title' | 'body' | 'images'>>) => void;
  deleteReview: (id: string) => void;
  setStatus: (id: string, status: ReviewStatus) => void;
}

const ReviewsContext = createContext<ReviewsContextValue | null>(null);

const isVisible = (r: Review) => (r.status ?? 'visible') === 'visible';

/** In production, edit/delete/moderation must be authorised server-side. */
export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  const [reviews, setReviews] = useLocalStorage<Review[]>('lx_reviews_v2', () => [...generatedReviews, ...seedReviews]);

  const value: ReviewsContextValue = {
    all: reviews,
    forProduct: (productId) =>
      reviews.filter((r) => r.productId === productId && isVisible(r)).sort((a, b) => b.date.localeCompare(a.date)),
    byAuthor: (email) =>
      reviews.filter((r) => r.authorEmail?.toLowerCase() === email.toLowerCase() && r.status !== 'archived'),
    addReview: (r) => {
      setReviews((prev) => [
        { ...r, id: generateId('r'), date: new Date().toISOString().slice(0, 10), status: 'visible' },
        ...prev,
      ]);
      updateDb((d) =>
        pushNotification(d, {
          kind: 'review',
          title: 'New review',
          body: `${r.authorName} left a ${r.rating}★ review.`,
          link: '/admin/reviews',
        }),
      );
    },
    updateReview: (id, patch) => setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r))),
    deleteReview: (id) => setReviews((prev) => prev.filter((r) => r.id !== id)),
    setStatus: (id, status) => setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r))),
  };

  return <ReviewsContext.Provider value={value}>{children}</ReviewsContext.Provider>;
}

export function useReviews() {
  const ctx = useContext(ReviewsContext);
  if (!ctx) throw new Error('useReviews must be used within ReviewsProvider');
  return ctx;
}
