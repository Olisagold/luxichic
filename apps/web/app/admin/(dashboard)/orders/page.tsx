import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { getAdmin, hasPermission } from '@/lib/auth/session';
import { listOrdersForAdmin } from '@/lib/orders/admin-queries';
import { Orders } from '@/views/admin/orders/Orders';

export const metadata: Metadata = { title: 'Orders | Admin' };

export default async function AdminOrdersPage() {
  const admin = await getAdmin();
  const orders = admin && hasPermission(admin, 'orders.view') ? await listOrdersForAdmin() : [];
  return (
    <RequirePermission permission="orders.view">
      <Orders orders={orders} />
    </RequirePermission>
  );
}
