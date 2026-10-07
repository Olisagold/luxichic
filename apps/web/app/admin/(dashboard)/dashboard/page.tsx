import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { Dashboard } from '@/views/admin/Dashboard';

export const metadata: Metadata = { title: 'Dashboard — Admin' };

export default function AdminDashboardPage() {
  return (
    <RequirePermission permission="dashboard.view">
      <Dashboard />
    </RequirePermission>
  );
}
