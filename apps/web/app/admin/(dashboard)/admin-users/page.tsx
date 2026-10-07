import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { AdminUsers } from '@/views/admin/administration/AdminUsers';

export const metadata: Metadata = { title: 'Admin users — Admin' };

export default function AdminUsersPage() {
  return (
    <RequirePermission permission="admins.manage">
      <AdminUsers />
    </RequirePermission>);

}
