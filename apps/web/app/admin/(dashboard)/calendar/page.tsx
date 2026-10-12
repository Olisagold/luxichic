import type { Metadata } from 'next';
import { AdminSalonProvider } from '@/components/admin/AdminSalonProvider';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { salonFor } from '@/lib/salon/admin-queries';
import { AdminCalendar } from '@/views/admin/salon/AdminCalendar';

export const metadata: Metadata = { title: 'Calendar — Admin' };

export default async function AdminCalendarPage() {
  return (
    <RequirePermission permission="appointments.view">
      <AdminSalonProvider value={await salonFor('appointments.view')}>
        <AdminCalendar />
      </AdminSalonProvider>
    </RequirePermission>
  );
}
