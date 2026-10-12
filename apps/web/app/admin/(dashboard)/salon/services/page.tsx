import type { Metadata } from 'next';
import { AdminSalonProvider } from '@/components/admin/AdminSalonProvider';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { salonFor } from '@/lib/salon/admin-queries';
import { SalonServices } from '@/views/admin/salon/SalonServices';

export const metadata: Metadata = { title: 'Salon services — Admin' };

export default async function AdminSalonServicesPage() {
  return (
    <RequirePermission permission="salon.services">
      <AdminSalonProvider value={await salonFor('salon.services')}>
        <SalonServices />
      </AdminSalonProvider>
    </RequirePermission>
  );
}
