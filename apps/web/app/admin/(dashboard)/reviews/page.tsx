import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { Reviews } from '@/views/admin/catalog/Reviews';

export const metadata: Metadata = { title: 'Reviews — Admin' };

export default function AdminReviewsPage() {
  return (
    <RequirePermission permission="reviews.view">
      <Reviews />
    </RequirePermission>);

}
