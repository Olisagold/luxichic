import type { Metadata } from 'next';
import { AdminTeamProvider } from '@/components/admin/AdminTeamProvider';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { teamFor } from '@/lib/admins/admin-queries';
import { AdminUsers } from '@/views/admin/administration/AdminUsers';

export const metadata: Metadata = { title: 'Admin users — Admin' };

export default async function AdminUsersPage() {
  const data = await teamFor('admins.manage');
  return (
    <RequirePermission permission="admins.manage">
      {data && (
        <AdminTeamProvider value={data}>
          <AdminUsers />
        </AdminTeamProvider>
      )}
    </RequirePermission>
  );
}
