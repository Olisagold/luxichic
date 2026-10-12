import type { Metadata } from 'next';
import { AdminCatalogProvider } from '@/components/admin/AdminCatalogProvider';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { catalogFor } from '@/lib/catalog/admin-queries';
import { Products } from '@/views/admin/products/Products';

export const metadata: Metadata = { title: 'Products — Admin' };

export default async function AdminProductsPage() {
  return (
    <RequirePermission permission="products.view">
      <AdminCatalogProvider value={await catalogFor('products.view')}>
        <Products />
      </AdminCatalogProvider>
    </RequirePermission>
  );
}
