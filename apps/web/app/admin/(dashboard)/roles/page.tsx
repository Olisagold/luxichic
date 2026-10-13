import type { Metadata } from 'next';
import { AdminTeamProvider } from '@/components/admin/AdminTeamProvider';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { teamFor } from '@/lib/admins/admin-queries';
import { Roles } from '@/views/admin/administration/Roles';

export const metadata: Metadata = { title: 'Roles — Admin' };

export default async function AdminRolesPage() {
  const data = await teamFor('admins.manage');
  return (
    <RequirePermission permission="admins.manage">
      {data && (
        <AdminTeamProvider value={data}>
          <Roles />
        </AdminTeamProvider>
      )}
    </RequirePermission>
  );
}
