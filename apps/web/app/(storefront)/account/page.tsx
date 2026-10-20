import type { Metadata } from 'next';
import { countGuestRecords, hasVerifiedEmail, linkGuestRecords } from '@/lib/auth/guest-records';
import { getAuthUser, getCustomer } from '@/lib/auth/session';
import { getCustomerOrders } from '@/lib/orders/queries';
import { getCustomerAppointments } from '@/lib/salon/queries';
import { AccountOverview } from '@/views/account/AccountOverview';

export const metadata: Metadata = { title: 'My account' };

export default async function AccountOverviewPage() {
  // Guest orders and bookings made with this email: added now if the email is confirmed, otherwise counted so
  // the page can ask them to confirm it.
  const [user, customer] = [await getAuthUser(), await getCustomer()];
  let pending = { orders: 0, appointments: 0 };
  if (user?.email && customer) {
    if (hasVerifiedEmail(user)) await linkGuestRecords(user);
    else pending = await countGuestRecords(user.email);
  }
  const orders = await getCustomerOrders();
  const appointments = await getCustomerAppointments();
  return <AccountOverview orders={orders} appointments={appointments} pending={pending} />;
}
