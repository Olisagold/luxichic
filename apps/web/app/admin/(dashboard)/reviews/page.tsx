import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { getAdmin, hasPermission } from '@/lib/auth/session';
import { reviewsForAdmin } from '@/lib/reviews/queries';
import { Reviews } from '@/views/admin/catalog/Reviews';

export const metadata: Metadata = { title: 'Reviews | Admin' };

export default async function AdminReviewsPage() {
  const admin = await getAdmin();
  // Only admins who may see reviews get them from the server; the wrapper explains the rest.
  const reviews = admin && hasPermission(admin, 'reviews.view') ? await reviewsForAdmin() : [];
  return (
    <RequirePermission permission="reviews.view">
      <Reviews reviews={reviews} />
    </RequirePermission>
  );
}
