import type { Metadata } from 'next';
import { AccountAppointments } from '@/views/account/AccountAppointments';

export const metadata: Metadata = { title: 'My appointments' };

export default function AccountAppointmentsPage() {
  return <AccountAppointments />;
}
