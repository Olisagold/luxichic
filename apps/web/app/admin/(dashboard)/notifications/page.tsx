import type { Metadata } from 'next';
import { AdminSettingsProvider } from '@/components/admin/AdminSettingsProvider';
import { settingsFor } from '@/lib/settings/admin-queries';
import { Notifications } from '@/views/admin/operations/Notifications';

export const metadata: Metadata = { title: 'Notifications — Admin' };

/** Every signed-in admin sees the team's notifications. */
export default async function AdminNotificationsPage() {
  const data = await settingsFor(null);
  return (
    data && (
      <AdminSettingsProvider value={data}>
        <Notifications />
      </AdminSettingsProvider>
    )
  );
}
