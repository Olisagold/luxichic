import type { Metadata } from 'next';
import { AdminSalonProvider } from '@/components/admin/AdminSalonProvider';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { salonFor } from '@/lib/salon/admin-queries';
import { Specialists } from '@/views/admin/salon/Specialists';

export const metadata: Metadata = { title: 'Specialists | Admin' };

export default async function AdminSpecialistsPage() {
  return (
    <RequirePermission permission="salon.specialists">
      <AdminSalonProvider value={await salonFor('salon.specialists')}>
        <Specialists />
      </AdminSalonProvider>
    </RequirePermission>
  );
}
