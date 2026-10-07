import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { ProductEditor } from '@/views/admin/products/ProductEditor';

export const metadata: Metadata = { title: 'Edit product — Admin' };

export default function AdminProductEditorPage() {
  return (
    <RequirePermission permission="products.view">
      <ProductEditor />
    </RequirePermission>);

}
