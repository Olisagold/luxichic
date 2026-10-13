import type { Metadata } from 'next';
import { settingsFor } from '@/lib/settings/admin-queries';
import { AdminSettingsProvider } from '@/components/admin/AdminSettingsProvider';
import { SecuritySettings } from '@/views/admin/settings/SecuritySettings';

export const metadata: Metadata = { title: 'Security — Admin' };

export default async function AdminSecuritySettingsPage() {
  // Every admin can change their own password and see their sign-ins.
  const data = await settingsFor(null, { logins: true });
  return (
    data && (
      <AdminSettingsProvider value={data}>
        <SecuritySettings />
      </AdminSettingsProvider>
    )
  );
}
