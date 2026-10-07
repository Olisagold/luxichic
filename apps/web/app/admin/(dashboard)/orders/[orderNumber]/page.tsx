import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { OrderDetail } from '@/views/admin/orders/OrderDetail';

export const metadata: Metadata = { title: 'Order — Admin' };

export default function AdminOrderDetailPage() {
  return (
    <RequirePermission permission="orders.view">
      <OrderDetail />
    </RequirePermission>);

}
