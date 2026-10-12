import type { Metadata } from 'next';
import { getCustomerOrders } from '@/lib/orders/queries';
import { getCustomerAppointments } from '@/lib/salon/queries';
import { AccountOverview } from '@/views/account/AccountOverview';

export const metadata: Metadata = { title: 'My account' };

export default async function AccountOverviewPage() {
  const orders = await getCustomerOrders();
  const appointments = await getCustomerAppointments();
  return <AccountOverview orders={orders} appointments={appointments} />;
}
