import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { dashboardFor, resolvePeriod } from '@/lib/analytics/admin-queries';
import { Dashboard } from '@/views/admin/Dashboard';

export const metadata: Metadata = { title: 'Dashboard — Admin' };

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const data = await dashboardFor(resolvePeriod(await searchParams));
  return <RequirePermission permission="dashboard.view">{data && <Dashboard data={data} />}</RequirePermission>;
}
