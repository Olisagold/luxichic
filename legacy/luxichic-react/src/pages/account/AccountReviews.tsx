import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { StarIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Review } from '../../types/user';
import { useAuth } from '../../contexts/AuthContext';
import { useReviews } from '../../contexts/ReviewsContext';
import { Stars } from '../../components/ui/Stars';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { ReviewForm } from '../../components/product/ReviewForm';
import { findProductById } from '../../utils/products';
import { formatDate } from '../../utils/dates';

export function AccountReviews() {
  const { user } = useAuth();
  const { byAuthor, updateReview, deleteReview } = useReviews();
  const [editing, setEditing] = useState<Review | null>(null);
  if (!user) return null;
  const reviews = byAuthor(user.email);

  return (
    <div>
      <h1 className="font-display text-5xl text-ink">My reviews</h1>
      <div className="mt-8">
        {reviews.length === 0 ?
        <EmptyState icon={<StarIcon className="h-7 w-7" />} title="No reviews yet" text="Share your thoughts on products you’ve bought from the product page." actions={<Button to="/hairs">Browse products</Button>} /> :

        <ul className="space-y-4">
            {reviews.map((r) => {
            const p = findProductById(r.productId);
            return (
              <li key={r.id} className="flex flex-col gap-4 rounded-[24px] bg-white p-6 sm:flex-row">
                  {p && <img src={p.images[0]} alt="" className="h-20 w-16 shrink-0 rounded-xl object-cover" loading="lazy" />}
                  <div className="min-w-0 flex-1">
                    {p && <Link to={`/${p.division}/product/${p.slug}`} className="text-xs font-semibold text-subtle hover:text-ink">{p.name}</Link>}
                    <div className="mt-1 flex items-center gap-3"><Stars rating={r.rating} /><span className="text-xs text-subtle">{formatDate(r.date)}</span></div>
                    <p className="mt-2 font-semibold text-ink">{r.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-charcoal">{r.body}</p>
                    <div className="mt-4 flex gap-4 text-xs font-semibold">
                      <button onClick={() => setEditing(r)} className="text-ink hover:text-pink-deep">Edit</button>
                      <button onClick={() => {deleteReview(r.id);toast('Review deleted');}} className="text-subtle hover:text-red-700">Delete</button>
                    </div>
                  </div>
                </li>);

          })}
          </ul>
        }
      </div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit review" className="max-w-xl">
        {editing &&
        <div className="p-6">
            <ReviewForm
            initial={{ rating: editing.rating, title: editing.title, body: editing.body, images: editing.images ?? [] }}
            submitLabel="Save changes"
            onCancel={() => setEditing(null)}
            onSubmit={(d) => {updateReview(editing.id, d);toast.success('Review updated');setEditing(null);}} />
          
          </div>
        }
      </Modal>
    </div>);

}