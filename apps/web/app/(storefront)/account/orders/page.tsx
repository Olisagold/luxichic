import type { Metadata } from 'next';
import { getCustomerOrders } from '@/lib/orders/queries';
import { AccountOrders } from '@/views/account/AccountOrders';

export const metadata: Metadata = { title: 'My orders' };

export default async function AccountOrdersPage() {
  return <AccountOrders orders={await getCustomerOrders()} />;
}
