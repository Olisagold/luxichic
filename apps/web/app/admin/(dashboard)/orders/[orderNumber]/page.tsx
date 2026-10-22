import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { getAdmin, hasPermission } from '@/lib/auth/session';
import { getOrderForAdmin } from '@/lib/orders/admin-queries';
import { OrderDetail } from '@/views/admin/orders/OrderDetail';

export const metadata: Metadata = { title: 'Order | Admin' };

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const admin = await getAdmin();
  const data =
    admin && hasPermission(admin, 'orders.view') ? await getOrderForAdmin(decodeURIComponent(orderNumber)) : null;
  return (
    <RequirePermission permission="orders.view">
      <OrderDetail data={data} />
    </RequirePermission>
  );
}
