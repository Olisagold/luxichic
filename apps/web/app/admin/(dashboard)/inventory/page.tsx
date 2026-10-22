import type { Metadata } from 'next';
import { AdminCatalogProvider } from '@/components/admin/AdminCatalogProvider';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { catalogFor } from '@/lib/catalog/admin-queries';
import { Inventory } from '@/views/admin/products/Inventory';

export const metadata: Metadata = { title: 'Inventory | Admin' };

export default async function AdminInventoryPage() {
  return (
    <RequirePermission permission="inventory.manage">
      <AdminCatalogProvider value={await catalogFor('inventory.manage', { stockMoves: true })}>
        <Inventory />
      </AdminCatalogProvider>
    </RequirePermission>
  );
}
