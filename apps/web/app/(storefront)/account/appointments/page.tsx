import type { Metadata } from 'next';
import { getCustomerAppointments } from '@/lib/salon/queries';
import { AccountAppointments } from '@/views/account/AccountAppointments';

export const metadata: Metadata = { title: 'My appointments' };

export default async function AccountAppointmentsPage() {
  return <AccountAppointments appointments={await getCustomerAppointments()} />;
}
