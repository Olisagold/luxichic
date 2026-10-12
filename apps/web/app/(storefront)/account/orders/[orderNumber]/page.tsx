import { getCustomerOrder } from '@/lib/orders/queries';
import { AccountOrderDetail } from '@/views/account/AccountOrderDetail';

export default async function AccountOrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  return <AccountOrderDetail order={await getCustomerOrder(decodeURIComponent(orderNumber))} />;
}
