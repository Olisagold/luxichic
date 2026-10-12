import type { Metadata } from 'next';
import { AdminSettingsProvider } from '@/components/admin/AdminSettingsProvider';
import { settingsFor } from '@/lib/settings/admin-queries';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { EmailSettings } from '@/views/admin/operations/EmailSettings';

export const metadata: Metadata = { title: 'Email — Admin' };

export default async function AdminEmailSettingsPage() {
  const data = await settingsFor('settings.email');
  return (
    <RequirePermission permission="settings.email">
      {data && (
        <AdminSettingsProvider value={data}>
          <EmailSettings />
        </AdminSettingsProvider>
      )}
    </RequirePermission>
  );
}
