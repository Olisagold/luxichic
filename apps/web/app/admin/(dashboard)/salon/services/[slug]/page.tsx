import type { Metadata } from 'next';
import { AdminSalonProvider } from '@/components/admin/AdminSalonProvider';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { salonFor } from '@/lib/salon/admin-queries';
import { ServiceEditor } from '@/views/admin/salon/ServiceEditor';

export const metadata: Metadata = { title: 'Edit service — Admin' };

export default async function AdminServiceEditorPage() {
  return (
    <RequirePermission permission="salon.services">
      <AdminSalonProvider value={await salonFor('salon.services')}>
        <ServiceEditor />
      </AdminSalonProvider>
    </RequirePermission>
  );
}
