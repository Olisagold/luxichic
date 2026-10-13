import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { analyticsFor, resolvePeriod } from '@/lib/analytics/admin-queries';
import { Analytics } from '@/views/admin/Analytics';

export const metadata: Metadata = { title: 'Analytics — Admin' };

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const data = await analyticsFor(resolvePeriod(await searchParams));
  return <RequirePermission permission="analytics.view">{data && <Analytics data={data} />}</RequirePermission>;
}
