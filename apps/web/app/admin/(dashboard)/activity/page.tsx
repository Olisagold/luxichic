import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { ActivityLogs } from '@/views/admin/administration/ActivityLogs';

export const metadata: Metadata = { title: 'Activity log — Admin' };

export default function AdminActivityLogsPage() {
  return (
    <RequirePermission permission="logs.view">
      <ActivityLogs />
    </RequirePermission>);

}
