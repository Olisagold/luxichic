import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { Analytics } from '@/views/admin/Analytics';

export const metadata: Metadata = { title: 'Analytics — Admin' };

export default function AdminAnalyticsPage() {
  return (
    <RequirePermission permission="analytics.view">
      <Analytics />
    </RequirePermission>);

}
