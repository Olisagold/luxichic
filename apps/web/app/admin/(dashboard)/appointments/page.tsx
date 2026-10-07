import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { Appointments } from '@/views/admin/salon/Appointments';

export const metadata: Metadata = { title: 'Appointments — Admin' };

export default function AdminAppointmentsPage() {
  return (
    <RequirePermission permission="appointments.view">
      <Appointments />
    </RequirePermission>);

}
