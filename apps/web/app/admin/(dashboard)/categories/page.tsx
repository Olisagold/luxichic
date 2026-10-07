import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { Categories } from '@/views/admin/catalog/Categories';

export const metadata: Metadata = { title: 'Categories — Admin' };

export default function AdminCategoriesPage() {
  return (
    <RequirePermission permission="categories.manage">
      <Categories />
    </RequirePermission>
  );
}
