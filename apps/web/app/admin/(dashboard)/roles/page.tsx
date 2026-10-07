import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { Roles } from '@/views/admin/administration/Roles';

export const metadata: Metadata = { title: 'Roles — Admin' };

export default function AdminRolesPage() {
  return (
    <RequirePermission permission="admins.manage">
      <Roles />
    </RequirePermission>);

}
