import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { settingsFor } from '@/lib/settings/admin-queries';
import { AdminSettingsProvider } from '@/components/admin/AdminSettingsProvider';
import { SocialSettings } from '@/views/admin/settings/SocialSettings';

export const metadata: Metadata = { title: 'Social links — Admin' };

export default async function AdminSocialSettingsPage() {
  const data = await settingsFor('settings.general');
  return (
    <RequirePermission permission="settings.general">
      {data && (
        <AdminSettingsProvider value={data}>
          <SocialSettings />
        </AdminSettingsProvider>
      )}
    </RequirePermission>
  );
}
