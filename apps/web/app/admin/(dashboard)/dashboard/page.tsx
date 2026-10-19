import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { adminNav } from '@/data/adminNav';
import { getAdmin, hasPermission } from '@/lib/auth/session';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { dashboardFor, resolvePeriod } from '@/lib/analytics/admin-queries';
import { Dashboard } from '@/views/admin/Dashboard';

export const metadata: Metadata = { title: 'Dashboard — Admin' };

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  // The admin home: an admin without the dashboard (e.g. a specialist) starts on their first page instead.
  const admin = await getAdmin();
  if (admin && !hasPermission(admin, 'dashboard.view')) {
    const first = adminNav.flatMap((g) => g.items).find((i) => i.permission && hasPermission(admin, i.permission));
    if (first) redirect(first.to);
  }
  const data = await dashboardFor(resolvePeriod(await searchParams));
  return <RequirePermission permission="dashboard.view">{data && <Dashboard data={data} />}</RequirePermission>;
}
