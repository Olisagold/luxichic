import type { Metadata } from 'next';
import { AdminTeamProvider } from '@/components/admin/AdminTeamProvider';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { teamFor } from '@/lib/admins/admin-queries';
import { ActivityLogs } from '@/views/admin/administration/ActivityLogs';

export const metadata: Metadata = { title: 'Activity log | Admin' };

export default async function AdminActivityLogsPage() {
  const data = await teamFor('logs.view', { activity: true });
  return (
    <RequirePermission permission="logs.view">
      {data && (
        <AdminTeamProvider value={data}>
          <ActivityLogs />
        </AdminTeamProvider>
      )}
    </RequirePermission>
  );
}
