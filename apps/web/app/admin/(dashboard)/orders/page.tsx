import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { Orders } from '@/views/admin/orders/Orders';

export const metadata: Metadata = { title: 'Orders — Admin' };

export default function AdminOrdersPage() {
  return (
    <RequirePermission permission="orders.view">
      <Orders />
    </RequirePermission>
  );
}
