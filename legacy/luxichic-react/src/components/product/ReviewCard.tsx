import React from 'react';
import { BadgeCheckIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import type { Review } from '../../types/user';
import { Stars } from '../ui/Stars';
import { formatDate } from '../../utils/dates';

interface ReviewCardProps {
  review: Review;
  isOwn?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ReviewCard({ review, isOwn, onEdit, onDelete }: ReviewCardProps) {
  return (
    <article className="grid gap-4 py-7 md:grid-cols-[200px_1fr]">
      <div>
        <p className="text-sm font-semibold text-ink">{review.authorName}</p>
        <p className="mt-0.5 text-xs text-subtle">{formatDate(review.date)}</p>
        {review.verified &&
        <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
            <BadgeCheckIcon className="h-3.5 w-3.5" aria-hidden /> Verified purchase
          </p>
        }
      </div>
      <div>
        <Stars rating={review.rating} />
        <h4 className="mt-2 text-[15px] font-semibold text-ink">{review.title}</h4>
        <p className="mt-1.5 text-sm leading-relaxed text-charcoal">{review.body}</p>
        {review.images && review.images.length > 0 &&
        <div className="mt-4 flex gap-2">
            {review.images.map((src, i) =>
          <img key={i} src={src} alt={`Customer photo ${i + 1}`} className="h-20 w-20 rounded-xl object-cover" />
          )}
          </div>
        }
        {isOwn &&
        <div className="mt-4 flex gap-4 text-xs font-semibold">
            <button onClick={onEdit} className="inline-flex items-center gap-1.5 text-ink hover:text-pink-deep">
              <PencilIcon className="h-3.5 w-3.5" aria-hidden /> Edit
            </button>
            <button onClick={onDelete} className="inline-flex items-center gap-1.5 text-red-700 hover:text-red-800">
              <Trash2Icon className="h-3.5 w-3.5" aria-hidden /> Delete
            </button>
          </div>
        }
      </div>
    </article>);

}