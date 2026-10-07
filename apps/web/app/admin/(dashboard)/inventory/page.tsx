import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { Inventory } from '@/views/admin/products/Inventory';

export const metadata: Metadata = { title: 'Inventory — Admin' };

export default function AdminInventoryPage() {
  return (
    <RequirePermission permission="inventory.manage">
      <Inventory />
    </RequirePermission>);

}
