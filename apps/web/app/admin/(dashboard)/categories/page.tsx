import type { Metadata } from 'next';
import { AdminCatalogProvider } from '@/components/admin/AdminCatalogProvider';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { catalogFor } from '@/lib/catalog/admin-queries';
import { Categories } from '@/views/admin/catalog/Categories';

export const metadata: Metadata = { title: 'Categories | Admin' };

export default async function AdminCategoriesPage() {
  return (
    <RequirePermission permission="categories.manage">
      <AdminCatalogProvider value={await catalogFor('categories.manage')}>
        <Categories />
      </AdminCatalogProvider>
    </RequirePermission>
  );
}
