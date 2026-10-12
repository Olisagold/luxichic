import type { Metadata } from 'next';
import { getCustomerOrders } from '@/lib/orders/queries';
import { AccountOverview } from '@/views/account/AccountOverview';

export const metadata: Metadata = { title: 'My account' };

export default async function AccountOverviewPage() {
  return <AccountOverview orders={await getCustomerOrders()} />;
}
