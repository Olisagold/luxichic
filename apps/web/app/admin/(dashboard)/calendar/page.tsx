import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { AdminCalendar } from '@/views/admin/salon/AdminCalendar';

export const metadata: Metadata = { title: 'Calendar — Admin' };

export default function AdminCalendarPage() {
  return (
    <RequirePermission permission="appointments.view">
      <AdminCalendar />
    </RequirePermission>);

}
