import type { Metadata } from 'next';
import { AdminSalonProvider } from '@/components/admin/AdminSalonProvider';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { salonFor } from '@/lib/salon/admin-queries';
import { Availability } from '@/views/admin/salon/Availability';

export const metadata: Metadata = { title: 'Availability — Admin' };

export default async function AdminAvailabilityPage() {
  return (
    <RequirePermission permission="salon.availability">
      <AdminSalonProvider value={await salonFor('salon.availability')}>
        <Availability />
      </AdminSalonProvider>
    </RequirePermission>
  );
}
