import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { Products } from '@/views/admin/products/Products';

export const metadata: Metadata = { title: 'Products — Admin' };

export default function AdminProductsPage() {
  return (
    <RequirePermission permission="products.view">
      <Products />
    </RequirePermission>
  );
}
