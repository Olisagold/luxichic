import type { Metadata } from 'next';
import { AdminCatalogProvider } from '@/components/admin/AdminCatalogProvider';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { catalogFor } from '@/lib/catalog/admin-queries';
import { ProductEditor } from '@/views/admin/products/ProductEditor';

export const metadata: Metadata = { title: 'Edit product | Admin' };

export default async function AdminProductEditorPage() {
  return (
    <RequirePermission permission="products.view">
      <AdminCatalogProvider value={await catalogFor('products.view', { media: true })}>
        <ProductEditor />
      </AdminCatalogProvider>
    </RequirePermission>
  );
}
