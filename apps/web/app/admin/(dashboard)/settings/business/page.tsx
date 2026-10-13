import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { settingsFor } from '@/lib/settings/admin-queries';
import { AdminSettingsProvider } from '@/components/admin/AdminSettingsProvider';
import { BusinessSettings } from '@/views/admin/settings/BusinessSettings';

export const metadata: Metadata = { title: 'Business settings — Admin' };

export default async function AdminBusinessSettingsPage() {
  const data = await settingsFor('settings.general');
  return (
    <RequirePermission permission="settings.general">
      {data && (
        <AdminSettingsProvider value={data}>
          <BusinessSettings mode="business" />
        </AdminSettingsProvider>
      )}
    </RequirePermission>
  );
}
