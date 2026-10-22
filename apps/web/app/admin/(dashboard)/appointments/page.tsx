import type { Metadata } from 'next';
import { AdminSalonProvider } from '@/components/admin/AdminSalonProvider';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { salonFor } from '@/lib/salon/admin-queries';
import { Appointments } from '@/views/admin/salon/Appointments';

export const metadata: Metadata = { title: 'Appointments | Admin' };

export default async function AdminAppointmentsPage() {
  return (
    <RequirePermission permission="appointments.view">
      <AdminSalonProvider value={await salonFor('appointments.view')}>
        <Appointments />
      </AdminSalonProvider>
    </RequirePermission>
  );
}
