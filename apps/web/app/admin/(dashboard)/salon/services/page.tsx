import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { SalonServices } from '@/views/admin/salon/SalonServices';

export const metadata: Metadata = { title: 'Salon services — Admin' };

export default function AdminSalonServicesPage() {
  return (
    <RequirePermission permission="salon.services">
      <SalonServices />
    </RequirePermission>);

}
